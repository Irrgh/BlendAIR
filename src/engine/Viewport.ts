import { Scene } from "./Scene";
import { WebGPU } from "./WebGPU";

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
    webgpu : WebGPU

    /**
     * Rendering Canvas 
     */
    canvas : HTMLCanvasElement

    canvasFormat : GPUTextureFormat;

    context : GPUCanvasContext;


    /**
     * Scene to render
     */
    scene : Scene


    constructor (webgpu:WebGPU,canvas:HTMLCanvasElement, scene:Scene) {
        this.webgpu = webgpu;
        this.canvas = canvas;
        this.scene = scene;
        this.canvasFormat = "bgra8unorm";
        this.context = <GPUCanvasContext> canvas.getContext("webgpu");
        this.context.configure({
            device: this.webgpu.device,
            format: this.canvasFormat
        });
    }

    
    /**
     * Redraws the scene
     */
    public render () {

        const commandEncoder = this.webgpu.device.createCommandEncoder(); // definitely needs to be recreated every render pass


        const renderPassDescriptor: GPURenderPassDescriptor = {     // description of the renderpass
            colorAttachments: [
                {
                    clearValue: {r:Math.random(),g:Math.random(),b:Math.random(),a:1},
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView(),
                },
            ],
        };

        const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
        renderPass.end();


        this.webgpu.device.queue.submit([commandEncoder.finish()])









    }







}