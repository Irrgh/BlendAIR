
struct Camera {
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    width: u32,
    height: u32   
}


struct VertexIn {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @builtin(instance_index) instanceId: u32
}



struct VertexOut {
      @builtin(position) position: vec4<f32>,
      @location(0) fragPosition: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
      @location(3) @interpolate(flat) objectId: u32,
}


@binding(0) @group(0) var<uniform> camera : Camera;
@binding(1) @group(0) var<storage,read> modelTransforms : array<mat4x4<f32>>;
@binding(2) @group(0) var<storage,read> objectIndex: array<u32>;

    
@vertex
fn vertex_main(input : VertexIn, @builtin(vertex_index) vert : u32) -> VertexOut {

    let objectId : u32 = objectIndex[input.instanceId];


    var modelTransform: mat4x4<f32> = modelTransforms[objectId];
    var output: VertexOut;
    output.position = camera.proj * camera.view * modelTransform * vec4<f32>(input.position, 1.0f);
    output.fragPosition = input.position;
    output.normal = (modelTransform * vec4<f32>(input.normal, 0.0f)).xyz;
    //output.normal.x = f32(vert);
    output.uv = input.uv;
    output.objectId = objectId + 1u;
    return output;
}

struct FragmentOut {
    @location(0) color : vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) object: u32,
}




@fragment
fn fragment_object(fragData: VertexOut) -> @location(0) u32 {

    return fragData.objectId;
}



fn edgeFactor(bary: vec3f) -> f32 {
  let d = fwidth(bary);
  let a3 = smoothstep(vec3f(0.0), d * 2.0, bary);
  return min(min(a3.x, a3.y), a3.z);
}
    
@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOut {
    let normal = normalize(fragData.normal);

    var color : vec3f;


    color = abs(normalize(dpdx(fragData.fragPosition) + dpdy(fragData.fragPosition)));

    color = color * ((dot(normal, normalize(vec3<f32>(1.0, 2.0, 3.0))) + 1.0) / 2.0);

    //let x : f32 = ((f32(fragData.objectId + 5u) % 16.0) / 16.0 * 0.7) + 0.3;
    //let y : f32 = ((f32(fragData.objectId + 4u) % 11.0) / 11.0 * 0.7) + 0.3;
    //let z : f32 = ((f32(fragData.objectId + 7u) % 13.0) / 13.0 * 0.7) + 0.3;
    //color = vec3f(x,y,z);


    var output : FragmentOut;
    output.color = vec4<f32>(color,1.0);
    output.normal = vec4<f32>(normal,1.0);
    output.object = fragData.objectId;

    return output;
}