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
        this.canvas = canvas;
    }
    /**
     * Actual device used for rendering @example {vendor: 'intel', architecture: 'gen-12lp', device: '', description: ''}
     */
    adapter = null;
    /**
     * Interface for using gpu
     */
    device = null;
    context = null;
    canvasFormat = null;
    initialized = false;
    /**
     * Initializes the Viewport for rendering with WebGPU.
     * @returns {Promise<void>} A Promise that resolves when initialization is complete.
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported on this browser.");
        }
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error("No appropriate GPUAdapter found.");
        }
        this.device = await this.adapter.requestDevice();
        if (!this.device) {
            throw new Error("No appropriate GPUDevice found.");
        }
        this.context = this.canvas.getContext("webgpu");
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context?.configure({
            device: this.device,
            format: this.canvasFormat
        });
        this.initialized = true;
    }
    /**
     * Clears the current render pass with a color.
     */
    async clear(color = { r: 0, g: 0, b: 0, a: 1 }) {
        await this.initialize();
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
    async render(vertices, shaders) {
        await this.initialize();
        const shaderModule = this.device.createShaderModule({
            code: shaders,
        });
        const vertexBuffer = this.device.createBuffer({
            size: vertices.byteLength, // make it big enough to store vertices in
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        this.context.configure({
            device: this.device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied",
        });
        this.device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
        const vertexBuffers = [
            {
                attributes: [
                    {
                        shaderLocation: 0, // position
                        offset: 0,
                        format: "float32x4",
                    },
                    {
                        shaderLocation: 1, // color
                        offset: 16,
                        format: "float32x4",
                    },
                ],
                arrayStride: 32,
                stepMode: "vertex",
            },
        ];
        const pipelineDescriptor = {
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: vertexBuffers,
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: navigator.gpu.getPreferredCanvasFormat(),
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: "auto",
        };
        const renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);
        console.log("test");
        const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
        const commandEncoder = this.device.createCommandEncoder();
        const renderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context.getCurrentTexture().createView(),
                },
            ],
        };
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.draw(3);
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}
