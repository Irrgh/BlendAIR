import { Scene } from "./Scene";
import { WebGPU } from "./WebGPU";
import shader from "../../assets/shaders/main.wgsl";
import { MeshInstance } from "../entity/MeshInstance";
import { mat4 } from "gl-matrix";
import { TriangleMesh } from "./TriangleMesh";
import { Camera } from "../entity/Camera";
import { Resizable } from "../gui/Resizable";

export enum ViewportRenderTypes {
    WIRE,
    SOLID,
    PREVIEW,
    FINAL
}




export class Viewport implements Resizable {



    /**
     * Handle to WebGPU capabilities
     */
    webgpu: WebGPU

    /**
     * Rendering Canvas 
     */
    canvas: HTMLCanvasElement

    canvasFormat: GPUTextureFormat;

    context: GPUCanvasContext;


    /**
     * Scene to render
     */
    scene: Scene

    camera: Camera;







    


    constructor(webgpu: WebGPU, canvas: HTMLCanvasElement, scene: Scene) {
        this.webgpu = webgpu;
        this.canvas = canvas;
        this.scene = scene;
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context = <GPUCanvasContext>canvas.getContext("webgpu");
        this.context.configure({
            device: this.webgpu.getDevice(),
            format: this.canvasFormat
        });

        this.camera = new Camera();

    }


    resize(width: number, height: number): void {
        throw new Error("Method not implemented.");
        // should probably resize all render related textures like depth, albedo, normal, uv and then redraw
    }
    
    allowResize(): boolean {
        throw new Error("Method not implemented.");
    }


