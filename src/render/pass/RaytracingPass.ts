import { App } from "../../app";
import { Viewport } from "../../engine/Viewport";
import { Renderer } from "../Renderer";
import { OldRenderPass } from "./OldRenderPass";
import { vec3 } from 'gl-matrix';

export class RaytracingPass extends OldRenderPass {

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
    private maxBounces = 4;



    private shader = /* wgsl */ `


        struct SceneInfo {
            cameraForward:vec3<f32>,
            near:f32,  
            cameraUp:vec3<f32>,
            far:f32,
            cameraRight:vec3<f32>,
            maxBounces:u32,
            cameraPos:vec3<f32>,
            proj:mat4x4<f32>,
            view:mat4x4<f32>,
        }

        struct Ray {
            origin: vec3<f32>,
            dir: vec3<f32>
        }

        struct Sphere {
            center: vec3<f32>,
            radius: f32,
            material:Material
        }

        struct Triangle {
            v0: vec3<f32>,
            v1: vec3<f32>,
            v2: vec3<f32>,
            n0: vec3<f32>,
            n1: vec3<f32>,
            n2: vec3<f32>,
            material: Material,
        }

        struct Material {
            color: vec3<f32>,
            emission: f32,
        }



        struct PointLight {
            center: vec3<f32>,
            radius: f32,
            color: vec3<f32>,
            intensity: f32,
        }





        struct RayHitInfo {
            dist : f32,
            normal : vec3<f32>,
            material: Material,    
        }

        struct PixelData {
            color: vec3<f32>,
            depth: f32,
        }



        fn intersectRayTriangle(ray: Ray, tri: Triangle) -> RayHitInfo {

            let ab = tri.v1 - tri.v0;
            let ac = tri.v2 - tri.v0;

            let p = cross(ray.dir, ac);
            let det = dot(ab, p);

            
            if (abs(det) < 1e-8) {    // may need some epsilon
                return RayHitInfo(-1.0,vec3<f32>(0.0,0.0,0.0),tri.material);
            }

            
            // Compute the inverse of the determinant
            let inv_det = 1.0 / det;

            // Compute u parameter
            let t = ray.origin - tri.v0;
            let u = dot(t, p) * inv_det;

            // Check if u is outside the triangle
            if (u < 0.0 || u > 1.0) {
                return RayHitInfo(-1.0,vec3<f32>(0.0,0.0,0.0),tri.material);
            }

            // Compute v parameter
            let q = cross(t, ab);
            let v = dot(ray.dir, q) * inv_det;

            // Check if v is outside the triangle
            if (v < 0.0 || u + v > 1.0) {
                return RayHitInfo(-1.0,vec3<f32>(0.0,0.0,0.0),tri.material);
            }

            // Compute the intersection distance
            let distance = dot(ac, q) * inv_det;
    
            // Check if the intersection is in the positive direction of the ray
            if (distance < 0.0) {
                return RayHitInfo(-1.0,vec3<f32>(0.0,0.0,0.0),tri.material);
            }

            var normal = normalize(cross(normalize(ab),normalize(ac)));

            // smooth shading
            if (true) {
                // Interpolate the normal using barycentric coordinates
                let w = 1.0 - u - v;
                normal = normalize(w * tri.n0 + u * tri.n1 + v * tri.n2);
            }


            // If all checks passed, return the distance
            return RayHitInfo(distance,normal,tri.material);
        }


        fn intersectRaySphere(ray : Ray, sphere: Sphere) -> RayHitInfo {
            // Vector from sphere center to ray origin
            let oc: vec3<f32> = ray.origin - sphere.center;
        
            // Coefficients for the quadratic equation
            let a: f32 = dot(ray.dir,ray.dir);
            let b: f32 = 2.0 * dot(oc, ray.dir);
            let c: f32 = dot(oc, oc) - sphere.radius * sphere.radius;
        
            // Discriminant of the quadratic equation
            let discriminant: f32 = b * b - 4.0 * a * c;
        
            if (discriminant < 0.0) {
                return RayHitInfo(-1.0,vec3<f32>(0.0,0.0,1.0),sphere.material);
            }
        
            // Calculate the two possible solutions
            let t1: f32 = (-b - sqrt(discriminant)) / (2.0 * a);
            let t2: f32 = (-b + sqrt(discriminant)) / (2.0 * a);

            // Return the smallest positive t value (the nearest intersection)
            if (t1 > 0.0 && t2 > 0.0) {
                let normal = normalize(ray.origin + ray.dir * min(t1, t2) - sphere.center);
                return RayHitInfo(min(t1,t2),normal,sphere.material);
            } else if (t1 > 0.0) {
                let normal = normalize( ray.origin + ray.dir * t1 - sphere.center);
                return RayHitInfo(t1,normal,sphere.material);
            } else if (t2 > 0.0) {
                let normal = normalize(ray.origin + ray.dir * t2 - sphere.center);
                return RayHitInfo(t2,normal,sphere.material);
            }

            return RayHitInfo(-1.0,vec3<f32>(0.0,0.0,1.0),sphere.material);  
        }
        
        fn getHitInfo (ray: Ray) -> PixelData {

            let materials = array<Material,4>(
                Material(vec3<f32>(1,0,0),1),
                Material(vec3<f32>(0,1,0),1),
                Material(vec3<f32>(0,0,1),1),
                Material(vec3<f32>(1,1,1),0),
            );

            let spheres = array<Sphere,3>(
                Sphere(vec3<f32>(4.0,0.0,0.0),0.5,materials[0]),
                Sphere(vec3<f32>(0.0,4.0,0.0),0.5,materials[1]),
                Sphere(vec3<f32>(0.0,0.0,4.0),0.5,materials[2]),
            );

            let tri : Triangle = Triangle(
                spheres[0].center,
                spheres[1].center,
                spheres[2].center,
                vec3<f32>(1,0,0),
                vec3<f32>(0,1,0),
                vec3<f32>(0,0,1),
                materials[3],
            );


            var hit : RayHitInfo;
            hit.dist = info.far;
            

            for (var i : u32 = 0; i < 3; i++) {
                let sphereIntersection = intersectRaySphere(ray,spheres[i]);
                if (hit.dist > sphereIntersection.dist && sphereIntersection.dist > 0) {
                    hit = sphereIntersection;
                }
            }
            let triIntersection = intersectRayTriangle(ray,tri);
            if (hit.dist > triIntersection.dist && triIntersection.dist > 0) {
                hit = triIntersection;
                hit.material.color = triIntersection.normal;
            }
            
            let transformedPos = info.proj * info.view * vec4<f32>(ray.origin + ray.dir * hit.dist,1);
            let depth = transformedPos.z / transformedPos.w;

            return PixelData(hit.material.color,depth);
        }



        @binding(7) @group(0) var depthTexture : texture_storage_2d<r32float,write>;
        @binding(5) @group(0) var colorTexture : texture_storage_2d<rgba8unorm,write>;
        @binding(0) @group(0) var<uniform> info : SceneInfo;


        @compute @workgroup_size(${this.workgroupsize},${this.workgroupsize})
        fn raytrace_main (@builtin(global_invocation_id) global_id: vec3<u32>) {

            let x = global_id.x;
            let y = global_id.y;
            let dim = textureDimensions(colorTexture);

            if (x >= dim.x || y >= dim.y) {
                return;
            }

            let right = info.cameraRight;
            let up = info.cameraUp;
            let forward = info.cameraForward;
            let pos = info.cameraPos;
            let ndc = vec2<f32>(
                2.0 * f32(x) / f32(dim.x) - 1.0,
                1.0 - (2.0 * f32(y)) / f32(dim.y)
            ); 

            
            let aspectRatio = f32(dim.x) / f32(dim.y);

            var rayTarget = forward + ndc.x * right * aspectRatio + ndc.y * up ;

            let rayDir = normalize(rayTarget);
            let ray = Ray(pos,rayDir);

            
            let hit = getHitInfo(ray);

            textureStore(colorTexture,vec2<u32>(x,y), vec4<f32>(hit.color,1.0));
            textureStore(depthTexture,vec2<u32>(x,y), vec4<f32>(hit.depth,0.0,0.0,1.0));
        }

    
    `

