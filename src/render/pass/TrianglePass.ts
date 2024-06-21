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

/**
 * The TrianglePass takes all TriangleMeshes of the {@link Scene.entities | Scene's entities} and renders them using
 */
export class TrianglePass extends RenderPass {
    private drawParameters: Uint32Array = new Uint32Array();

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
                resource:"buffer"
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

        const transformArray : Float32Array = new Float32Array(scene.entities.size * 16);
        const instances : Map<TriangleMesh,{count:number,ids:number[]}> = new Map();

        scene.entities.forEach((object: Entity, name: String) => {

            if (!(object instanceof MeshInstance)) {
                return;
            }

            const mesh: TriangleMesh = object.mesh;
            const count = instances.get(mesh);

            transformArray.set(object.getWorldTransform(),scene.getId(object))

            if (!count) {
                vertexSize += mesh.vertexBuffer.length;
                indexSize += mesh.elementBuffer.length;
                instances.set(mesh,{count:1,ids:[scene.getId(object)]});
                return;
            }
            count.count++;

        });


        const vertexArray : Float32Array = new Float32Array(vertexSize);
        const indexArray : Uint32Array = new Uint32Array(indexSize);
        const idArray : Uint32List = new Uint32Array(scene.entities.size);
        const drawParameters : Uint32Array = new Uint32Array(instances.size*5);

        let vertexOffset = 0;
        let indexOffset = 0;
        let objectOffset = 0;


        instances.forEach((value : {count:number,ids:number[]}, mesh:TriangleMesh) => {

            vertexArray.set(mesh.vertexBuffer,vertexOffset);
            indexArray.set(mesh.elementBuffer,indexOffset);
            idArray.set(value.ids,objectOffset);
            drawParameters.set([
                mesh.vertexBuffer.length,   // index count
                value.count,                // instance count
                indexOffset,                // first index
                0,                          // base vertex
                objectOffset                // first instance
            ]);
            vertexOffset += mesh.vertexBuffer.length;
            indexOffset += mesh.elementBuffer.length;
            objectOffset += value.count;

        });

        const min = WebGPU.minBuffersize;


        
        const vertexBuffer = this.renderer.createBuffer({
            size: Math.max(vertexArray.byteLength,min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
        },"vertex");
        
        const indexBuffer = this.renderer.createBuffer({
            size: Math.max(indexArray.byteLength, min),
            usage:GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
        },"index");
        
        const transformBuffer = this.renderer.createBuffer({
            size: Math.max(transformArray.byteLength,min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        },"transform");

        const objectIndexBuffer = this.renderer.createBuffer({
            size: Math.max(idArray.byteLength,min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        },"object-index");        


        const device = App.getRenderDevice();
        

        device.queue.writeBuffer(vertexBuffer, 0, vertexArray);
        device.queue.writeBuffer(indexBuffer, 0, indexArray);
        device.queue.writeBuffer(transformBuffer, 0, drawParameters);
        device.queue.writeBuffer(objectIndexBuffer,0,idArray);
        this.drawParameters = drawParameters;
    }




    public render(viewport: Viewport): void {

        const device: GPUDevice = App.getRenderDevice();

        const colorTexture = this.renderer.getTexture("color");
        const depthTexture = this.renderer.getTexture("depth");
        const objectIndexTexture = this.renderer.getTexture("object-index");
        const normalTexture = this.renderer.getTexture("normal");

        const objectIndexBuffer = this.renderer.getBuffer("object-index");
        const cameraUniformBuffer = this.renderer.getBuffer("camera");
        const vertexBuffer = this.renderer.getBuffer("vertex");
        const indexBuffer = this.renderer.getBuffer("buffer");
        const transformBuffer = this.renderer.getBuffer("transform");



        /** @todo TRANSFORM Buffer please */


        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type:"uniform"      // camera
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"   // transform
                    }
                }, {
                    binding:1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]
        });

        const bindgroup: GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: cameraUniformBuffer }
                },
            ]
        })










    }


}