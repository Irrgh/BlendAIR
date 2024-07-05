import { Viewport } from "../../engine/Viewport";
import { RenderPass } from "./RenderPass";
import { Renderer } from '../Renderer';
import { App } from "../../app";
import fullQuadShader from "../../../assets/shaders/fullQuadShader.wgsl";
import { vec3 } from "gl-matrix";

export class CoordinatePlanePass extends RenderPass {

    constructor(renderer: Renderer) {

        const input: PassResource[] = [
            {
                label: "camera",
                resource: "buffer"
            }
        ]

        const output: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }
        ]

        super(renderer, input, output);
    }


    private shader: string = /* wgsl */`
    
    struct VertexOutput {
        @builtin(position)
        position: vec4<f32>,
        @location(0)
        uv: vec2<f32>,
    };
    

    @binding(0) @group(0) var<uniform> camera : Camera;
    @binding(1) @group(0) var<uniform> distance : f32;
    
    @vertex
    fn fullscreen_vertex_shader(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
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
            vec2<f32>(0.0, 0.0), // Bottom-left
            vec2<f32>(1.0, 0.0), // Bottom-right
            vec2<f32>(0.0, 1.0), // Top-left
            vec2<f32>(0.0, 1.0), // Top-left
            vec2<f32>(1.0, 0.0), // Bottom-right
            vec2<f32>(1.0, 1.0)  // Top-right
        );
    
        


        var scale : mat4x4<f32>;
        scale[0][0] = distance; 
        scale[1][1] = distance; 
        scale[2][2] = distance;
        scale[3][3] = 1.0;


        var output: VertexOutput;
        output.position = camera.proj * camera.view * scale * vec4<f32>(positions[vertex_index],0.0,1.0);
        output.uv = vec2<f32>(uvs[vertex_index]);
    
        return output;
    }




        struct Camera {
            view:mat4x4<f32>,
            proj:mat4x4<f32>,
            width:u32,
            height:u32,
        }
        
        
        fn modBy(a:f32,b:f32) -> f32 {
            return fract(a/b);
        }

        @fragment
        fn plane_main (input : VertexOutput) -> @location(0) vec4<f32> {
            
            let coords : vec2<f32> = (input.uv * distance) - distance / 2.0;
            

            if (modBy(coords.x,1.0) < 0.05 || modBy(coords.y,1.0) < 0.05) {
                
                 
                return vec4<f32>(1.5,1.5,1.5,1.0) * vec4<f32>(input.uv,0.0,1.0);
            }
            

            return vec4<f32>(1.0,1.0,1.0,0.0);


        }


    `;


    public render(viewport: Viewport): void {

        const device = App.getRenderDevice();

        const colorTexture: GPUTexture = this.renderer.getTexture("color");
        const cameraBuffer: GPUBuffer = this.renderer.getBuffer("camera");
        const depthTexture: GPUTexture = this.renderer.getTexture("depth");


        const orbitBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            label: "orbit-center"
        });

        App.getWebGPU().printBufferContent(cameraBuffer);

        device.queue.writeBuffer(orbitBuffer, 0, new Float32Array([10]));    /** @todo actually get the correct data  */



        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }
            ]
        })


        const bindgroup: GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: cameraBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: orbitBuffer }
                }
            ]
        });

        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        });


        const shaderModule = device.createShaderModule({ code: this.shader });

        const pipeline: GPURenderPipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "fullscreen_vertex_shader"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "plane_main",
                targets: [
                    {
                        format: "rgba8unorm",
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add',
                            },
                            alpha: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add',
                            },
                        }
                    }
                ]
            },
            layout: pipelineLayout,
            depthStencil: {
                format: "depth24plus-stencil8",
                depthWriteEnabled: true, // Enable writing to the depth buffer
                depthCompare: "less", // Enable depth testing with "less" comparison
            }
        });

        const passDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    storeOp: "store",
                    loadOp: "load",
                    view: colorTexture.createView()
                }
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: "load",
                depthStoreOp: "store",
                stencilLoadOp: "load",
                stencilStoreOp: "store",
                depthClearValue: 1.0,
                stencilClearValue: 1.0
            },
            label: "plane pass"
        }


        const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();

        const pass: GPURenderPassEncoder = commandEncoder.beginRenderPass(passDescriptor);


        pass.setBindGroup(0,bindgroup);
        pass.setPipeline(pipeline);
        pass.draw(6,1,0,0);

        pass.end()

        device.queue.submit([commandEncoder.finish()]);










    }




}