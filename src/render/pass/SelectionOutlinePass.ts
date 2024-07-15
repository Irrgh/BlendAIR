import { Viewport } from '../../engine/Viewport';
import { Renderer } from '../Renderer';
import { RenderPass } from "./RenderPass";
import { WebGPU } from '../../engine/WebGPU';
import { App } from "../../app";
import { Entity } from '../../entity/Entity';
import { Scene } from '../../engine/Scene';
import fullQuadShader from "../../../assets/shaders/fullQuadShader.wgsl";



export class SelectionOutlinePass extends RenderPass {

    constructor(renderer: Renderer, primaryColor: GPUColor, secondaryColor: GPUColor) {

        const input: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "render-depth",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "texture"
            }
        ]

        const output: PassResource[] = [
            {
                label: "combined",
                resource: "texture"
            }, {
                label: "selection",
                resource: "texture"
            }

        ]

        super(renderer, input, output);
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;

    }


    private primaryColor: GPUColor;
    private secondaryColor: GPUColor;

    private shader: string = /*wgsl */ `
        ${fullQuadShader}

        struct Camera {
            view:mat4x4<f32>,
            proj:mat4x4<f32>,
            width:u32,
            height:u32,
        }

        struct Selections {
            primaryColor: vec4<f32>,
            secondaryColor: vec4<f32>,
            count: u32,                  // all selections including primary
            primary: u32,                // index of primary in indecies
            indecies: array<u32>         // all selections including primary
        }

        struct FragmentOut {
            @location(0) color: vec4<f32>,
            @location(1) selection: vec4<f32>
        }

        // i feel like inverting it is unintuitive
        fn fresnel(normal:vec3<f32>, view:vec3<f32>, exponent:f32) -> f32 {
            return pow(1.0 - dot(normal,view), exponent);
        }

        fn linearizeDepth(depth: f32, near: f32, far: f32) -> f32 {
            return (2.0 * near * far) / (far + near - depth * (far - near));
        }

        fn chooseObjectIndex(r : u32,uv:vec2<f32>, delta: vec2<f32>) -> u32 {
            let x = u32(uv.x * f32(camera.width));
            let y = u32(uv.y * f32(camera.height));

            if (abs(delta.x) >= abs(delta.y)) {
                if (delta.x <= 0) { 
                    return textureLoad(objectTexture,vec2<u32>(x,y),0).r;
                } else {
                    return textureLoad(objectTexture,vec2<u32>(x+r,y+r),0).r;
                }
            } else {
                if (delta.y <= 0) {
                    return textureLoad(objectTexture,vec2<u32>(x+r,y),0).r;
                } else {
                    return textureLoad(objectTexture,vec2<u32>(x,y+r),0).r;
                }
            }
        }


        fn robertsCross(radius : f32, texture : texture_depth_2d, coords : vec2<f32>) -> vec2<f32> {

            let m10 = camera.proj[2][2];
            let m14 = camera.proj[2][3];

            let near = m14 / (m10 - 1);
            let far = m14 / (m10 + 1);

            let depth = textureSample(texture,textureSampler,coords);

            let x : f32 = radius / (f32(camera.width));
            let y : f32 = radius / (f32(camera.height));

            var samples = array<f32,4>(
                linearizeDepth(depth,near,far),
                linearizeDepth(textureSample(texture,textureSampler,coords + vec2<f32>(0,y)),near,far),
                linearizeDepth(textureSample(texture,textureSampler,coords + vec2<f32>(x,0)),near,far),
                linearizeDepth(textureSample(texture,textureSampler,coords + vec2<f32>(x,y)),near,far),
            );

            return vec2<f32>((samples[0] - samples[3]), (samples[2] - samples[1]));
        }

        fn sumDerivatives (delta : vec2<f32>) -> f32 {
            return abs(delta.x) + abs(delta.y);
        }

        fn isSelected(id:u32) -> bool {
            for (var i : u32 = 0; i < selections.count; i++) {
                if (id == selections.indecies[i]) {
                    return true;
                }
            }
            return false;
        }

        
        @binding(0) @group(0) var depthTexture : texture_depth_2d;
        @binding(1) @group(0) var objectTexture : texture_2d<u32>;
        @binding(2) @group(0) var normalTexture : texture_2d<f32>;
        @binding(3) @group(0) var colorTexture : texture_2d<f32>;  
        @binding(4) @group(0) var<storage,read> selections : Selections;
        @binding(5) @group(0) var<uniform> camera : Camera;
        @binding(6) @group(0) var textureSampler : sampler;

        @fragment
        fn selection_main(input : VertexOutput) -> FragmentOut {

            let view = vec3<f32>(-camera.view[0][2],-camera.view[1][2],-camera.view[2][2]);
            let normal = textureSample(normalTexture,textureSampler,input.uv);
            let color = textureSample(colorTexture,textureSampler,input.uv);




            var out : FragmentOut;
            //out.color = vec4<f32>(input.uv,0.0,1.0);
            let delta : vec2<f32> = robertsCross(1.5,depthTexture,input.uv);
            let gradient : f32 = sumDerivatives(delta);
            let objectId : u32 = chooseObjectIndex(u32(1.5),input.uv,delta);
            let selected = isSelected(objectId);

            let fresnel = fresnel(normal.xyz,view,1.0);
            var outline = gradient * fresnel;


            if (outline < 0.85 || !selected) { 
                out.color = color;
            } else {
                if (objectId == selections.primary) {
                    //if (selections.primary != 0) {
                        out.color = selections.primaryColor;
                    //} 
                } else {
                    out.color = selections.secondaryColor;
                }
            }


            out.selection = vec4<f32>(outline,outline,outline,1.0);
        
            return out;
         
        }
    `;



    private createSelectionBuffer(viewport: Viewport) {

        const scene = viewport.scene;

        const selections = Array.from(scene.selections);
        const selectionsValues = new ArrayBuffer(48 + selections.length * 4);
        const selectionsViews = {
            primaryColor: new Float32Array(selectionsValues, 0, 4),
            secondaryColor: new Float32Array(selectionsValues, 16, 4),
            count: new Uint32Array(selectionsValues, 32, 1),
            primary: new Uint32Array(selectionsValues, 36, 1),
            indecies: new Uint32Array(selectionsValues, 40, selections.length + 2),
        };

        selectionsViews.primaryColor.set(Object.values(this.primaryColor));
        selectionsViews.secondaryColor.set(Object.values(this.secondaryColor));
        selectionsViews.count.set([selections.length]);
        selectionsViews.primary.set([scene.primarySelection ? scene.getId(scene.primarySelection) : 0]);   // Object index 0 in ENVIRONMENT 
        selectionsViews.indecies.set(selections.map((entity: Entity) => { return scene.getId(entity) }));

        const selectionBuffer: GPUBuffer = this.renderer.createBuffer({
            size: selectionsValues.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }, "selection");


        App.getRenderDevice().queue.writeBuffer(selectionBuffer, 0, selectionsValues);
    }




    public render(viewport: Viewport): void {

        this.createSelectionBuffer(viewport);




        const device = App.getRenderDevice();
        const scene = viewport.scene;


        const colorTexture: GPUTexture = this.renderer.getTexture("color");

        const colorInputTexture: GPUTexture = device.createTexture({
            size: {width:viewport.width,height:viewport.height},
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        });


        const depthTexture: GPUTexture = this.renderer.getTexture("render-depth");
        const normalTexture: GPUTexture = this.renderer.getTexture("normal");
        const objectIndexTexture: GPUTexture = this.renderer.getTexture("object-index");

        const selectionTexture: GPUTexture = this.renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        }, "selection");

        const selectionBuffer = this.renderer.getBuffer("selection");



        /**  defining resolution Buffer  @todo probably move this into camera data buffer as a common buffer */

        const cameraUniformBuffer: GPUBuffer = this.renderer.getBuffer("camera");

        const sampler = device.createSampler({
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear"
        });




        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "depth" }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "uint" }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }, {
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 5,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }, {
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }

            ]
        });



        const bindGroup: GPUBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: depthTexture.createView({ aspect: "depth-only" })
                }, {
                    binding: 1,
                    resource: objectIndexTexture.createView()
                }, {
                    binding: 2,
                    resource: normalTexture.createView()
                }, {
                    binding: 3,
                    resource: colorInputTexture.createView()
                }, {
                    binding: 4,
                    resource: { buffer: selectionBuffer }
                }, {
                    binding: 5,
                    resource: { buffer: cameraUniformBuffer }
                }, {
                    binding: 6,
                    resource: sampler
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        const shaderModule = device.createShaderModule({
            code: this.shader
        });

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: colorTexture.createView(),
                    storeOp: "store",
                    loadOp: "clear"
                }, {
                    view: selectionTexture.createView(),
                    storeOp: "store",
                    loadOp: "clear"
                }
            ]
        }



        const pipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "fullscreen_vertex_shader"
            },
            fragment: {
                module: shaderModule,
                entryPoint: "selection_main",
                targets: [
                    { format: "rgba8unorm" },
                    { format: "rgba8unorm" }
                ]
            },
            layout: pipelineLayout
        });


        const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();

        commandEncoder.copyTextureToTexture({texture:colorTexture},{texture:colorInputTexture},{width:viewport.width,height:viewport.height});

        const pass: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(pipeline);
        pass.draw(6, 1, 0, 0);



        pass.end();

        device.queue.submit([commandEncoder.finish()]);



    }

}