import { mat4, vec2, vec3 } from 'gl-matrix';
import { MeshInstance } from '../entity/MeshInstance';
import { Scene } from './Scene';
import { Instance, TLAS } from './TLAS';
import { TMIBvh } from './TMIBvh';
import { App } from '../app';
import { Viewport } from './Viewport';
import shader from "../../assets/shaders/bvh.wgsl";

type Offset = {
    nodeOffset: number,
    indexOffset: number,
    vertexOffset: number,
}

// 48 bytes
export type Ray = {
    origin: vec3,
    dir: vec3,
    inv_dir: vec3,
}

// 48 bytes
export type RayHitInfo = {
    worldPos: vec3,
    length: number,
    normal: vec3,
    objectId: number,
    uv: vec2
}

export class Acceleration {

    private scene: Scene;
    private tlas!: TLAS;
    private blas: Map<string, TMIBvh> = new Map();

    private offsetMap: Map<string, Offset> = new Map();

    private vertexBuffer!: GPUBuffer;
    private normalBuffer!: GPUBuffer;
    private uvBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private nodeBuffer!: GPUBuffer;

    private tlasInstanceBuffer!: GPUBuffer;
    private tlasNodesBuffer!: GPUBuffer;

    private bindgroupLayout: GPUBindGroupLayout;
    private pipeline: GPUComputePipeline;


