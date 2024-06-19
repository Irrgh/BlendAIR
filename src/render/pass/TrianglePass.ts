import { Renderer } from "../Renderer";
import { RenderPass } from "./RenderPass";
import { Scene } from "../../engine/Scene";
import { Viewport } from "../../engine/Viewport";
import { App } from "../../app";
import { TriangleMesh } from "../../engine/TriangleMesh";
import { MeshInstance } from "../../entity/MeshInstance";
import { Entity } from "../../entity/Entity";

/**
 * The TrianglePass takes all TriangleMeshes of the {@link Scene.entities | Scene's entities} and renders them using
 */
export class TrianglePass extends RenderPass {
    private drawParameters: Uint32Array;
    
    constructor() {

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

        super(input, output);
        this.drawParameters = new Uint32Array(5);

    }

    

    
    /**
     * Updates the mesh
     * @param viewport 
     */
    public updateMeshBuffer(viewport: Viewport): void {



        let objectCount = 0;
        let vertexSize = 0;
        let indexSize = 0;

        const vertexAccumulator: Float32Array[] = [];
        const indexAccumulator: Uint32Array[] = [];
        const transformAccumulator: number[] = [];
        const drawParameters: number[] = [];

        let visited = new Set<TriangleMesh>;

        viewport.scene.entities.forEach((object: Entity, name: String) => {

            if (!(object instanceof MeshInstance)) {
                return;
            }


            const mesh: TriangleMesh = object.mesh;

            if (!visited.has(mesh)) {

                visited.add(mesh);

                vertexAccumulator.push(mesh.vertexBuffer);
                indexAccumulator.push(mesh.elementBuffer.map((index) => { return vertexSize + index }));      // every mesh get a new "index space"

                drawParameters.push(
                    mesh.elementBuffer.length,          // index count
                    mesh.instancedBy.size,              // instance count
                    indexSize,                          // first index
                    0,                                  // base index
                    objectCount    // first instance
                );

                const instances: MeshInstance[] = Array.from(mesh.instancedBy);


                instances.forEach((entity: MeshInstance) => {
                    transformAccumulator.push(...entity.getWorldTransform());
                })

                objectCount += mesh.instancedBy.size;
                vertexSize += mesh.vertexBuffer.length / 8;
                indexSize += mesh.elementBuffer.length;


            }
        });


        
        const renderer : Renderer = viewport.getRenderer();

        renderer.destroyBuffer("vertex");

        const vertexBuffer = renderer.createBuffer({
            size: vertexSize * 4 * 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
            label: "vertex"
        },"vertex",this.updateMeshBuffer);


        renderer.destroyBuffer("index");

        const indexBuffer = renderer.createBuffer({
            size: indexSize * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
            label: "index"
        },"index",this.updateMeshBuffer);


        renderer.destroyBuffer("transform");

        const transformBuffer = renderer.createBuffer({
            size: transformAccumulator.length * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
            label: "transform"
        },"transform",this.updateMeshBuffer);

        const vertexArray = new Float32Array(vertexSize * 8);     // eight floats per vertex

        vertexAccumulator.reduce((offset: number, current: Float32Array) => {
            vertexArray.set(current, offset);
            return offset + current.length;
        }, 0);



        const indexArray = new Uint32Array(indexSize);

        indexAccumulator.reduce((offset: number, current: Uint32Array) => {
            indexArray.set(current, offset);
            return offset + current.length;
        }, 0);


        //console.log("vertex:", vertexArray);
        //console.log("index:", indexArray);
        //console.log("transform: ", transformAccumulator);



        const device : GPUDevice = App.getRenderDevice();

        device.queue.writeBuffer(vertexBuffer, 0, vertexArray);
        device.queue.writeBuffer(indexBuffer, 0, indexArray);
        device.queue.writeBuffer(transformBuffer, 0, new Float32Array(transformAccumulator));
        this.drawParameters = new Uint32Array(drawParameters);








    }








    public render(renderer: Renderer, viewport: Viewport): void {

        const device: GPUDevice = App.getRenderDevice();

        const colorTexture = renderer.getTexture("color");
        const depthTexture = renderer.getTexture("depth");
        const objectIndexTexture = renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "r8uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label: "object-index"
        }, "object-index");


        const normalTexture = renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label: "normal"
        }, "normal");

        const cameraUniformBuffer : GPUBuffer = renderer.getBuffer("camera").buffer;



        /** @todo TRANSFORM Buffer please */


        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: {}
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type:"read-only-storage"
                    }
                }
            ]
        });

        const bindgroup : GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding:0,
                    resource: {buffer: cameraUniformBuffer}
                }, 
            ]
        })










    }


}