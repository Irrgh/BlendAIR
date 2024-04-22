/**
 * Represents a viewport for Rendering.
 * Manages initialization for WebGPU
 */
export class Viewport {

    /**
     * Constructs a new Viewport in a canvas.
     * @param {HTMLCanvasElement} canvas - The HTML canvas element for rendering. 
     */
    constructor(private canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

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
        if (!this.device) {
            throw new Error("No appropriate GPUDevice found.");
        }


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


    



    render(vertices: Float32Array, shaders: string): void {



        const shaderModule = this.device!.createShaderModule({
            code: shaders,
        });


        const vertexBuffer = this.device!.createBuffer({
            size: vertices.byteLength, // make it big enough to store vertices in
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });


        this.context!.configure({
            device: this.device!,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied",
        });

        this.device!.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);


        const vertexBuffers: GPUVertexBufferLayout[] = [
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

        const pipelineDescriptor: GPURenderPipelineDescriptor = {
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


        const renderPipeline = this.device!.createRenderPipeline(pipelineDescriptor);
        console.log("test");

        const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

        const commandEncoder = this.device!.createCommandEncoder();


        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: clearColor,
                    loadOp: "clear",
                    storeOp: "store",
                    view: this.context!.getCurrentTexture().createView(),
                },
            ],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.draw(3);


        passEncoder.end();

        this.device!.queue.submit([commandEncoder.finish()]);




    }






}














