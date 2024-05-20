import { Scene } from "./Scene";
import { WebGPU } from "./WebGPU";
import shaderMain from "../../assets/shaders/main.wgsl";
import { MeshInstance } from "../entity/MeshInstance";
import { mat4 } from "gl-matrix";
import { TriangleMesh } from "./TriangleMesh";
import { Camera } from "../entity/Camera";
import { Resizable } from "../gui/Resizable";
import { Util } from "../util/Util";

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

    /**
     * {@link Camera} Object used for rendering.
     */
    camera: Camera;



    /**
     * Results of the last Render are stored here
     */
    renderResults!: RenderLayers

    depthStencilFormat: GPUTextureFormat = "depth24plus-stencil8";

    depthStencilState: GPUDepthStencilState = {
        format: this.depthStencilFormat,
        depthWriteEnabled: true, // Enable writing to the depth buffer
        depthCompare: "less" // Enable depth testing with "less" comparison
    };


    vertexBuffer!: GPUBuffer;
    indexBuffer!: GPUBuffer;
    transformBuffer!: GPUBuffer;
    cameradataUniform!: GPUBuffer;

    bindgroup!:GPUBindGroup;

    drawParameters!: Uint32Array;
    pipeLineLayout!: GPUPipelineLayout;




    width: number;
    height: number;
    



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

        this.width = canvas.width;
        this.height = canvas.height;
        const aspect = this.width / this.height;

        this.camera = new Camera();
        this.camera.setPerspectiveProjection(Util.degreeToRadians(90), aspect, 0.1, 100);

        this.createRenderResults();
        this.createMeshBuffers();

        this.createBindgroup();
    }


    resize(width: number, height: number): void {
        throw new Error("Method not implemented.");






        // should probably resize all render related textures like depth, albedo, normal, uv and then redraw
    }

    allowResize(): boolean {
        throw new Error("Method not implemented.");
    }




    /**
     * Creates new textures for the {@link renderResults} according to the {@link width} and {@link height} of ``this`` {@link Viewport}.
     * Destroys all the old textures before creating new ones.
     */
    public createRenderResults(): void {

        const device = this.webgpu.getDevice();

        const usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;

        if (this.renderResults) {
            Object.values(this.renderResults).forEach((texture) => { texture.destroy() });
        }

        const albedo = device.createTexture({
            size: {
                width: this.width,
                height: this.height,
                depthOrArrayLayers: 1
            },
            format: this.canvasFormat,
            usage: usage,
            label: "albedo"
        });

        const depth = device.createTexture({
            size: {
                width: this.width,
                height: this.height,
                depthOrArrayLayers: 1
            },
            format: this.depthStencilFormat,
            usage: usage,
            label: "depth"
        });

        const normal = device.createTexture({
            size: {
                width: this.width,
                height: this.height,
                depthOrArrayLayers: 1
            },
            format: this.canvasFormat,
            usage: usage,
            label: "normal"
        });

        const uv = device.createTexture({
            size: {
                width: this.width,
                height: this.height,
                depthOrArrayLayers: 1
            },
            format: this.canvasFormat,
            usage: usage,
            label: "uv"
        });


        this.renderResults = {
            albedo: albedo,
            depth: depth,
            normal: normal,
            uv: uv
        };
    }


    /**
     * Creates densely packed vertex/index buffers with all `entities` from {@link scene} as well as the corresponding {@link drawParameters}. 
     */
    public createMeshBuffers(): void {

        let objectCount = 0;
        let vertexSize = 0;
        let indexSize = 0;

        const vertexAccumulator: Float32Array[] = [];
        const indexAccumulator: Uint32Array[] = [];
        const transformAccumulator: number[] = [];
        const drawParameters: number[] = [];

        let visited = new Set<TriangleMesh>;

        this.scene.entities.forEach((object: MeshInstance, name: String) => {

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
                instances.forEach((entity) => {
                    transformAccumulator.push(...entity.getWorldTransform());
                })

                objectCount += mesh.instancedBy.size;
                vertexSize += mesh.vertexBuffer.length / 8;
                indexSize += mesh.elementBuffer.length;


            }
        });

        const device = this.webgpu.getDevice();

        this.vertexBuffer?.destroy();


        this.vertexBuffer = device.createBuffer({
            size: vertexSize * 4 * 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
            label:"vertex"
        });


        this.indexBuffer?.destroy();

        this.indexBuffer = device.createBuffer({
            size: indexSize * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
            label:"index"
        });


        this.transformBuffer?.destroy();

        this.transformBuffer = device.createBuffer({
            size: transformAccumulator.length * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
            label:"transform"
        });

        this.cameradataUniform?.destroy();

        this.cameradataUniform = device.createBuffer({
            size: 64*2,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            mappedAtCreation:true,
            label:"camera"
        })




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




        const cameraDataBufferMap: Float32Array = new Float32Array(this.cameradataUniform.getMappedRange());     // cameraData
        cameraDataBufferMap.set(this.camera.getViewMatrix());
        cameraDataBufferMap.set(this.camera.getProjectionMatrix(), 16);      // offset of one mat4x4
        this.cameradataUniform.unmap();






        device.queue.writeBuffer(this.vertexBuffer, 0, vertexArray);
        device.queue.writeBuffer(this.indexBuffer, 0, indexArray);
        device.queue.writeBuffer(this.transformBuffer, 0, new Float32Array(transformAccumulator));
        this.drawParameters = new Uint32Array(drawParameters);
    }


    public createBindgroup(): void {

        const device = this.webgpu.getDevice();

        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
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
                        minBindingSize:0
                    }
                }
            ]
        });

        this.bindgroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.cameradataUniform
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: this.transformBuffer,
                        
                    }
                }
            ]
        });


        this.pipeLineLayout = this.webgpu.getDevice().createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });



        


    }






    /**
     * Redraws the scene
     */
    public async render() {

        this.createMeshBuffers();

    

        const depthStencilView = this.renderResults.depth.createView();



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
        }, "vertex-buffer");

        const indexBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: packedIndexArray.byteLength,            // each face is 3 int32
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
            label: "index-buffer"
        }, "index-buffer");

        const cameraDataBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: 64 * 2,         // mat4x4 proj and view
            usage: GPUBufferUsage.UNIFORM,
            mappedAtCreation: true,
            label: "cameraData-buffer"
        }, "cameraData-buffer");

        const transformBuffer: GPUBuffer = this.webgpu.createBuffer({
            size: packedTransformArray.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
            label: "transform-buffer"
        }, "transform-buffer");




        // filling buffers

        this.webgpu.getDevice().queue.writeBuffer(vertexBuffer, 0, packedVertexArray);     // vertex
        this.webgpu.getDevice().queue.writeBuffer(indexBuffer, 0, packedIndexArray);       // index


        


        this.webgpu.getDevice().queue.writeBuffer(transformBuffer, 0, packedTransformArray);   // transforms





        // creating bindgroup

        


        // setting up pipeline

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 32,
            attributes: TriangleMesh.attributes,
            stepMode: "vertex"
        }


        

        const shaderModule: GPUShaderModule = this.webgpu.getDevice().createShaderModule({
            code: shaderMain
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
            layout: this.pipeLineLayout,
            depthStencil: this.depthStencilState
        };



        

        const pipeline = this.webgpu.getDevice().createRenderPipeline(pipelineDescriptor);


        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.setIndexBuffer(this.indexBuffer, "uint32");
        renderPass.setBindGroup(0, this.bindgroup);



        console.log(indirectArray);

        for (let k = 0; k < indirectArray.length; k += 5) {


            //this.webgpu.getDevice().queue.writeBuffer(transformIndexUniform,0,new Uint32Array([transformOffset]));

            renderPass.drawIndexed(indirectArray[k], indirectArray[k + 1], indirectArray[k + 2], 0, indirectArray[k + 4]);



        }

        renderPass.end();


        this.webgpu.getDevice().queue.submit([commandEncoder.finish()])

        indexBuffer.destroy();
        vertexBuffer.destroy();
        cameraDataBuffer.destroy();
        transformBuffer.destroy();
        //depthStencilTexture.destroy();

    }







}