    constructor(scene: Scene, ) {
        this.scene = scene;
        
        const device = App.getRenderDevice();

        this.bindgroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage"
                    }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 8,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 9,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });

        const layout = device.createPipelineLayout({
            bindGroupLayouts: [this.bindgroupLayout]
        });

        const shaderModule = device.createShaderModule({
            code: shader
        });

        this.pipeline = device.createComputePipeline({
            compute: {
                module: shaderModule,
                entryPoint: "intersection"
            },
            layout: layout
        });
    }

    public update() {

        const instances: Instance[] = [];
        let dirty: boolean = false;

        this.scene.entities.forEach(entity => {
            if (!(entity instanceof MeshInstance)) return;

            const meshInstance: MeshInstance = <MeshInstance>entity;

            let bvh = this.blas.get(meshInstance.mesh.id);

            if (!bvh) {
                bvh = new TMIBvh(meshInstance.mesh);
                this.blas.set(meshInstance.mesh.id, bvh);
                dirty = true;
            }

            const transform = meshInstance.getWorldTransform();
            const position = meshInstance.getPosition();
            const invTransform = mat4.invert(mat4.create(), transform)!;

            const root = bvh.nodes[0];

            const worldMin = vec3.create();
            const worldMax = vec3.create();
            this.transformAABB(root.min, root.max, transform, worldMin, worldMax);

            const center = vec3.create();
            vec3.add(center, worldMin, worldMax);
            vec3.scale(center, center, 0.5);

            instances.push({
                name: meshInstance.mesh.id,
                transform,
                invTransform,
                boundsMin: worldMin,
                boundsMax: worldMax,
                center
            });
        });

        if (dirty) {
            this.uploadBLASBuffers();
        }

        const instanceArray = new Float32Array(36 * instances.length);
        const instanceDataView = new DataView(instanceArray.buffer);

        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            const base = i * 144;

            const offset = this.offsetMap.get(instance.name)!;

            instanceDataView.setUint32(base + 0, offset.nodeOffset);
            instanceDataView.setUint32(base + 4, offset.indexOffset);
            instanceDataView.setUint32(base + 8, offset.vertexOffset);

            instanceArray.set(instance.transform, (base/4) + 4);
            instanceArray.set(instance.invTransform, (base/4) + 20);
        }

        const device = App.getRenderDevice();
        const instanceBuffer = device.createBuffer({
            size: Math.max(instanceArray.byteLength, 32),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(instanceBuffer, 0, instanceArray);
        this.tlasInstanceBuffer = instanceBuffer;


        this.tlas = new TLAS(instances);
        this.tlasNodesBuffer = this.tlas.nodeBuffer;
    }

    private transformAABB(min: vec3, max: vec3, m: mat4, outMin: vec3, outMax: vec3) {
        const corners = [
            [min[0], min[1], min[2]],
            [max[0], min[1], min[2]],
            [min[0], max[1], min[2]],
            [max[0], max[1], min[2]],
            [min[0], min[1], max[2]],
            [max[0], min[1], max[2]],
            [min[0], max[1], max[2]],
            [max[0], max[1], max[2]],
        ];

        vec3.set(outMin, 1e30, 1e30, 1e30);
        vec3.set(outMax, -1e30, -1e30, -1e30);

        for (const c of corners) {
            const v = vec3.transformMat4(vec3.create(), c as vec3, m);
            vec3.min(outMin, outMin, v);
            vec3.max(outMax, outMax, v);
        }
    }

    private uploadBLASBuffers() {
        const device = App.getRenderDevice();

        let vertexCount = 0;
        let normalCount = 0;
        let uvCount = 0;
        let trisCount = 0;
        let nodeCount = 0;

        const blasList = Array.from(this.blas.values());

        for (const bvh of blasList) {
            vertexCount += bvh.vertices.length / 3;
            normalCount += bvh.normals.length / 3;
            uvCount += bvh.vertices.length / 2;
            trisCount += bvh.tris.length;
            nodeCount += bvh.nodes_used;
        }

        const vertexArray = new Float32Array(vertexCount * 4); // 4 bytes padding
        const normalArray = new Float32Array(normalCount * 4); // 4 bytes padding
        const uvArray = new Float32Array(uvCount * 2);         // no padding
        const indexArray = new Uint32Array(trisCount * 4);     // 4 bytes padding

        const nodeArray = new Uint8Array(nodeCount * 32);
        const nodeDataView = new DataView(nodeArray.buffer);

        let vertexOffset = 0;
        let normalOffset = 0;
        let uvOffset = 0;

        let indexOffset = 0;
        let nodeOffset = 0;

        const offsetMap = new Map<string, Offset>();


        for (const [name, bvh] of this.blas) {

            const startVertexOffset = vertexOffset;
            const startIndexOffset = indexOffset;
            const startNodeOffset = nodeOffset;

            // Copy vertices (3 floats + 1 padding)
            const vCount = bvh.vertices.length / 3;
            for (let i = 0; i < vCount; i++) {
                const srcOffset = i * 3;
                const dstOffset = vertexOffset + i * 4;

                vertexArray[dstOffset + 0] = bvh.vertices[srcOffset + 0];
                vertexArray[dstOffset + 1] = bvh.vertices[srcOffset + 1];
                vertexArray[dstOffset + 2] = bvh.vertices[srcOffset + 2];
                vertexArray[dstOffset + 3] = 0; // padding
            }
            vertexOffset += vCount * 4;

            // Copy normals (3 floats + 1 padding)
            const nCount = bvh.normals.length / 3;
            for (let i = 0; i < nCount; i++) {
                const srcOffset = i * 3;
                const dstOffset = normalOffset + i * 4;

                normalArray[dstOffset + 0] = bvh.normals[srcOffset + 0];
                normalArray[dstOffset + 1] = bvh.normals[srcOffset + 1];
                normalArray[dstOffset + 2] = bvh.normals[srcOffset + 2];
                normalArray[dstOffset + 3] = 0; // padding
            }
            normalOffset += nCount * 4;

            // Copy UVs (no padding)
            uvArray.set(bvh.uvs, uvOffset);
            uvOffset += bvh.uvs.length;

            // Copy tris (3 uints + 1 padding)
            const tCount = bvh.tris.length;
            for (let i = 0; i < tCount; i++) {
                const srcOffset = i * 3;
                const dstOffset = indexOffset + i * 4;

                indexArray[dstOffset + 0] = bvh.tris[i].indices[0];
                indexArray[dstOffset + 1] = bvh.tris[i].indices[1];
                indexArray[dstOffset + 2] = bvh.tris[i].indices[2];
                indexArray[dstOffset + 3] = 0; // padding
            }
            indexOffset += tCount * 4;

            for (let i = 0; i < bvh.nodes_used; i++) {
                const node = bvh.nodes[i];

                const base = nodeOffset + i * 8;

                nodeDataView.setFloat32(base + 0, node.min[0]);
                nodeDataView.setFloat32(base + 4, node.min[1]);
                nodeDataView.setFloat32(base + 8, node.min[2]);
                nodeDataView.setUint32(base + 12, node.first_pc);
                nodeDataView.setFloat32(base + 16, node.max[0]);
                nodeDataView.setFloat32(base + 20, node.max[1]);
                nodeDataView.setFloat32(base + 24, node.max[2]);
                nodeDataView.setUint32(base + 28, node.prim_count);
            }
            nodeOffset += bvh.nodes_used * 32;

            offsetMap.set(name, {
                vertexOffset: startVertexOffset,
                indexOffset: startIndexOffset,
                nodeOffset: startNodeOffset
            });
        }

        this.offsetMap = offsetMap;

        const min = 32

        const vertexBuffer = device.createBuffer({
            size: Math.max(vertexArray.byteLength, min),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const normalBuffer = device.createBuffer({
            size: Math.max(normalArray.byteLength, min),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const uvBuffer = device.createBuffer({
            size: Math.max(uvArray.byteLength, min),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const indexBuffer = device.createBuffer({
            size: Math.max(indexArray.byteLength, min),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const nodeBuffer = device.createBuffer({
            size: Math.max(nodeArray.byteLength, min),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        })


        device.queue.writeBuffer(vertexBuffer, 0, vertexArray.buffer);
        device.queue.writeBuffer(normalBuffer, 0, normalArray.buffer);
        device.queue.writeBuffer(uvBuffer, 0, uvArray.buffer);
        device.queue.writeBuffer(indexBuffer, 0, indexArray.buffer);
        device.queue.writeBuffer(nodeBuffer, 0, nodeArray);

        this.vertexBuffer = vertexBuffer;
        this.normalBuffer = normalBuffer;
        this.uvBuffer = uvBuffer;
        this.indexBuffer = indexBuffer;
        this.nodeBuffer = nodeBuffer;

        console.log('BLAS buffers uploaded:', vertexArray.length, normalArray.length, uvArray.length, indexArray.length);
    }

    public async intersect(rays: Ray[]): Promise<RayHitInfo[]> {

        const device = App.getRenderDevice();

        const inputArray = new Float32Array(rays.length * 12);
        const outputArray = new Float32Array(rays.length * 12);

        for (let i = 0; i < rays.length; i++) {
            const ray = rays[i];
            const base = i * 12;

            inputArray.set(ray.origin, base + 0);
            inputArray.set(ray.dir, base + 4);
            inputArray.set(ray.inv_dir, base + 8);
        }

        const inputBuffer = device.createBuffer({
            size: Math.max(inputArray.byteLength, 32),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        const outputBuffer = device.createBuffer({
            size: Math.max(outputArray.byteLength, 32),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        const mappingBuffer = device.createBuffer({
            size: Math.max(outputArray.byteLength, 32),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const offsetBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindgroup = device.createBindGroup({
            layout: this.bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: inputBuffer
                }, {
                    binding: 1,
                    resource: outputBuffer
                }, {
                    binding: 2,
                    resource: this.nodeBuffer
                }, {
                    binding: 3,
                    resource: this.indexBuffer
                }, {
                    binding: 4,
                    resource: this.vertexBuffer
                }, {
                    binding: 5,
                    resource: this.normalBuffer
                }, {
                    binding: 6,
                    resource: this.uvBuffer
                }, {
                    binding: 7,
                    resource: this.tlasNodesBuffer
                }, {
                    binding: 8,
                    resource: this.tlasInstanceBuffer
                }, {
                    binding: 9,
                    resource: offsetBuffer
                }
            ]
        })

        const enc = device.createCommandEncoder();
        const comp = enc.beginComputePass();

        comp.setPipeline(this.pipeline);
        comp.setBindGroup(0, bindgroup);

        let offset = 0;

        while (offset < rays.length) {
            device.queue.writeBuffer(offsetBuffer, 0, new ArrayBuffer(offset));

            comp.dispatchWorkgroups(1024);

            offset += 32 * 1024;
        }

        comp.end()
        enc.copyBufferToBuffer(outputBuffer, mappingBuffer);
        device.queue.submit([enc.finish()]);

        await mappingBuffer.mapAsync(GPUMapMode.READ);

        const arr = new Float32Array(mappingBuffer.getMappedRange());

        const hitInfos: RayHitInfo[] = new Array(rays.length);
        const view = new DataView(arr.buffer);


        for (let i = 0; i < hitInfos.length; i++) {

            const base = i * 12;

            let hitInfo: RayHitInfo = {
                worldPos: arr.slice(base + 0, base + 4),
                length: view.getFloat32((base + 3) * 4),
                normal: arr.slice(base + 4, base + 8),
                objectId: view.getUint32((base + 7) * 4),
                uv: arr.slice(base + 4, base + 6)
            };

            hitInfos[i] = hitInfo;
        }


        return hitInfos;
    }





} 