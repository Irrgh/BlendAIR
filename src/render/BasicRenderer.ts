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
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        },"depth");


        this.createTexture({
            size: { width: this.viewport.width, height: this.viewport.height },
            format: "r32uint",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        }, "object-index");

        this.createTexture({
            size: { width: this.viewport.width, height: this.viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        }, "normal");
        
        
        //const sorted = RenderGraph.topSort(this.passes);
        this.updateCameraData(this.viewport);
        
        this.passes.forEach((pass: RenderPass) => {

            pass.render(this.viewport);

        });


        const shader = this.viewport.createTextureConversionShader(
            /* wgsl */`
                let coords : vec2<i32> = vec2<i32>(i32(input.uv.x * f32(res.x)),i32(input.uv.y * f32(res.y)));
                let color = textureLoad(texture,coords);
                if (color.r == 0) {
                    return vec4<f32>(0.0,0.0,0.0,0.0);
                }

                let r = fract(f32(color.r) / 127.0);
                let g = fract(f32(color.r - 9) / 183.0);
                let b = fract(f32(color.r + 17) / 71.0);


                return vec4<f32>(r,g,b,1.0);

            `,"r32uint"
        )

        this.viewport.drawTexture(this.getTexture("object-index"), "r32uint",shader);         // i swear to god this was commented out and i was debugging everything else 
    }










}