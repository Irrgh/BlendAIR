import { Scene } from "./Scene";
import { WebGPU } from "./WebGPU";
import shader from "../../assets/shaders/main.wgsl";
import { MeshInstance } from "../entity/MeshInstance";
import { mat4 } from "gl-matrix";
import { TriangleMesh } from "./TriangleMesh";
import { Camera } from "../entity/Camera";

export enum ViewportRenderTypes {
    WIRE,
    SOLID,
    PREVIEW,
    FINAL
}




export class Viewport {



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
        this.canvasFormat = "bgra8unorm";
        this.context = <GPUCanvasContext>canvas.getContext("webgpu");
        this.context.configure({
            device: this.webgpu.device,
            format: this.canvasFormat
        });

        this.camera = new Camera();

    }


    /**
     * Redraws the scene
     */
    public render() {

        const commandEncoder = this.webgpu.device.createCommandEncoder(); // definitely needs to be recreated every render pass


        const renderPassDescriptor: GPURenderPassDescriptor = {     // description of the renderpass
            colorAttachments: [
                {
                    clearValue: { r: Math.random(), g: Math.random(), b: Math.random(), a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView(),
                },
            ],
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


        let PackedTransformArray: Float32Array = new Float32Array();


        meshInstanceTransforms.forEach((instanceTransforms: number[], mesh: TriangleMesh) => {

            const newIndexArray = new Uint32Array(packedIndexArray.length + mesh.elementBuffer.length)
            newIndexArray.set(packedIndexArray);
            newIndexArray.set(mesh.elementBuffer, packedIndexArray.length);
            packedIndexArray = newIndexArray;

            const newVertexArray = new Float32Array(packedVertexArray.length + mesh.vertexBuffer.length);
            newVertexArray.set(packedVertexArray);
            newVertexArray.set(mesh.vertexBuffer, packedVertexArray.length);
            packedVertexArray = newVertexArray;


            const newIndirectArray = new Uint32Array(indirectArray.length + 5);
            newIndirectArray.set(indirectArray);
            newIndirectArray.set([
                mesh.elementBuffer.length,      // face indices count
                instanceTransforms.length / 16,      // number of instances
                0, 0, 0
            ], indirectArray.length);
            indirectArray = newIndirectArray;

            const newTransformArray = new Float32Array(PackedTransformArray.length + instanceTransforms.length);
            newTransformArray.set(PackedTransformArray);
            newTransformArray.set(instanceTransforms, PackedTransformArray.length);
            PackedTransformArray = newTransformArray;

        });


        // creating buffers


        const vertexBuffer : GPUBuffer = this.webgpu.device.createBuffer({
            size: packedVertexArray.byteLength,          // each vertex is 8 f32
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
            label: "vertex-buffer"
        });

        const indexBuffer : GPUBuffer = this.webgpu.device.createBuffer({
            size: packedIndexArray.byteLength,            // each face is 3 int32
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
            label: "index-buffer"
        });

        const indirectBuffer : GPUBuffer = this.webgpu.device.createBuffer({
            size: indirectArray.byteLength,
            usage: GPUBufferUsage.INDIRECT,
            mappedAtCreation: true,
            label: "indirect-buffer"
        });

        const cameraDataBuffer : GPUBuffer = this.webgpu.device.createBuffer({
            size: 64 * 2,         // mat4x4 proj and view
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true,
            label: "cameraData-buffer"
        });

        const transformBuffer : GPUBuffer = this.webgpu.device.createBuffer({
            size: PackedTransformArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
            label: "transform-buffer"
        });


        // filling buffers

        this.webgpu.device.queue.writeBuffer(vertexBuffer, 0, packedVertexArray);     // vertex
        this.webgpu.device.queue.writeBuffer(indexBuffer, 0, packedIndexArray);       // index

        console.log("vertex: ", packedVertexArray);
        console.log("index: ", packedIndexArray);



        new Uint32Array(indirectBuffer.getMappedRange()).set(indirectArray, 0);  // indirect
        indirectBuffer.unmap();
        console.log("indirect: ", indirectArray);

        const cameraDataBufferMap: Float32Array = new Float32Array(cameraDataBuffer.getMappedRange());     // cameraData
        cameraDataBufferMap.set(this.camera.getViewMatrix());
        cameraDataBufferMap.set(this.camera.getProjectionMatrix(), 16);      // offset of one mat4x4
        cameraDataBuffer.unmap();

        console.log("view: ", this.camera.getViewMatrix());
        console.log("proj: ", this.camera.getProjectionMatrix());



        this.webgpu.device.queue.writeBuffer(transformBuffer, 0, PackedTransformArray);   // transforms

        console.log("transformations: ", PackedTransformArray);




        // creating bindgroup

        const bindGroupLayout : GPUBindGroupLayout = this.webgpu.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" }
                }
            ]
        });

        const bindGroup : GPUBindGroup = this.webgpu.device.createBindGroup({
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

        const vertexBufferLayout : GPUVertexBufferLayout = {
            arrayStride: 32,
            attributes: TriangleMesh.attributes,
            stepMode: "vertex"
        }


        const pipeLineLayout: GPUPipelineLayout = this.webgpu.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        const shaderModule : GPUShaderModule = this.webgpu.device.createShaderModule({
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
            layout: pipeLineLayout
        };

        const pipeline = this.webgpu.device.createRenderPipeline(pipelineDescriptor);


        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

        renderPass.setPipeline(pipeline)
        renderPass.setBindGroup(0,bindGroup);
        renderPass.setVertexBuffer(0,vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer,"uint32");
        renderPass.drawIndexedIndirect(indirectBuffer,0);



        renderPass.end();


        this.webgpu.device.queue.submit([commandEncoder.finish()])









    }







}