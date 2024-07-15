import { Renderer } from "./Renderer";
import { Viewport } from '../engine/Viewport';
import { RaytracingPass } from "./pass/RaytracingPass";
import { RenderPass } from "./pass/RenderPass";

export class RealisticRenderer extends Renderer {
    
    constructor(viewport:Viewport) {
        super("raytracer",viewport);
        this.passes = [new RaytracingPass(this)]

    } 
    
    
    
    
    
    public render(): void {
        
        this.createTexture({
            size: {width:this.viewport.width,height:this.viewport.height},
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        },"color");


        this.createTexture({
            size: {width:this.viewport.width, height:this.viewport.height},
            format: "r32float",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
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








        this.passes.forEach((pass:RenderPass) => {
            pass.render(this.viewport);
        })


        const shader = /* wgsl */`
        let coords : vec2<i32> = vec2<i32>(i32(input.uv.x * f32(res.x)),i32(input.uv.y * f32(res.y)));
        let color = textureLoad(texture,coords);
        return color;
        `;

        this.viewport.drawTexture(this.getTexture("color"),"rgba8unorm",shader);

    }

}