
struct Camera {
    view: mat4x4<f32>,
    proj: mat4x4<f32>   
}

struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) normal: vec4<f32>,
      @location(1) uv: vec2<f32>
}


@binding(0) @group(0) var<uniform> camera : Camera;

@binding(1) @group(0) var<storage,read> modelTransforms : array<mat4x4<f32>>;
    
@vertex
fn vertex_main(@location(0) position: vec3<f32>,
               @location(1) normal: vec3<f32>,
               @location(2) uv : vec2<f32>,
               @builtin(instance_index) instanceId : u32 ) -> VertexOut {
    var output: VertexOut;
    output.position = camera.proj * camera.view * modelTransforms[instanceId] * vec4<f32>(position,1.0f);
    output.normal = modelTransforms[instanceId] * vec4<f32>(normal,0.0f);
    output.uv = uv;
    return output;
}
    
@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
    return vec4f(fragData.normal.rgb,1.0);
}