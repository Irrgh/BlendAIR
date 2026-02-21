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
import { BlenderController } from "../input/BlenderController";
import { Controller } from "./Controller";

type WebGLContext = {
    gl: WebGLRenderingContext;
    prog: WebGLProgram;
}



export class Viewport implements Resizable {


    /**
     * Rendering Canvas 
     */
    canvas: HTMLCanvasElement;

    webgpuCanvas?: OffscreenCanvas;

    canvasFormat: GPUTextureFormat;

    webgpuContext: GPUCanvasContext;


    /**
     * Scene to view, is needed instead of {@link App.getScene()} to allow smth like material preview scene.
     */
    scene: Scene

    /**
     * {@link Camera} Object used for rendering.
     */
    public camera: Camera;


    public redrawNext: boolean = false;


    private renderer: Renderer;


    width: number;
    height: number;

    public controller?: Controller;
    private ctx?: WebGLRenderingContext;
    private supportXR: boolean;
    private xrReady: boolean = false;
    private prog?: WebGLProgram;

    private blitTexture?: WebGLTexture;

    constructor(canvas: HTMLCanvasElement, scene: Scene, supportXR: boolean = false) {
        this.canvas = canvas;
        this.scene = scene;
        this.scene.viewports.add(this);
        this.canvasFormat = "rgba8unorm";
        this.supportXR = supportXR;

        if (supportXR) {
            this.webgpuCanvas = new OffscreenCanvas(canvas.width, canvas.height);
            this.webgpuContext = <GPUCanvasContext>this.webgpuCanvas.getContext("webgpu");
            this.ctx = canvas.getContext("webgl", { alpha: false }) as WebGLRenderingContext;
            this.prog = this.initWebGL();

            const gl = this.ctx!;
            this.blitTexture = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, this.blitTexture!);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        } else {
            this.webgpuContext = <GPUCanvasContext>canvas.getContext("webgpu");
        }

        //this.context = <GPUCanvasContext>canvas.getContext("webgpu");
        this.webgpuContext.configure({
            device: App.getRenderDevice(),
            format: this.canvasFormat,
            alphaMode: "premultiplied",
        });

        this.width = canvas.width;
        this.height = canvas.height;
        const aspect = this.width / this.height;

        this.camera = new Camera();
        this.camera.setPerspectiveProjection(Util.degreeToRadians(90), aspect, 0.1, 100);
        this.camera.setPosition(0, 0, 0); /** @todo please change this  */

        this.renderer = new BasicRenderer(this);
        this.renderer.render();
    }

    getRenderer(): Renderer {
        return this.renderer;
    }

    public updateMeshes() {
        this.renderer.updateMeshBuffer(this);
    }

    public updateTransforms() {
        this.renderer.updateTransformBuffer(this);
    }


    public getController(): Controller | undefined {
        return this.controller;
    }

    public resize(width: number, height: number): void {

        if (width != this.width || height != this.height) {
            this.canvas.width = width;
            this.canvas.height = height;

            if (this.webgpuCanvas) {
                this.webgpuCanvas.width = width;
                this.webgpuCanvas.height = height;
            }


            this.width = width;
            this.height = height;

            const aspect = width / height;

            this.camera.setPerspectiveProjection(Math.PI / 2, aspect, 0.1, 100);
            this.renderer.render();
        }
        // should probably resize all render related textures like depth, albedo, normal, uv and then redraw
    }




    public async xrReadyContext(): Promise<WebGLRenderingContext> {
        if (!this.supportXR) {
            throw new Error("XR not supported");
        }

        if (!this.xrReady) {
            await this.ctx!.makeXRCompatible();
            this.xrReady = true;
        }

        return this.ctx!;
    }

    private initWebGL(): WebGLProgram {
        const gl = this.ctx!;

        const vsSource = `
                attribute vec2 a_position;
                varying vec2 v_uv;
                void main() {
                    v_uv = (a_position + 1.0) * 0.5;
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }`;

        const fsSource = `
                precision mediump float;
                varying vec2 v_uv;
                uniform sampler2D u_tex;
                void main() {
                    gl_FragColor = texture2D(u_tex, vec2(v_uv.x, 1.0 - v_uv.y));
                }`;

        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        const prog = gl.createProgram()!;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const pos = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, pos);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        );

        const loc = gl.getAttribLocation(prog, "a_position");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        return prog;
    }

    public resizeForXR(vps: XRViewport[]): void {
        if (!this.xrReady) throw new Error("viewport is not ready for xr");

        let width: number = 0;
        let height: number = 0;

        vps.forEach(vp => {
            width = Math.max(width, vp.width);
            height = Math.max(height, vp.height);
        });

        if (width != this.width || height != this.height) {
            //this.canvas.width = width;
            //this.canvas.height = height;

            if (this.webgpuCanvas) {
                this.width = width;
                this.height = height;
                this.webgpuCanvas!.width = width;
                this.webgpuCanvas!.height = height;
            }
        }



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

    public async drawTexture(texture: GPUTexture, sampleType: GPUTextureFormat, fragment: string) {

        // draws to webgpu canvas
        this.webgpuDrawTexture(fragment, sampleType, texture);


        if (this.ctx && this.webgpuCanvas) {
            const gl = this.ctx;
            const prog = this.prog!;

            gl.bindTexture(gl.TEXTURE_2D, this.blitTexture!);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.webgpuCanvas);

            if (this.getController()?.type === "blender") {
                gl.viewport(0, 0, this.width, this.height);
            }

            const samplerLoc = gl.getUniformLocation(prog, "u_tex");
            gl.uniform1i(samplerLoc, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.blitTexture!);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

    }



    /**
     * Redraws the scene
     */
    public render = () => {
        this.renderer.render();
    }


    private webgpuDrawTexture(fragment: string, sampleType: GPUTextureFormat, texture: GPUTexture) {
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
        });

        const resolutionBuffer = device.createBuffer({
            size: 8,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC
        });

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
        });

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
                    view: this.webgpuContext.getCurrentTexture().createView(),
                    storeOp: "store",
                    loadOp: "clear"
                }
            ],
            label: "render texture to viewport"
        };

        App.getInstance().webgpu.attachTimestamps(passDescriptor);

        const commandEncoder = device.createCommandEncoder();
        const renderPassEncoder = commandEncoder.beginRenderPass(passDescriptor);

        renderPassEncoder.pushDebugGroup("presenting to canvas");
        renderPassEncoder.setPipeline(renderPipeline);
        renderPassEncoder.setBindGroup(0, bindgroup);
        renderPassEncoder.draw(6, 1, 0, 0);
        renderPassEncoder.popDebugGroup();
        renderPassEncoder.end();

        App.getWebGPU().prepareTimestampsResolution(passDescriptor, commandEncoder);

        device.queue.submit([commandEncoder.finish()]);

        App.getWebGPU().resolveTimestamp(passDescriptor).then(result => {
        });
    }
}