import { Scene } from "./Scene";
import { WebGPU } from "./WebGPU";
import shaderMain from "../../assets/shaders/main.wgsl";
import { MeshInstance } from "../entity/MeshInstance";
import { mat4 } from "gl-matrix";
import { TriangleMesh } from "./TriangleMesh";
import { Camera } from "../entity/Camera";
import { Resizable } from "../gui/Resizable";
import { Util } from "../util/Util";
import { Navigator } from "./Navigator";
import { DebugOverlay } from "../gui/DebugOverlay";


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

    private depthStencilFormat: GPUTextureFormat = "depth24plus-stencil8";

    private depthStencilState: GPUDepthStencilState = {
        format: this.depthStencilFormat,
        depthWriteEnabled: true, // Enable writing to the depth buffer
        depthCompare: "less" // Enable depth testing with "less" comparison
    };


    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private transformBuffer!: GPUBuffer;
    private cameradataUniform!: GPUBuffer;

    private bindgroup!:GPUBindGroup;

    private drawParameters!: Uint32Array;
    private pipeLineLayout!: GPUPipelineLayout;


    width: number;
    height: number;

    private navigator?:Navigator;



    constructor(webgpu: WebGPU, canvas: HTMLCanvasElement, scene: Scene) {
        this.webgpu = webgpu;
        this.canvas = canvas;
        this.scene = scene;
        this.scene.viewports.add(this);
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
        this.camera.setPosition(1,1,1); /** @todo please change this  */

        this.createRenderResults();
        this.createMeshBuffers();

        //this.createBindgroup();
    }


    

    setNavigator(navigator:Navigator):void {
        this.navigator?.stop();
        this.navigator = navigator;
        this.navigator.use();
    }

    

    resize(width: number, height: number): void {
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;

        const aspect = width / height;

        this.camera.setPerspectiveProjection(Math.PI / 2, aspect, 0.1,100);
        this.createRenderResults();
        requestAnimationFrame(this.render);

        // should probably resize all render related textures like depth, albedo, normal, uv and then redraw
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

                
                instances.forEach((entity:MeshInstance) => {
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




        this.updateCameraUniform();

        //console.log("vertex:", vertexArray);
        //console.log("index:", indexArray);
        //console.log("transform: ", transformAccumulator);





        device.queue.writeBuffer(this.vertexBuffer, 0, vertexArray);
        device.queue.writeBuffer(this.indexBuffer, 0, indexArray);
        device.queue.writeBuffer(this.transformBuffer, 0, new Float32Array(transformAccumulator));
        this.drawParameters = new Uint32Array(drawParameters);
    }


    private updateCameraUniform() {

        this.cameradataUniform?.destroy();

        this.cameradataUniform = this.webgpu.getDevice().createBuffer({
            size: 64*2,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            mappedAtCreation:true,
            label:"camera"
        })

        const cameraDataBufferMap: Float32Array = new Float32Array(this.cameradataUniform.getMappedRange()); // cameraData
        cameraDataBufferMap.set(this.camera.getViewMatrix());
        cameraDataBufferMap.set(this.camera.getProjectionMatrix(), 16); // offset of one mat4x4

        //console.log("view: ", this.camera.getViewMatrix());
        //console.log("proj: ", this.camera.getProjectionMatrix());



        this.cameradataUniform.unmap();
    }

    public createBindgroup(): void {
        
        const device = this.webgpu.getDevice();

        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"
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
    public render = () => {

        if (this.scene.entities.size == 0) {
            return;
        }




        const time = performance.now();
        this.createMeshBuffers();
        console.log(`creating buffers took: ${performance.now() - time} ms`);
        
        this.createBindgroup();


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



        // creating buffers



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
                stripIndexFormat: undefined
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

    

        //console.log(this.drawParameters);

        for (let k = 0; k < this.drawParameters.length; k += 5) {


            //this.webgpu.getDevice().queue.writeBuffer(transformIndexUniform,0,new Uint32Array([transformOffset]));
            renderPass.drawIndexed(this.drawParameters[k], this.drawParameters[k + 1], this.drawParameters[k + 2], 0, this.drawParameters[k + 4]);



        }

        renderPass.end();


        this.webgpu.getDevice().queue.submit([commandEncoder.finish()])

        
        //depthStencilTexture.destroy();

    }







}