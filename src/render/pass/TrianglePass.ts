import { Renderer } from "../Renderer";
import { RenderPass } from "./RenderPass";
import { Scene } from "../../engine/Scene";
import { Viewport } from '../../engine/Viewport';
import { App } from "../../app";
import { TriangleMesh } from "../../engine/TriangleMesh";
import { MeshInstance } from "../../entity/MeshInstance";
import { Entity } from "../../entity/Entity";
import { WebGPU } from "../../engine/WebGPU";
import shader from "../../../assets/shaders/main.wgsl";
import { ArrayStorage } from '../../util/ArrayStorage';

/**
 * The TrianglePass takes all TriangleMeshes of the {@link Scene.entities | Scene's entities} and renders them using
 */
export class TrianglePass extends RenderPass {

    private vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 32,
        attributes: TriangleMesh.attributes,
        stepMode: "vertex"
    }

    private depthStencilState: GPUDepthStencilState = {
        format: "depth32float",
        depthWriteEnabled: true, // Enable writing to the depth buffer
        depthCompare: "less", // Enable depth testing with "less" comparison
    };


    private outdated = true;




    constructor(renderer: Renderer) {
        const input: PassResource[] = [
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
                label: "render-depth",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "buffer"
            }
        ]

        const output: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "render-depth",
                resource: "texture"
            }, {
                label: "normal",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "texture"
            }
        ]

        super(renderer, input, output);

    }


    

    public render(viewport: Viewport): void {

        const device: GPUDevice = App.getRenderDevice();

        const colorTexture = this.renderer.getTexture("color");
        const depthTexture = this.renderer.getTexture("render-depth");
        const objectIndexTexture = this.renderer.getTexture("object-index");
        const normalTexture = this.renderer.getTexture("normal");

        const objectIndexBuffer = this.renderer.getBuffer("object-index");
        const cameraUniformBuffer = this.renderer.getBuffer("camera");
        const vertexBuffer = this.renderer.getBuffer("vertex");
        const normalBuffer = this.renderer.getBuffer("normal");
        const uvBuffer = this.renderer.getBuffer("uv");
        const indexBuffer = this.renderer.getBuffer("index");
        const transformBuffer = this.renderer.getBuffer("transform");

        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"      // camera
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"   // transform
                    }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"   // object index
                    }
                }
            ]
        });

        const bindgroup: GPUBindGroup = device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: cameraUniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: transformBuffer }
                }, {
                    binding: 2,
                    resource: { buffer: objectIndexBuffer }
                }
            ]
        })


        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: colorTexture.createView()
                }, {
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                    view: normalTexture.createView()
                }, {
                    loadOp: "clear",
                    storeOp: "store",
                    view: objectIndexTexture.createView()
                }
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: "clear",
                depthStoreOp: "store",
                depthClearValue: 1.0,
            },
            label: "triangle pass"
        }


        const shaderModule = device.createShaderModule({
            code: shader
        })


        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        });


        const renderPipeline: GPURenderPipeline = device.createRenderPipeline({
            vertex: {
                module: shaderModule,
                entryPoint: "vertex_main",
                buffers: [
                    {
                        arrayStride: 12, // vec3<f32>
                        attributes: [{
                            shaderLocation: 0,
                            offset: 0,
                            format: "float32x3"
                        }]
                    },
                    {
                        arrayStride: 12, // vec3<f32>
                        attributes: [{
                            shaderLocation: 1,
                            offset: 0,
                            format: "float32x3"
                        }]
                    },
                    {
                        arrayStride: 8, // vec2<f32>
                        attributes: [{
                            shaderLocation: 2,
                            offset: 0,
                            format: "float32x2"
                        }]
                    }

                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragment_main",
                targets: [
                    {
                        format: "rgba8unorm",
                    }, {
                        format: "rgba8unorm"
                    }, {
                        format: "r32uint"
                    }
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: pipelineLayout,
            depthStencil: this.depthStencilState,
            label: "triangle mesh rendering"
        });


        App.getWebGPU().attachTimestamps(renderPassDescriptor);

        const commandEncoder: GPUCommandEncoder = device.createCommandEncoder({ label: "trianglePass" });

        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);



        renderPass.pushDebugGroup("rendering triangles");
        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, bindgroup);

        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, normalBuffer);
        renderPass.setVertexBuffer(2, uvBuffer);

        renderPass.setIndexBuffer(indexBuffer, "uint32");

        const param = this.renderer.drawParameters;

        for (let i = 0; i < param.length; i += 5) {
            renderPass.drawIndexed(
                param[i],
                param[i + 1],
                param[i + 2],
                param[i + 3],
                param[i + 4]
            );
        }

        renderPass.popDebugGroup();
        renderPass.end()



        App.getWebGPU().prepareTimestampsResolution(renderPassDescriptor, commandEncoder);

        device.queue.submit([commandEncoder.finish()]);

        App.getWebGPU().resolveTimestamp(renderPassDescriptor).then(result => {
            //console.log(`Rendering took ${result/1000} µs`);
        }).catch(error => {
            console.error('Failed to resolve timestamps:', error);
        });


    }


}