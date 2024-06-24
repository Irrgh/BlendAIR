import { Renderer } from "../Renderer";
import { RenderPass } from "./RenderPass";
import { Scene } from "../../engine/Scene";
import { Viewport } from '../../engine/Viewport';
import { App } from "../../app";
import { TriangleMesh } from "../../engine/TriangleMesh";
import { MeshInstance } from "../../entity/MeshInstance";
import { Entity } from "../../entity/Entity";
import { Util } from '../../util/Util';
import { WebGPU } from "../../engine/WebGPU";
import shader from "../../../assets/shaders/main.wgsl";

/**
 * The TrianglePass takes all TriangleMeshes of the {@link Scene.entities | Scene's entities} and renders them using
 */
export class TrianglePass extends RenderPass {
    private drawParameters: Uint32Array = new Uint32Array();

    private multisampleCount = 4;

    private vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 32,
        attributes: TriangleMesh.attributes,
        stepMode: "vertex"
    }

    private depthStencilState: GPUDepthStencilState = {
        format: "depth24plus-stencil8",
        depthWriteEnabled: true, // Enable writing to the depth buffer
        depthCompare: "less", // Enable depth testing with "less" comparison
    };







    constructor(renderer: Renderer) {

        const input: PassResource[] = [
            {
                label: "camera",
                resource: "buffer"
            }, {
                label: "vertex",
                resource: "buffer"
            }, {
                label: "index",
                resource: "buffer"
            }, {
                label: "transform",
                resource: "buffer"
            }, {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "buffer"
            }
        ]

        const output: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
                resource: "texture"
            }, {
                label: "normal",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "texture"
            }
        ]

        super(renderer, input, output);

        this.renderer.createBuffer({
            size: 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
        }, "vertex", { modified: true, update: this.createMeshBuffer });

        this.renderer.createBuffer({
            size: 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
        }, "index", { modified: true, update: this.createMeshBuffer });

        this.renderer.createBuffer({
            size: 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        }, "transform", { modified: true, update: this.createMeshBuffer });


    }


    /**
     * Updates the mesh
     * @param viewport 
     */
    private createMeshBuffer(viewport: Viewport): void {

        const scene = viewport.scene;


        let vertexSize = 0;
        let indexSize = 0;

        const transformArray: Float32Array = new Float32Array(scene.entities.size * 16);
        const instances: Map<TriangleMesh, { count: number, ids: number[] }> = new Map();

        scene.entities.forEach((object: Entity, name: String) => {

            if (!(object instanceof MeshInstance)) {
                return;
            }

            const mesh: TriangleMesh = object.mesh;
            const instance = instances.get(mesh);
            const id = scene.getId(object);

            transformArray.set(object.getWorldTransform(), (id*16));

            if (!instance) {
                vertexSize += mesh.vertexBuffer.length;
                indexSize += mesh.elementBuffer.length;
                instances.set(mesh, { count: 1, ids: [id+1] });
                return;
            }
            instance.count++;
            instance.ids.push(id);


        });


        const vertexArray: Float32Array = new Float32Array(vertexSize);
        const indexArray: Uint32Array = new Uint32Array(indexSize);
        const idArray: Uint32List = new Uint32Array(scene.entities.size);
        const drawParameters: Uint32Array = new Uint32Array(instances.size * 5);

        let vertexOffset = 0;
        let indexOffset = 0;
        let objectOffset = 0;
        let index = 0;

        instances.forEach((value: { count: number, ids: number[] }, mesh: TriangleMesh) => {

            vertexArray.set(mesh.vertexBuffer, vertexOffset);
            indexArray.set(mesh.elementBuffer.map((index) => { return index + vertexOffset / 8 }), indexOffset);
            idArray.set(value.ids, objectOffset);
            drawParameters.set([
                mesh.elementBuffer.length,   // index count
                value.count,                // instance count
                indexOffset,                // first index
                0,                          // base vertex
                objectOffset                // first instance
            ], index * 5);
            vertexOffset += mesh.vertexBuffer.length;
            indexOffset += mesh.elementBuffer.length;
            objectOffset += value.count;
            index++;

        });

        const min = WebGPU.minBuffersize;



        const vertexBuffer = this.renderer.createBuffer({
            size: Math.max(vertexArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
        }, "vertex");

        const indexBuffer = this.renderer.createBuffer({
            size: Math.max(indexArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
        }, "index");

        const transformBuffer = this.renderer.createBuffer({
            size: Math.max(transformArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        }, "transform");

        const objectIndexBuffer = this.renderer.createBuffer({
            size: Math.max(idArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        }, "object-index");


        const device = App.getRenderDevice();


        device.queue.writeBuffer(vertexBuffer, 0, vertexArray);
        device.queue.writeBuffer(indexBuffer, 0, indexArray);
        device.queue.writeBuffer(transformBuffer, 0, transformArray);
        device.queue.writeBuffer(objectIndexBuffer, 0, idArray);
        this.drawParameters = drawParameters;


        //console.log("vertex: ",vertexArray);
        //console.log("index: ", indexArray);
        //console.log("transform: ", transformArray);




    }




    public render(viewport: Viewport): void {

        console.time("mesh creation")

        this.createMeshBuffer(viewport);
        
        console.timeEnd("mesh creation")

        const device: GPUDevice = App.getRenderDevice();

        const colorTexture = this.renderer.getTexture("color");
        const depthTexture = this.renderer.getTexture("depth");
        const objectIndexTexture = this.renderer.getTexture("object-index");
        const normalTexture = this.renderer.getTexture("normal");

        const objectIndexBuffer = this.renderer.getBuffer("object-index");
        const cameraUniformBuffer = this.renderer.getBuffer("camera");
        const vertexBuffer = this.renderer.getBuffer("vertex");
        const indexBuffer = this.renderer.getBuffer("index");
        const transformBuffer = this.renderer.getBuffer("transform");

        const multisampledColorTexture = device.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.multisampleCount,
            label: "multisample-color"
        });

        const multisampledDepthTexture = device.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.multisampleCount,
            label: "multisample-depth"
        });

        const multisampledNormalTexture = device.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.multisampleCount,
            label: "multisample-normal"
        });

        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"      // camera
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"   // transform
                    }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"   // object index
                    }
                }
            ]
        });

        const bindgroup: GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: cameraUniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: transformBuffer }
                }, {
                    binding: 2,
                    resource: { buffer: objectIndexBuffer }
                }
            ]
        })


        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: multisampledColorTexture.createView(),
                    resolveTarget: colorTexture.createView()
                }, {
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: multisampledNormalTexture.createView(),
                    resolveTarget: normalTexture.createView()
                },
            ],
            depthStencilAttachment: {
                view: multisampledDepthTexture.createView(),
                depthLoadOp: "clear",
                depthStoreOp: "store",
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
                depthClearValue: 1.0,
                stencilClearValue: 1.0
            },
            label: "triangle pass"
        }


        const shaderModule = device.createShaderModule({
            code: shader
        })


        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        });


        const renderPipeline: GPURenderPipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [this.vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: "rgba8unorm",
                    }, {
                        format: "rgba8unorm"
                    }
                ],
            },
            primitive: {
                topology: "triangle-list",
                stripIndexFormat: undefined
            },
            layout: pipelineLayout,
            depthStencil: this.depthStencilState,
            multisample: {
                count: 4
            },
            label: "triangle mesh rendering"
        });

        
        App.getWebGPU().attachTimestamps(renderPassDescriptor);

        const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();

        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);



        renderPass.pushDebugGroup("rendering triangles");
        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, bindgroup);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, "uint32");


        console.log("drawParameters: ", this.drawParameters);


        for (let i = 0; i < this.drawParameters.length; i += 5) {

            renderPass.drawIndexed(
                this.drawParameters[i],
                this.drawParameters[i + 1],
                this.drawParameters[i + 2],
                this.drawParameters[i + 3],
                this.drawParameters[i + 4]
            );
        }

        renderPass.popDebugGroup();
        renderPass.end()


        const objectIndexPassDescriptor : GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    storeOp:"store",
                    loadOp:"clear",
                    view: objectIndexTexture.createView()
                }
            ], 
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: "clear",
                depthStoreOp: "store",
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
                depthClearValue: 1.0,
                stencilClearValue: 1.0
            },
            label:"pain"
        }


        const objectIndexPipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [this.vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_object",
                targets: [
                    {
                        format: "r32uint",
                    }
                ],
            },
            primitive: {
                topology: "triangle-list",
                stripIndexFormat: undefined
            },
            layout: pipelineLayout,
            depthStencil: this.depthStencilState,
            label: "triangle index rendering"
        })

        App.getWebGPU().attachTimestamps(objectIndexPassDescriptor);

        const objectIndexRenderPass = commandEncoder.beginRenderPass(objectIndexPassDescriptor);


        objectIndexRenderPass.setPipeline(objectIndexPipeline);
        objectIndexRenderPass.setBindGroup(0, bindgroup);
        objectIndexRenderPass.setVertexBuffer(0, vertexBuffer);
        objectIndexRenderPass.setIndexBuffer(indexBuffer, "uint32");

        for (let i = 0; i < this.drawParameters.length; i += 5) {

            objectIndexRenderPass.drawIndexed(
                this.drawParameters[i],
                this.drawParameters[i + 1],
                this.drawParameters[i + 2],
                this.drawParameters[i + 3],
                this.drawParameters[i + 4]
            );
        }

        
        objectIndexRenderPass.end()




        App.getWebGPU().prepareTimestampsResolution(objectIndexPassDescriptor,commandEncoder);

        App.getWebGPU().prepareTimestampsResolution(renderPassDescriptor,commandEncoder);

        device.queue.submit([commandEncoder.finish()]);

        App.getWebGPU().resolveTimestamp(renderPassDescriptor).then(result => {
            console.log(`Rendering took ${result/1000} µs`);
        }).catch(error => {
            console.error('Failed to resolve timestamps:', error);
        });

        App.getWebGPU().resolveTimestamp(objectIndexPassDescriptor).then(result => {
            console.log(`index drawing took ${result/1000} µs`);
        }).catch(error => {
            console.error('Failed to resolve timestamps:', error);
        });




        multisampledColorTexture.destroy();
        multisampledDepthTexture.destroy();
        multisampledNormalTexture.destroy();

    }


}