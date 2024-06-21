import { Renderer } from "./Renderer";
import { Viewport } from '../engine/Viewport';
import { TrianglePass } from "./pass/TrianglePass";
import { RenderPass } from "./pass/RenderPass";
import { RenderGraph } from "./RenderGraph";
import { MeshInstance } from "../entity/MeshInstance";
import { Entity } from "../entity/Entity";
import { TriangleMesh } from "../engine/TriangleMesh";
import { App } from "../app";
import { Util } from '../util/Util';

export class BasicRenderer extends Renderer {
    
    constructor (viewport:Viewport) {
        super("basic",viewport);
        this.passes = [new TrianglePass(this)]
        
    }


    








    public render(): void {

        this.createTexture({
            size: {width:this.viewport.width,height:this.viewport.height},
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        },"color");


        this.createTexture({
            size: {width:this.viewport.width, height:this.viewport.height},
            format: "r8uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        },"depth");


        this.createTexture({
            size: { width: this.viewport.width, height: this.viewport.height },
            format: "r8uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        }, "object-index");

        this.createTexture({
            size: { width: this.viewport.width, height: this.viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        }, "normal");
        
        
        const sorted = RenderGraph.topSort(this.passes);


        this.passes.forEach((pass: RenderPass) => {

            pass.render(this.viewport);

        });

    }










}