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
            }, {
                label: "render-depth",
                resource: "texture"
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
    @binding(1) @group(0) var<uniform> dist : f32;
    
    @vertex
    fn plane_vertex(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
        // See the explanation above for how this works
    
        var positions = array<vec2<f32>, 6>(
            vec2<f32>(-1.0, -1.0), // 
            vec2<f32>( 1.0, -1.0), // 
            vec2<f32>(-1.0,  1.0), // 
            vec2<f32>(-1.0,  1.0), // 
            vec2<f32>( 1.0, -1.0), // 
            vec2<f32>( 1.0,  1.0)  // 
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
    
        


        let scale = mat4x4<f32>(
            vec4<f32>(dist, 0.0, 0.0, 0.0),
            vec4<f32>(0.0, dist, 0.0, 0.0),
            vec4<f32>(0.0, 0.0, dist, 0.0),
            vec4<f32>(0.0, 0.0, 0.0, 1.0)
        );


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
    
    fn PristineGrid(uv: vec2f, lineWidth: vec2f) -> f32 {
        let uvDDXY = vec4f(dpdx(uv), dpdy(uv));
        let uvDeriv = vec2f(length(uvDDXY.xz), length(uvDDXY.yw));
        let invertLine: vec2<bool> = lineWidth > vec2f(0.5);
        let targetWidth: vec2f = select(lineWidth, 1 - lineWidth, invertLine);
        let drawWidth: vec2f = clamp(targetWidth, uvDeriv, vec2f(0.5));
        let lineAA: vec2f = uvDeriv * 1.5;
        var gridUV: vec2f = abs(fract(uv) * 2.0 - 1.0);
        gridUV = select(1 - gridUV, gridUV, invertLine);
        var grid2: vec2f = smoothstep(drawWidth + lineAA, drawWidth - lineAA, gridUV);
        grid2 *= saturate(targetWidth / drawWidth);
        grid2 = mix(grid2, targetWidth, saturate(uvDeriv * 2.0 - 1.0));
        grid2 = select(grid2, 1.0 - grid2, invertLine);
        return mix(grid2.x, 1.0, grid2.y);
    }
    

    @fragment
    fn plane_fragment(input : VertexOutput) -> @location(0) vec4<f32> {
        
        let coords : vec2<f32> = (input.uv * dist) - dist / 2.0;
        
        let grid = PristineGrid(input.uv * 100, vec2f(0.03,0.03));
        let grid2 = PristineGrid(input.uv * 10, vec2f(0.003,0.003));

        let dx = saturate(distance(input.uv.x, 0.5)*1000);
        let dy = saturate(distance(input.uv.y, 0.5)*1000);

        let linecolor : vec4f = saturate(vec4<f32>(dy,dx,min(dx,dy),1.0));

        return mix(vec4f(0.0,0.0,0.0,0.0),vec4<f32>(1.0,1.0,1.0,1.0),saturate(grid+grid2) * linecolor);
    }


    `;


    public render(viewport: Viewport): void {

        const device = App.getRenderDevice();
        this.renderer.updateCameraData(viewport);

        const colorTexture: GPUTexture = this.renderer.getTexture("color");
        const cameraBuffer: GPUBuffer = this.renderer.getBuffer("camera");
        const depthTexture: GPUTexture = this.renderer.getTexture("render-depth");


        const orbitBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            label: "orbit-center"
        });


        device.queue.writeBuffer(orbitBuffer, 0, new Float32Array([100]));    /** @todo actually get the correct data  */



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
                entryPoint: "plane_vertex"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "plane_fragment",
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
                format: "depth32float",
                depthWriteEnabled: true, // Enable writing to the depth buffer
                depthCompare: "less", // Enable depth testing with "less" comparison
            }
        });

        const passDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    storeOp: "store",
                    loadOp: "load",
                    view: colorTexture.createView(),
                }
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: "load",
                depthStoreOp: "store",
                depthClearValue: 1.0,
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