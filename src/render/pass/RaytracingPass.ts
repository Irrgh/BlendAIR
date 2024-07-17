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


        struct Camera {
            view: mat4x4<f32>,
            proj: mat4x4<f32>,
            width: u32,
            height: u32   
        }

        struct Ray {
            origin: vec3<f32>,
            dir: vec3<f32>
        }

        struct Sphere {
            center: vec3<f32>,
            radius: f32,
        }

        struct RayHitInfo {
            dist : f32,
            normal : vec3<f32>,
        }


        fn intersectRaySphere(ray : Ray, sphere: Sphere) -> f32 {
            // Vector from sphere center to ray origin
            let oc: vec3<f32> = ray.origin - sphere.center;
        
            // Coefficients for the quadratic equation
            let a: f32 = dot(ray.dir,ray.dir);
            let b: f32 = 2.0 * dot(oc, ray.dir);
            let c: f32 = dot(oc, oc) - sphere.radius * sphere.radius;
        
            // Discriminant of the quadratic equation
            let discriminant: f32 = b * b - 4.0 * a * c;
        
            if (discriminant < 0.0) {
                return -1.0; // Return -1.0 to indicate no intersection
            }
        
            // Calculate the two possible solutions
            let t1: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
            let t2: f32 = (-b + sqrt(discriminant)) / (2.0 * a);

        
            // Return the smallest positive t value (the nearest intersection)
            if (t1 > 0.0 && t2 > 0.0) {
                return min(t1, t2);
            } else if (t1 > 0.0) {
                return t1;
            } else if (t2 > 0.0) {
                return t2;
            } else {
                return -1.0; // Both t values are negative, so no intersection
            }
        }
        

        fn normalizeDepth(depth: f32, near: f32, far: f32) -> f32 {
            return (depth - near) / (far - near);
        }

        @binding(7) @group(0) var depthTexture : texture_storage_2d<r32float,write>;
        @binding(5) @group(0) var colorTexture : texture_storage_2d<rgba8unorm,write>;
        @binding(0) @group(0) var<uniform> camera : Camera;


        @compute @workgroup_size(${this.workgroupsize},${this.workgroupsize})
        fn raytrace_main (@builtin(global_invocation_id) global_id: vec3<u32>) {

            let x = global_id.x;
            let y = global_id.y;
            let dim = textureDimensions(colorTexture);

            if (x >= dim.x || y >= dim.y) {
                return;
            }

            let right = vec3<f32>(-camera.view[0][0],-camera.view[0][1],-camera.view[0][2]);
            let up = vec3<f32>(-camera.view[1][0],-camera.view[1][1],-camera.view[1][2]);
            let forward = vec3<f32>(-camera.view[2][0],-camera.view[2][1],-camera.view[2][2]);
            let pos = vec3<f32>(-camera.view[3][0],-camera.view[3][1],-camera.view[3][2]);
            let uv = vec2<f32>(f32(x) / f32(camera.width), (f32(y) / f32(camera.height))); 

            let m10 = camera.proj[2][2];
            let m14 = camera.proj[2][3];

            let near = m14 / (m10 - 1);
            let far = m14 / (m10 + 1);

            let s1 = Sphere(vec3<f32>(0.0,0.0,4.0),1.3);

            var rayTarget = vec3<f32>((uv) * 2.0 - 1.0, 1.0);
            //var rayTarget = pos + forward + (2.0 * uv.x - 1.0) * right * (f32(dim.x)/f32(dim.y)) + (2.0 * uv.y - 1.0) * up ;

            var rayPos = vec3<f32>(0.0,0.0,0.0);

            let rayDir = normalize(rayTarget - pos);
            let ray = Ray(pos,rayDir);

            let intersection = intersectRaySphere(ray,s1);

            if (intersection < 0.0) {
                textureStore(colorTexture, vec2<u32>(x,y) ,vec4<f32>(0.0,0.0,0.0,1.0));
                textureStore(depthTexture, vec2<u32>(x,y), vec4<f32>(1.0,0.0,0.0,1.0));
            } else {
                textureStore(colorTexture, vec2<u32>(x,y), vec4<f32>(intersection,0.0,0.0,1.0));
                textureStore(depthTexture, vec2<u32>(x,y), vec4<f32>(normalizeDepth(intersection,near,far),0.0,0.0,1.0));
            }
            
        }

    
    `


    public render(viewport: Viewport): void {

        const cameraBuffer = this.renderer.getBuffer("camera");
        //const vertexBuffer = this.renderer.getBuffer("vertex");
        //const indexBuffer = this.renderer.getBuffer("index");
        //const materialBuffer = this.renderer.getBuffer("material");
        //const objectParameterBuffer = this.renderer.getBuffer("object-parameters"); // basically like drawParameters from TrianglePass


        const colorTexture = this.renderer.getTexture("color");
        //const normalTexture = this.renderer.getTexture("normal");
        const depthTexture = this.renderer.getTexture("compute-depth");


        const device = App.getRenderDevice();


        const bindgroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                },
                // {
                //    binding: 1,
                //    visibility: GPUShaderStage.COMPUTE,
                //    buffer: { type: "read-only-storage" }
                //}, {
                //    binding: 2,
                //    visibility: GPUShaderStage.COMPUTE,
                //    buffer: { type: "read-only-storage" }
                //}, {
                //    binding: 3,
                //    visibility: GPUShaderStage.COMPUTE,
                //    buffer: { type: "read-only-storage" }
                //}, {
                //    binding: 4,
                //    visibility: GPUShaderStage.COMPUTE,
                //    buffer: { type: "read-only-storage" }
                //},
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "write-only",
                        format: "rgba8unorm"
                    }
                },
                // {
                //    binding: 6,
                //    visibility: GPUShaderStage.COMPUTE,
                //    storageTexture: {
                //        access: "write-only",
                //        format: "rgba8unorm"
                //    }
                //},
                {
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
                },
                // {
                //    binding: 1,
                //    resource: { buffer: vertexBuffer }
                //}, {
                //    binding: 2,
                //    resource: { buffer: indexBuffer }
                //}, {
                //    binding: 3,
                //    resource: { buffer: objectParameterBuffer }
                //}, {
                //    binding: 4,
                //    resource: { buffer: materialBuffer }
                //
                //},
                {
                    binding: 5,
                    resource: colorTexture.createView()
                },
                // {
                //    binding: 6,
                //    resource: normalTexture.createView()
                //},
                {
                    binding: 7,
                    resource: depthTexture.createView()
                }
            ]
        });

        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindgroupLayout]
        })


        const pipeline: GPUComputePipeline = device.createComputePipeline({
            compute: {
                module: device.createShaderModule({ code: this.shader }),
                entryPoint: "raytrace_main"
            },
            layout: pipelineLayout
        })

        const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();

        const descriptor: GPUComputePassDescriptor = {};

        App.getWebGPU().attachTimestamps(descriptor);


        const computePass: GPUComputePassEncoder = commandEncoder.beginComputePass(descriptor);

        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindgroup);

        computePass.dispatchWorkgroups(
            Math.ceil(colorTexture.width / this.workgroupsize),
            Math.ceil(colorTexture.height / this.workgroupsize),
        );

        computePass.end();

        App.getWebGPU().prepareTimestampsResolution(descriptor, commandEncoder);



        device.queue.submit([commandEncoder.finish()]);

        App.getWebGPU().resolveTimestamp(descriptor).then(result => {
            console.log(`Raytracing took ${result / 1000} µs`);
        }).catch(error => {
            console.error('Failed to resolve timestamps:', error);
        });



    }
}