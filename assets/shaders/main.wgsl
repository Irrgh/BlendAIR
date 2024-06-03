
struct Camera {
    view: mat4x4<f32>,
    proj: mat4x4<f32>   
}

struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) fragPosition: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>
}





@binding(0) @group(0) var<uniform> camera : Camera;

@binding(1) @group(0) var<storage,read> modelTransforms : array<mat4x4<f32>>;


    
@vertex
fn vertex_main(@location(0) position: vec3<f32>,
               @location(1) normal: vec3<f32>,
               @location(2) uv : vec2<f32>,
               @builtin(instance_index) instanceId : u32 ) -> VertexOut {
    var modelTransform : mat4x4<f32> = modelTransforms[instanceId];
    var output: VertexOut;
    output.position = camera.proj * camera.view * modelTransform * vec4<f32>(position,1.0f);
    output.fragPosition = output.position.xyz;
    output.normal = (modelTransform * vec4<f32>(normal,0.0f)).xyz;
    output.uv = uv;
    return output;
}
    
@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
    var normal = normalize(fragData.normal);
    var pos = fragData.fragPosition;
    let viewMatrix = camera.view;

    let forward: vec3<f32> = vec3<f32>(-viewMatrix[0][2], -viewMatrix[1][2], -viewMatrix[2][2]);


    var color = normal * dot(normal,normalize(vec3<f32>(1.0,2.0,3.0)));
    //var color = vec3<f32>(1.0,1.0,1.0) / pos.z;

    return vec4<f32>(color,1.0);
}