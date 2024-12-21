import { Renderer } from "./Renderer";
import { Viewport } from '../engine/Viewport';
import { TrianglePass } from "./pass/TrianglePass";
import { OldRenderPass } from "./pass/OldRenderPass";
import { SelectionOutlinePass } from './pass/SelectionOutlinePass';
import { CoordinatePlanePass } from './pass/CoordinatePlanePass';
import { RenderGraph } from "./RenderGraph";
import { TextureHandle } from "./ResourceHandle";
import { App } from "../app";

export class BasicRenderer extends Renderer {

    constructor(viewport: Viewport) {
        super("basic", viewport);
        this.passes = [];
        /** @todo please fix this */


        this.renderGraph = new RenderGraph("test");
        const device = App.getRenderDevice();


        const dummyTexture = this.renderGraph.createTexture("dummy", {
            size: { width: 800, height: 800 },
            format: "rgba8unorm",
            usage: 0
        })


        const outputTexture = this.renderGraph.createTexture("out", {
            size: { width: 800, height: 800 },
            format: "rgba8unorm",
            usage: GPUTextureUsage.STORAGE_BINDING,
        });

        const testSampler = this.renderGraph.createSampler("test", {});

        const module = device.createShaderModule({
            code:   /* wgsl */`
            struct VertexOutput {
                @builtin(position)
                position: vec4<f32>,
                @location(0)
                uv: vec2<f32>,
            };
            
            @vertex
            fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
                // See the explanation above for how this works
            
                var positions = array<vec2<f32>, 6>(
                    vec2<f32>(-1.0, -1.0), // Bottom-left
                    vec2<f32>( 1.0, -1.0), // Bottom-right
                    vec2<f32>(-1.0,  1.0), // Top-left
                    vec2<f32>(-1.0,  1.0), // Top-left
                    vec2<f32>( 1.0, -1.0), // Bottom-right
                    vec2<f32>( 1.0,  1.0)  // Top-right
                );
            
                // Define the UV coordinates for the quad
                var uvs = array<vec2<f32>, 6>(
                    vec2<f32>(0.0, 1.0), // Top-left
                    vec2<f32>(1.0, 1.0), // Top-right
                    vec2<f32>(0.0, 0.0), // Bottom-left
                    vec2<f32>(0.0, 0.0), // Bottom-left
                    vec2<f32>(1.0, 1.0), // Top-right
                    vec2<f32>(1.0, 0.0)  // Bottom-right
                );
            
            
                var output: VertexOutput;
                output.position = vec4<f32>(positions[vertex_index],0.0,1.0);
                output.uv = vec2<f32>(uvs[vertex_index]);
            
            
                return output;
            }
            
            @fragment
            fn fragment_pre (input : VertexOutput) -> @location(0) vec4<f32> {

                let distance : f32 = distance(input.uv, vec2f(0.5,0.5)) * 50f;
                let h = sin(distance);

                return vec4<f32>(h,h,h,1);
            }



            @binding(0) @group(0) var colorTexture : texture_2d<f32>;
            @binding(1) @group(0) var textureSampler : sampler;

            @fragment
            fn fragment_main (input : VertexOutput) -> @location(0) vec4<f32> {
                
                let col : vec4<f32> = textureSample(colorTexture, textureSampler,input.uv);

                return col * vec4<f32>(input.uv,1,1);
            }
            
            
            `
        });

        {

            const { builder, data } = this.renderGraph.addRenderPass<{}>("pre");

            builder.addColorAttachment({
                view: dummyTexture,
                loadOp: "load",
                storeOp: "store",
                clearValue: { r: 1, g: 1, b: 0, a: 1 }
            }, 0);                           // maybe add blend options and shit in here as well

            builder.setRenderPipelineDescriptor({
                vertex: {
                    module: module,
                    entryPoint: "vertex_main"
                },
                fragment: {
                    module: module,
                    entryPoint: "fragment_pre",
                    targets: [
                        { format: outputTexture.desc.format }
                    ]
                }
            });

            builder.setPassFunc((enc, data) => {
                enc.draw(6, 1);
            });
        }


        {

            const { builder, data } = this.renderGraph.addRenderPass<{}>("main");

            builder.bindTexture(dummyTexture, {
                group: 0,
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {sampleType:"float"}
            });
            
            builder.bindSampler(testSampler,{
                group: 0,
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT
            });


            builder.addColorAttachment({
                view: outputTexture,
                loadOp: "load",
                storeOp: "store",
                clearValue: { r: 1, g: 1, b: 0, a: 1 }
            }, 0);                           // maybe add blend options and shit in here as well


            




            builder.setRenderPipelineDescriptor({
                vertex: {
                    module: module,
                    entryPoint: "vertex_main"
                },
                fragment: {
                    module: module,
                    entryPoint: "fragment_main",
                    targets: [
                        { format: outputTexture.desc.format }
                    ]
                }
            })


            builder.setPassFunc((enc, data) => {
                enc.draw(6, 1);
            });


        }

        this.renderGraph.setExport(outputTexture, true);
        this.renderGraph.build();
    }

    private renderGraph: RenderGraph;

    public render(): void {


        this.renderGraph.run();

        console.log(this.renderGraph);

        const out = this.renderGraph.exports.get("out") as TextureHandle;
        const outView = out.resolve().then(texture => {
            const shader = /* wgsl */`
                let coords : vec2<i32> = vec2<i32>(i32(input.uv.x * f32(res.x)),i32(input.uv.y * f32(res.y)));
                let color = textureLoad(texture,coords);
                return color;
            `;

            this.viewport.drawTexture(texture, "rgba8unorm", shader)
        });


    }










}