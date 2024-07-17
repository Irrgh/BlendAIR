import { Viewport } from "../../engine/Viewport";
import { RenderPass } from "./RenderPass"
import { Renderer } from '../Renderer';
import fullQuadShader from "../../../assets/shaders/fullQuadShader.wgsl";
import { App } from "../../app";

export class DepthConversionPass extends RenderPass {

    constructor(renderer: Renderer) {
        const input: PassResource[] = [
            {
                label: "compute-depth",
                resource: "texture"
            }
        ];

        const output: PassResource[] = [
            {
                label: "render-depth",
                resource: "texture"
            }
        ];

        super(renderer, input, output);

    }

    private shader = /* wgsl */ `
    
        ${fullQuadShader}
    
        @binding(1) @group(0) var textureSampler : sampler;
        @binding(0) @group(0) var computeDepth : texture_2d<f32>;
        
        @fragment 
        fn depthFrag_main(input : VertexOutput) -> @builtin(frag_depth) f32 {

            let depth : f32 = textureSample(computeDepth,textureSampler,input.uv).r;
            return depth;
        }
    `;


    public render(viewport: Viewport): void {

        const device: GPUDevice = App.getRenderDevice();

        const computeDepth: GPUTexture = this.renderer.getTexture("compute-depth");
        const renderDepth: GPUTexture = this.renderer.getTexture("render-depth");

        const sampler: GPUSampler = device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });

        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "unfilterable-float"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: "non-filtering"
                    }
                }
            ]
        });

        const bindgroup: GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: computeDepth.createView()
                }, {
                    binding: 1,
                    resource: sampler
                }
            ]
        });

        const shaderModule: GPUShaderModule = device.createShaderModule({ code: this.shader });

        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        });

        const passDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: {
                view: renderDepth.createView(),
                depthStoreOp: 'store',
                depthLoadOp:"clear",
                depthClearValue:1.0,
            }
        }

        const pipeline: GPURenderPipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "fullscreen_vertex_shader"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "depthFrag_main",
                targets: []
            },
            primitive: {
                topology: "triangle-list"
            },
            depthStencil: {
                format: "depth32float",
                depthWriteEnabled: true, // Enable writing to the depth buffer
                depthCompare: "less", // Enable depth testing with "less" comparison
            },
            layout: pipelineLayout
        });



        const commandEncoder : GPUCommandEncoder = device.createCommandEncoder();
        const renderPass : GPURenderPassEncoder = commandEncoder.beginRenderPass(passDescriptor);

        renderPass.setBindGroup(0,bindgroup);
        renderPass.setPipeline(pipeline);
        renderPass.draw(6,1,0,0);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);


    }

}