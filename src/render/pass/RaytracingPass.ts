import { App } from "../../app";
import { Viewport } from "../../engine/Viewport";
import { Renderer } from "../Renderer";
import { RenderPass } from "./RenderPass";

export class RaytracingPass extends RenderPass {

    constructor(renderer: Renderer) {

        const input: PassResource[] = [
            {
                label: "camera",
                resource: "buffer"
            },
            {
                label: "vertex",
                resource: "buffer"
            }, {
                label: "index",
                resource: "buffer"
            }
        ]

        const output: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "compute-depth",
                resource: "texture",
            }, {
                label: "object-index",
                resource: "texture",
            }, {
                label: "normal",
                resource: "texture"
            }
        ];

        super(renderer, input, output);
    }

    private workgroupsize = 16;



    private shader = /* wgsl */ `
    
        
        @binding(0) @bindgroup(0) var colorTexture : 2d_storage_texture<f32>;
        @binding(1) @group(0) var<uniform> camera : Camera;


        @compute @workgroupsize(${this.workgroupsize},${this.workgroupsize})
        fn raytrace_main (@builtin(global_invocation_id) global_id: vec3<u32>) {

            let x = global_id.x;
            let y = global_id.y;
            let uv = vec2<f32>(f32(x) / f32(camera.width), f32(y) / f32(camera.height));

            textureStore(colorTexture, vec2<u32>(x,y) ,vec4<f32>(uv, 0.0,1.0));


        }

    
    `


    public render(viewport: Viewport): void {

        const cameraBuffer = this.renderer.getBuffer("camera");
        const vertexBuffer = this.renderer.getBuffer("vertex");
        const indexBuffer = this.renderer.getBuffer("index");
        const materialBuffer = this.renderer.getBuffer("material");
        const objectParameterBuffer = this.renderer.getBuffer("object-parameters"); // basically like drawParameters from TrianglePass


        const colorTexture = this.renderer.getTexture("color");
        const normalTexture = this.renderer.getTexture("normal");
        const depthTexture = this.renderer.getTexture("depth");


        const device = App.getRenderDevice();


        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only",
                        format: "rgba8unorm"
                    }
                }, {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only",
                        format: "rgba8unorm"
                    }
                }, {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "read-write",
                        format: "r32float"
                    }
                }
            ]
        });






        const bindgroup: GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: cameraBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: vertexBuffer }
                }, {
                    binding: 2,
                    resource: { buffer: indexBuffer }
                }, {
                    binding: 3,
                    resource: { buffer: objectParameterBuffer }
                }, {
                    binding: 4,
                    resource: { buffer: materialBuffer }

                }, {
                    binding: 5,
                    resource: colorTexture.createView()
                }, {
                    binding: 6,
                    resource: normalTexture.createView()
                }, {
                    binding: 7,
                    resource: depthTexture.createView()
                }
            ]
        });

        const pipelineLayout : GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        })


        const pipeline : GPUComputePipeline = device.createComputePipeline({
            compute: {
                module: device.createShaderModule({code:this.shader})
            },
            layout: pipelineLayout
        })

        const commandEncoder : GPUCommandEncoder = device.createCommandEncoder();

        const computePass : GPUComputePassEncoder = commandEncoder.beginComputePass();

        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0,bindgroup);

        computePass.dispatchWorkgroups(
            Math.ceil(colorTexture.width / this.workgroupsize),
            Math.ceil(colorTexture.height / this.workgroupsize),
        );










    }
}