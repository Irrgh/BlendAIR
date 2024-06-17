import { Renderer } from "../Renderer";
import { RenderPass } from "./RenderPass";
import { Scene } from "../../engine/Scene";
import { Viewport } from "../../engine/Viewport";
import { App } from "../../app";

/**
 * The TrianglePass takes all TriangleMeshes of the {@link Scene.entities | Scene's entities} and renders them using
 */
export class TrianglePass extends RenderPass {

    constructor() {

        const input: PassResource[] = [
            {
                label: "camera",
                resource: "buffer"
            }, {
                label: "vertex",
                resource: "buffer"
            }, {
                label: "index",
                resource: "buffer"
            }, {
                label: "transform",
                resource: "buffer"
            }, {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
                resource: "texture"
            }
        ]

        const output: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
                resource: "texture"
            }, {
                label: "normal",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "texture"
            }
        ]

        super(input, output);

    }

    public render(renderer: Renderer, viewport: Viewport): void {

        const device: GPUDevice = App.getRenderDevice();

        const colorTexture = renderer.getTexture("color");
        const depthTexture = renderer.getTexture("depth");
        const objectIndexTexture = renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "r8uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label: "object-index"
        }, "object-index");


        const normalTexture = renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label: "normal"
        }, "normal");



        const cameraValues = new ArrayBuffer(144);
        const cameraViews = {
            view: new Float32Array(cameraValues, 0, 16),
            proj: new Float32Array(cameraValues, 64, 16),
            width: new Uint32Array(cameraValues, 128, 1),
            height: new Uint32Array(cameraValues, 132, 1),
        };

        cameraViews.view.set(viewport.camera.getViewMatrix());
        cameraViews.proj.set(viewport.camera.getProjectionMatrix());
        cameraViews.width.set([viewport.width]);
        cameraViews.height.set([viewport.height]);

        const cameraUniformBuffer = renderer.createBuffer({
            size: cameraValues.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "camera"
        }, "camera");


        /** @todo TRANSFORM Buffer please */


        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: {}
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type:"read-only-storage"
                    }
                }
            ]
        });












    }


}