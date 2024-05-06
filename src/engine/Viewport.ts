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


    }

    
    /**
     * Redraws the scene
     */
    public render () {

        
    }







}