    private createSceneInfoBuffer(viewport: Viewport) {


        const sceneInfoValues = new ArrayBuffer(192);
        const sceneInfoViews = {
            cameraForward: new Float32Array(sceneInfoValues, 0, 3),
            near: new Float32Array(sceneInfoValues, 12, 1),
            cameraUp: new Float32Array(sceneInfoValues, 16, 3),
            far: new Float32Array(sceneInfoValues, 28, 1),
            cameraRight: new Float32Array(sceneInfoValues, 32, 3),
            maxBounces: new Uint32Array(sceneInfoValues, 44, 1),
            cameraPos: new Float32Array(sceneInfoValues, 48, 3),
            proj: new Float32Array(sceneInfoValues, 64, 16),
            view: new Float32Array(sceneInfoValues, 128, 16),
        };

        const up = viewport.camera.getUp();
        const forward = viewport.camera.getForward();
        const right = viewport.camera.getRight();

        sceneInfoViews.cameraForward.set(forward);
        sceneInfoViews.cameraUp.set(up);
        sceneInfoViews.cameraRight.set(right);
        sceneInfoViews.cameraPos.set(viewport.camera.getPosition());
        sceneInfoViews.near.set([0.1]);         // testing values
        sceneInfoViews.far.set([100]);
        sceneInfoViews.maxBounces.set([this.maxBounces]);
        sceneInfoViews.proj.set(viewport.camera.getProjectionMatrix());
        sceneInfoViews.view.set(viewport.camera.getViewMatrix());

        const sceneInfoBuffer = this.renderer.createBuffer({
            size: sceneInfoValues.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        }, "scene-info");

        App.getRenderDevice().queue.writeBuffer(sceneInfoBuffer, 0, sceneInfoValues);

    }





    public render(viewport: Viewport): void {

        this.createSceneInfoBuffer(viewport);

        const sceneInfoBuffer = this.renderer.getBuffer("scene-info");
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
                    resource: { buffer: sceneInfoBuffer }
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

        const computePass: GPUComputePassEncoder = commandEncoder.beginComputePass(descriptor);

        computePass.setPipeline(pipeline);
        computePass.setBindGroup(0, bindgroup);

        computePass.dispatchWorkgroups(
            Math.ceil(colorTexture.width / this.workgroupsize),
            Math.ceil(colorTexture.height / this.workgroupsize),
        );

        computePass.end();

        
        device.queue.submit([commandEncoder.finish()]);

        
    }
}