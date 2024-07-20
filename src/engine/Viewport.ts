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
import { App } from "../app";
import fullQuadShader from "../../assets/shaders/fullQuadShader.wgsl";
import { RealisticRenderer } from "../render/RealisticRenderer";


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




    private renderer: Renderer;


    width: number;
    height: number;

    private navigator?: Navigator;



    constructor(webgpu: WebGPU, canvas: HTMLCanvasElement, scene: Scene) {
        this.webgpu = webgpu;
        this.canvas = canvas;
        this.scene = scene;
        this.scene.viewports.add(this);
        this.canvasFormat = "rgba8unorm";
        this.context = <GPUCanvasContext>canvas.getContext("webgpu");
        this.context.configure({
            device: this.webgpu.getDevice(),
            format: this.canvasFormat,
            alphaMode: "premultiplied",
        });

        this.width = canvas.width;
        this.height = canvas.height;
        const aspect = this.width / this.height;

        this.camera = new Camera();
        this.camera.setPerspectiveProjection(Util.degreeToRadians(90), aspect, 0.1, 100);
        this.camera.setPosition(0, 0, 0); /** @todo please change this  */


        this.renderer = new RealisticRenderer(this);
        this.renderer.render();
    }



    getRenderer(): Renderer {
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
            this.renderer.render();
        }
        // should probably resize all render related textures like depth, albedo, normal, uv and then redraw
    }













    private createTextureConversionShader(fragment: string, texelFormat: string): GPUShaderModule {

        const frag = /*wgsl*/ `

            ${fullQuadShader}

            @binding(0) @group(0) var<uniform> res : vec2<u32>;
            @binding(1) @group(0) var texture : texture_storage_2d<${texelFormat},read>;


            @fragment
            fn fragment_main (input : VertexOutput) -> @location(0) vec4<f32> {
                ${fragment}
            }
        `
        return App.getRenderDevice().createShaderModule({ code: frag });
    }




    public drawTexture(texture: GPUTexture, sampleType: GPUTextureFormat, fragment: string) {

        const device = App.getRenderDevice();

        const shaderModule = this.createTextureConversionShader(fragment, sampleType);


        const bindgroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    storageTexture: {
                        access: "read-only",
                        format: sampleType
                    }
                }
            ]
        })

        const resolutionBuffer = device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC
        })

        device.queue.writeBuffer(resolutionBuffer, 0, new Uint32Array([this.width, this.height]));

        const bindgroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: resolutionBuffer }
                }, {
                    binding: 1,
                    resource: texture.createView()
                }
            ]
        })

        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        });

        const renderPipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "fullscreen_vertex_shader"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    { format: this.canvasFormat }
                ]
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: pipelineLayout,
            label: "viewport pipeline"
        });

        const passDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    storeOp: "store",
                    loadOp: "clear"
                }
            ],
            label: "render texture to viewport"
        }

        App.getInstance().webgpu.attachTimestamps(passDescriptor)

        const commandEncoder = device.createCommandEncoder();
        const renderPassEncoder = commandEncoder.beginRenderPass(passDescriptor)




        renderPassEncoder.pushDebugGroup("render to canvas");
        renderPassEncoder.setPipeline(renderPipeline);
        renderPassEncoder.setBindGroup(0, bindgroup);
        renderPassEncoder.draw(6, 1, 0, 0);
        renderPassEncoder.popDebugGroup();
        renderPassEncoder.end();

        App.getWebGPU().prepareTimestampsResolution(passDescriptor, commandEncoder);

        device.queue.submit([commandEncoder.finish()]);

        App.getWebGPU().resolveTimestamp(passDescriptor).then(result => {
            console.log(`Canvas Render took: ${result / 1000} µs`);
        })


    }



    /**
     * Redraws the scene
     */
    public render = () => {
        this.renderer.render();

    }

}