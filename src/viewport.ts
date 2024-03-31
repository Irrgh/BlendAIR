/**
 * Represents a viewport for Rendering.
 * Manages initialization for WebGPU
 */
export class Viewport {

    /**
     * Constructs a new Viewport in a canvas.
     * @param {HTMLCanvasElement} canvas - The HTML canvas element for rendering. 
     */
    constructor(private canvas: HTMLCanvasElement) { }

    /**
     * Actual device used for rendering @example {vendor: 'intel', architecture: 'gen-12lp', device: '', description: ''}
     */
    adapter: GPUAdapter | null = null;


    /**
     * Interface for using gpu
     */
    device: GPUDevice | null = null;


    context: GPUCanvasContext | null = null;
    canvasFormat: GPUTextureFormat | null = null;



    /**
     * Initializes the Viewport for rendering with WebGPU.
     * @returns {Promise<void>} A Promise that resolves when initialization is complete.
     */
    async initialize(): Promise<void> {

        if (!navigator.gpu) {
            throw new Error("WebGPU not supported on this browser.");
        }

        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error("No appropriate GPUAdapter found.");
        }

        this.device = await this.adapter.requestDevice();

        this.context = this.canvas.getContext("webgpu");
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context?.configure({
            device: this.device,
            format: this.canvasFormat
        });



    }

    /**
     * Clears the current render pass with a color.
     */

    clear(color: GPUColorDict = { r: 0, g: 0, b: 0, a: 1 }): void {


        /*  Interface for recording GPU commands */
        const encoder: GPUCommandEncoder = this.device!.createCommandEncoder();

        const pass = encoder?.beginRenderPass({
            colorAttachments: [{
                view: this.context!.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: color, // Background
                storeOp: "store",
            }]
        });

        if (!pass) {
            console.error("Failed to begin render pass.");
            return;
        }

        pass?.end();

        // Finish the command buffer and immediately submit it.
        this.device!.queue.submit([encoder!.finish()]);

    }









}














