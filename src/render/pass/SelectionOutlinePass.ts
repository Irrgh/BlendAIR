import { Viewport } from '../../engine/Viewport';
import { Renderer } from '../Renderer';
import { RenderPass } from "./RenderPass";
import { WebGPU } from '../../engine/WebGPU';
import { App } from "../../app";

import selectionOutlineKernel from "../../assets/shaders/selectionOutline.wgsl"
import { Entity } from '../../entity/Entity';
import { Scene } from '../../engine/Scene';



export class SelectionOutlinePass extends RenderPass {

    constructor(primaryColor: GPUColor, secondaryColor: GPUColor) {

        const input: PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
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

        super(input, output);
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;

    }


    private primaryColor: GPUColor;
    private secondaryColor: GPUColor;

   

    public render(renderer: Renderer, viewport: Viewport): void {

        const device = App.getRenderDevice();
        const scene = viewport.scene;


        const colorTexture: GPUTexture = renderer.getTexture("color");
        const depthTexture: GPUTexture = renderer.getTexture("depth");
        const objectIndexTexture: GPUTexture = renderer.getTexture("object-index");
        const combinedTexture: GPUTexture = renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
            label: "combined"
        }, "combined");

        const selectionTexture: GPUTexture = renderer.createTexture({
            size: { width: viewport.width, height: viewport.height },
            format: 'rgba8unorm',
            usage: 0
        }, "selection");




        // defining Selections Buffer

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
        selectionsViews.indecies.set(selections.map((entity:Entity) => {return scene.getId(entity)}));


        const selectionBuffer: GPUBuffer = renderer.createBuffer({
            size: selectionsValues.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }, "selection");

        /**  defining resolution Buffer  @todo probably move this into camera data buffer as a common buffer */

        const resolutionValues = new ArrayBuffer(8);
        const resolutionViews = {
            width: new Uint32Array(resolutionValues,0,1),
            height: new Uint32Array(resolutionValues,4,1)
        }
        resolutionViews.width.set([viewport.width]);
        resolutionViews.height.set([viewport.height]);




        const resolutionBuffer:GPUBuffer = renderer.createBuffer({
            size: 2*4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        },"resolution");

        device.queue.writeBuffer(selectionBuffer,0,selectionsValues);
        device.queue.writeBuffer(resolutionBuffer,0,resolutionValues);







        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {}
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {}
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {}
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform"
                    }
                }

            ]
        });



        const bindGroup: GPUBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: colorTexture.createView()
                }, {
                    binding: 1,
                    resource: depthTexture.createView()
                }, {
                    binding: 2,
                    resource: objectIndexTexture.createView()
                }, {
                    binding: 3,
                    resource: combinedTexture.createView()
                }, {
                    binding: 4,
                    resource:  selectionTexture.createView()
                }, {
                    binding: 5,
                    resource: {buffer: selectionBuffer}
                }, {
                    binding: 6,
                    resource: {buffer: resolutionBuffer}
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        const pipeline = device.createComputePipeline({
            compute: {
                module: device.createShaderModule({
                    code: selectionOutlineKernel
                })
            },
            layout: pipelineLayout
        });


        const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();

        const computePass: GPUComputePassEncoder = commandEncoder.beginComputePass();

        computePass.setBindGroup(1, bindGroup);
        computePass.setPipeline(pipeline);
        computePass.dispatchWorkgroups(viewport.width, viewport.height);

        computePass.end();

        device.queue.submit([commandEncoder.finish()]);



    }

}