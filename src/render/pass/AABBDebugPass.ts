import { Viewport } from '../../engine/Viewport';
import { Renderer } from "../Renderer";
import { OldRenderPass } from "./OldRenderPass";
import { Scene } from '../../engine/Scene';
import { Entity } from '../../entity/Entity';

export class AABBDebugPass extends OldRenderPass {
    
    constructor (renderer:Renderer) {

        const input : PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
                resource: "texture"
            }, {
                label:"normal",
                resource:"texture"
            }
        ];

        const output : PassResource[] = [
            {
                label: "color",
                resource: "texture"
            }, {
                label: "depth",
                resource: "texture"
            }, {
                label:"normal",
                resource:"texture"
            }
        ];

        super(renderer,input,output);
    }
    
    /**
     * The color functions should probably go into a util file for snippets at some point
     */


    private shader : string = /* wgsl */ `
    
        fn hsvToRgb (hsv : vec3<f32>) -> vec3<f32> {
            let hue = hsv.x;
            let saturation = hsv.x;
            let value = hsv.z;
            
            let hIndex : u32 = floor(hue / 60.0);
            let f : f32 = (hue / 60.0 - hIndex);

            let p : f32 = value * (1.0 - saturation);
            let q : f32 = value * (1.0 - saturation * f);
            let t : f32 = value * (1.0 - saturation * (1.0 - f));

            let array = array<vec3<f32>,5>(
                vec3<f32>(value,t,q),
                vec3<f32>(q,value,p),
                vec3<f32>(p,value,t),
                vec3<f32>(t,p,value),
                vec3<f32>(value,p,q),
            );

            return saturate(array[hIndex]);
        }

        fn rgbToHsv (rgb: vec3<f32>) {

            let max : f32 = max(max(rgb.r,rgb.g),rgb.b);
            let min : f32 = min(min(rgb.r,rgb.g),rgb.b);

            var h : f32 = 0;
            var s : f32 = 0;

            if (max != min) {
                s = (max - min) / max;

                if (max == rgb.r) {
                    h = 60 * (0 + (rgb.g - rgb.b) / (max - min));
                } else if (max == rgb.g) {
                    h = 60 * (2 + (rgb.b - rgb.r) / (max - min));
                } else if (max == rgb.b) {
                    h = 60 * (4 + (rgb.r - rgb.g) / (max - min));
                }

                if (h < 0) {
                    h += 360;
                }

            }
            return vec3<f32>(h,s,max);
        }
    
        struct Camera {
            view: mat4x4<f32>,
            proj: mat4x4<f32>,
            width: u32,
            height: u32   
        }

        struct Metadata {
            nodesCount: u32,
            offset: u32
        }



        
        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) angle : u32;
        }


        
        @binding(0) @group(0) var<uniform> camera : Camera;
        @binding(1) @group(0) var<storage,read> bvhTransforms : array<mat4x4<f32>>; // all bvh node transforms
        @binding(2) @group(0) var<storage,read> objectTransforms : array<mat4x4<f32>>; // transforms of actually entities

        @binding(0) @group(1) var<uniform> meta : Metadata;

             
        @vertex
        fn vertex_main(@location(0) position: vec3<f32>, @builtin(instance_index) instanceId: u32) -> VertexOutput {
        
            var modelTransform: mat4x4<f32> = bvhTransforms[instanceId+meta.offset];
            var out : VertexOutput
            out.position = camera.proj * camera.view  *modelTransform * vec4<f32>(input.position, 1.0f);
            out.depth = bvhDepth[instanceId];

            return out;
        }
        
        
        fn frag_main(input: VertexOutput) -> @location(0) vec4<f32> {

            let angle : f32 = 137.5 * f32(input.depth);
            let color : vec4<f32> = hsvToRgb(angle,1.0,1.0);

            return color;
        }


    
    
    
    `;
    
    private generateTransformBuffer(viewport:Viewport) {

        



        








    }



    public render(viewport: Viewport): void {
        
        









    }

}