    /**
     * Redraws the scene
     */
    public async render() {

        const depthStencilFormat: GPUTextureFormat = "depth24plus-stencil8"

        const depthStencilState: GPUDepthStencilState = {
            format: depthStencilFormat,
            depthWriteEnabled: true, // Enable writing to the depth buffer
            depthCompare: "less" // Enable depth testing with "less" comparison
        };

        const depthStencilTexture = this.webgpu.createTexture({
            size: {
                width: this.canvas.width,
                height: this.canvas.height,
                depthOrArrayLayers: 1
            },
            format: depthStencilFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            label:"depthStencil-texture"
        },"depthStencil-texture");

        const depthStencilView = depthStencilTexture.createView();



        const commandEncoder = this.webgpu.getDevice().createCommandEncoder({

        }); // definitely needs to be recreated every render pass


        const renderPassDescriptor: GPURenderPassDescriptor = {     // description of the renderpass
            colorAttachments: [
                {
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView({ label: "canvasTexture" }),
                },
            ],
            depthStencilAttachment: {
                view: depthStencilView,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
                depthClearValue: 1.0,
                stencilClearValue: 1.0
            }
        };


        // Retrieve Vertex data from Scene



        const meshInstanceTransforms = new Map<TriangleMesh, number[]>();        // retrieves all worldTransForm from the entities 
        /** @todo all of this needs to be implemented for Rendering of all {@link Entity} instead of only {@link MeshInstance} */
        this.scene.entities.forEach((entity: MeshInstance, key: String) => {

            const transforms = meshInstanceTransforms.get(entity.mesh);
            if (transforms) {
                transforms.push(...entity.getWorldTransform());
            } else {
                meshInstanceTransforms.set(entity.mesh, [...entity.getWorldTransform()]);
            }

        });

        /**
         * Contains all indices describing triangle faces.
         * Will be converted into a GPUBuffer after being filled.
         */
        let packedIndexArray: Uint32Array = new Uint32Array();

        /**
         * Contains all vertices necessary for rendering.
         * Will be converted in a GPUBuffer after being filled.
         */
        let packedVertexArray: Float32Array = new Float32Array();

        /**
         * Describes how the different mesh are drawn:
         * uint32[0] = 3; // The indexCount value
         * uint32[1] = 1; // The instanceCount value
         * uint32[2] = 0; // The firstIndex value
         * uint32[3] = 0; // The baseVertex value
         * uint32[4] = 0; // The firstInstance value
         */
        let indirectArray: Uint32Array = new Uint32Array();


        let packedTransformArray: Float32Array = new Float32Array();

        let indexOffset = 0;
        let vertexCount = 0;

        meshInstanceTransforms.forEach((instanceTransforms: number[], mesh: TriangleMesh) => {

            console.log(indexOffset);


            const newIndexArray = new Uint32Array(packedIndexArray.length + mesh.elementBuffer.length)
            newIndexArray.set(packedIndexArray);
            newIndexArray.set(mesh.elementBuffer.map((index: number) => { return index + vertexCount }), packedIndexArray.length);
            packedIndexArray = newIndexArray;

            const newVertexArray = new Float32Array(packedVertexArray.length + mesh.vertexBuffer.length);
            newVertexArray.set(packedVertexArray);
            newVertexArray.set(mesh.vertexBuffer, packedVertexArray.length);
            packedVertexArray = newVertexArray;
            vertexCount += mesh.vertexBuffer.length / 8;


            const newIndirectArray = new Uint32Array(indirectArray.length + 5);
            newIndirectArray.set(indirectArray);
            newIndirectArray.set([
                mesh.elementBuffer.length,      // face indices count
                instanceTransforms.length / 16,      // number of instances
                indexOffset, 0, packedTransformArray.length / 16
            ], indirectArray.length);
            indirectArray = newIndirectArray;
            indexOffset += mesh.elementBuffer.length;

            const newTransformArray = new Float32Array(packedTransformArray.length + instanceTransforms.length);
            newTransformArray.set(packedTransformArray);
            newTransformArray.set(instanceTransforms, packedTransformArray.length);
            packedTransformArray = newTransformArray;

        });


        // creating buffers


        const vertexBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: packedVertexArray.byteLength,          // each vertex is 8 f32
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
            label: "vertex-buffer"
        },"vertex-buffer");

        const indexBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: packedIndexArray.byteLength,            // each face is 3 int32
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
            label: "index-buffer"
        },"index-buffer");

        const cameraDataBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: 64 * 2,         // mat4x4 proj and view
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true,
            label: "cameraData-buffer"
        },"cameraData-buffer");

        const transformBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: packedTransformArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
            label: "transform-buffer"
        },"transform-buffer");




        // filling buffers

        this.webgpu.getDevice().queue.writeBuffer(vertexBuffer, 0, packedVertexArray);     // vertex
        this.webgpu.getDevice().queue.writeBuffer(indexBuffer, 0, packedIndexArray);       // index

        
        const cameraDataBufferMap: Float32Array = new Float32Array(cameraDataBuffer.getMappedRange());     // cameraData
        cameraDataBufferMap.set(this.camera.getViewMatrix());
        cameraDataBufferMap.set(this.camera.getProjectionMatrix(), 16);      // offset of one mat4x4
        cameraDataBuffer.unmap();

        
        this.webgpu.getDevice().queue.writeBuffer(transformBuffer, 0, packedTransformArray);   // transforms





        // creating bindgroup

        const bindGroupLayout: GPUBindGroupLayout = this.webgpu.getDevice().createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                    }
                }
            ]
        });

        const bindGroup: GPUBindGroup = this.webgpu.getDevice().createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: cameraDataBuffer
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: transformBuffer
                    }
                } 
            ]
        });


        // setting up pipeline

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 32,
            attributes: TriangleMesh.attributes,
            stepMode: "vertex"
        }


        const pipeLineLayout: GPUPipelineLayout = this.webgpu.getDevice().createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        const shaderModule: GPUShaderModule = this.webgpu.getDevice().createShaderModule({
            code: shader
        });









        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: this.canvasFormat,
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: pipeLineLayout,
            depthStencil: depthStencilState
        };

        const pipeline = this.webgpu.getDevice().createRenderPipeline(pipelineDescriptor);


        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, "uint32");
        renderPass.setBindGroup(0, bindGroup);


        let transformOffset = 0
        console.log(indirectArray);

        for (let k = 0; k < indirectArray.length; k += 5) {

            console.log(transformOffset);
            //this.webgpu.getDevice().queue.writeBuffer(transformIndexUniform,0,new Uint32Array([transformOffset]));


            renderPass.drawIndexed(indirectArray[k], indirectArray[k + 1], indirectArray[k + 2], 0, indirectArray[k + 4]);

            transformOffset += indirectArray[k + 1];  // number of instances

        }

        renderPass.end();


        this.webgpu.getDevice().queue.submit([commandEncoder.finish()])

        indexBuffer.destroy();
        vertexBuffer.destroy();
        cameraDataBuffer.destroy();
        transformBuffer.destroy();
        depthStencilTexture.destroy();

    }







}