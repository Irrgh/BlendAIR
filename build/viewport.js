/**
 * Represents a viewport for Rendering.
 * Manages initialization for WebGPU
 */
export class Viewport {
    canvas;
    /**
     * Constructs a new Viewport in a canvas.
     * @param {HTMLCanvasElement} canvas - The HTML canvas element for rendering.
     */
    constructor(canvas) {
        this.canvas = canvas;
    }
    adapter = null;
    device = null;
    context = null;
    canvasFormat = null;
    /**
     * Initializes the Viewport for rendering with WebGPU.
     * @returns {Promise<void>} A Promise that resolves when initialization is complete.
     */
    async initialize() {
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
            format: this.canvasFormat,
        });
    }
    /**
     * Clears the current Render Pass with a clear color
     */
    clear(color = { r: 0, g: 0, b: 0, a: 1 }) {
        /*  Interface for recording GPU commands */
        const encoder = this.device.createCommandEncoder();
        const pass = encoder?.beginRenderPass({
            colorAttachments: [{
                    view: this.context.getCurrentTexture().createView(),
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
        this.device.queue.submit([encoder.finish()]);
    }
}
