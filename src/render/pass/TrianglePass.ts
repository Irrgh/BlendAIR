import { Renderer } from "../Renderer";
import { RenderPass } from "./RenderPass";
import { Scene } from "../../engine/Scene";
import { Viewport } from "../../engine/Viewport";

/**
 * The TrianglePass takes all TriangleMeshes of the {@link Scene.entities | Scene's entities} and renders them using
 */
export class TrianglePass extends RenderPass {
    
    constructor() {

        const input : PassResource[] = [
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

        const output : PassResource[] = [
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

        super(input,output);

    }

    public render(renderer: Renderer, viewport:Viewport): void {
       
        

        const colorTexture = renderer.getTexture("color");
        const depthTexture = renderer.getTexture("depth");
        const objectIndexTexture = renderer.createTexture({
            size: {width:viewport.width,height:viewport.height},
            format: "r8uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label:"object-index"
        },"object-index");


        const normalTexture = renderer.createTexture({
            size: {width:viewport.width,height:viewport.height},
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label:"normal"
        },"normal");


        const color = renderer.getTexture("color");
        const depth = renderer.getTexture("depth");








    }


}