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
import { Entity } from "../entity/Entity";
import { Renderer } from '../render/Renderer';
import { BasicRenderer } from "../render/BasicRenderer";


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
        depthCompare: "less", // Enable depth testing with "less" comparison
    };


    private renderer: Renderer;


    width: number;
    height: number;

    private navigator?: Navigator;



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
        this.camera.setPosition(1, 1, 1); /** @todo please change this  */


        this.createMeshBuffers();

        this.renderer = new BasicRenderer(this);
        this.renderer.render();

        //this.createBindgroup();
    }



    getRenderer():Renderer {
        return this.renderer;
    }





    setNavigator(navigator: Navigator): void {
        this.navigator?.stop();
        this.navigator = navigator;
        this.navigator.use();
    }



    resize(width: number, height: number): void {

        if (width != this.width || height != this.height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.width = width;
            this.height = height;

            const aspect = width / height;

            this.camera.setPerspectiveProjection(Math.PI / 2, aspect, 0.1, 100);
            //this.createRenderResults();
            requestAnimationFrame(this.render);
        }
        // should probably resize all render related textures like depth, albedo, normal, uv and then redraw
    }






    

    /**
     * Creates densely packed vertex/index buffers with all `entities` from {@link scene} as well as the corresponding {@link drawParameters}. 
     */
    public createMeshBuffers(): void {

        
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



        const depthStencilView = this.renderResults.depth.createView({

        });



        const commandEncoder = this.webgpu.getDevice().createCommandEncoder({
            label: "encoder"
        }); // definitely needs to be recreated every render pass


        const objectIndexTexture = this.webgpu.getDevice().createTexture({
            size: { width: this.width, height: this.height },
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT  | GPUTextureUsage.TEXTURE_BINDING,
            label: "objectIndex",
            sampleCount:4
        })

        const readableDepthTexture = this.webgpu.getDevice().createTexture({
            size: { width: this.width, height: this.height },
            format: "r32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            label: "readable-depth",
            sampleCount:4
        });



        const renderPassDescriptor: GPURenderPassDescriptor = {     // description of the renderpass
            colorAttachments: [
                {
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.renderResults.albedo.createView(),
                }, {
                    clearValue: { r: 0, g: 0, b: 1, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: objectIndexTexture.createView(),
                    resolveTarget: this.context.getCurrentTexture().createView({ label: "canvasTexture" })
                }, {
                    loadOp: "clear",
                    storeOp: "store",
                    view: readableDepthTexture.createView()
                }
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
                    }, {
                        format: this.canvasFormat,
                    }, {
                        format: "r32float"
                    }
                ],
            },
            primitive: {
                topology: "triangle-list",
                stripIndexFormat: undefined
            },
            layout: "auto",
            depthStencil: this.depthStencilState,
            multisample: {
                count:4
            }
        };


        const pipeline = this.webgpu.getDevice().createRenderPipeline(pipelineDescriptor);

        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

        renderPass.setPipeline(pipeline);
        //renderPass.setVertexBuffer(0, this.vertexBuffer);
        //renderPass.setIndexBuffer(this.indexBuffer, "uint32");
        //renderPass.setBindGroup(0, this.bindgroup);



        //console.log(this.drawParameters);

        //for (let k = 0; k < this.drawParameters.length; k += 5) {


            //this.webgpu.getDevice().queue.writeBuffer(transformIndexUniform,0,new Uint32Array([transformOffset]));
            //renderPass.drawIndexed(this.drawParameters[k], this.drawParameters[k + 1], this.drawParameters[k + 2], 0, this.drawParameters[k + 4]);



        //}




        renderPass.end();

        


        this.webgpu.getDevice().queue.submit([commandEncoder.finish()])

        readableDepthTexture.destroy();
        objectIndexTexture.destroy();
        //depthStencilTexture.destroy();

    }







}