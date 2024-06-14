import { Viewport } from "../engine/Viewport";
import { Renderer } from "./Renderer";
import { RenderPass } from "./RenderPass";
import { WebGPU } from '../engine/WebGPU';
import { App } from "../app";

import selectionOutlineKernel from "../../assets/shaders/selectionOutline.wgsl"



export class SelectionOutlinePass implements RenderPass {

    constructor(primaryColor: GPUColor, secondaryColor: GPUColor) {
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
    }


    private primaryColor: GPUColor;
    private secondaryColor: GPUColor;



    inputResources(): PassResource[] {
        throw new Error("Method not implemented.");
    }
    outputResources(): PassResource[] {
        throw new Error("Method not implemented.");
    }

    render(renderer: Renderer): void {

        const device = App.getRenderDevice();


        const colorTexture: GPUTexture = renderer.getTexture("color");
        const depthTexture: GPUTexture = renderer.getTexture("depth");
        const objectIndexTexture: GPUTexture = renderer.getTexture("object-index");









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
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts:[bindGroupLayout]
        });

        const pipeline = device.createComputePipeline({
            compute: {
                module:device.createShaderModule({
                    code: selectionOutlineKernel 
                })
            },
            layout: pipelineLayout
        });















    }

}