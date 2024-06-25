//#include<common.wgsl>

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

struct VertexOutput {
    @builtin(position)
    position: vec4<f32>,
    @location(0)
    uv: vec2<f32>,
};


@binding(0) @group(1) var colorTexture : texture_storage_2d<rgba8unorm,read>;
@binding(1) @group(1) var depthTexture : texture_storage_2d<r32float,read>;
@binding(2) @group(1) var objectTexture : texture_storage_2d<r32uint,read>;
@binding(3) @group(1) var combinedTexture : texture_storage_2d<rgba8unorm,write>;
@binding(4) @group(1) var selectionTexture : texture_storage_2d<rgba8unorm,write>;  
@binding(5) @group(1) var<storage,read> selections : Selections;
@binding(6) @group(1) var<uniform> camera : Camera;


struct FragmentOut {
    color: vec4<f32>,
    selection: vec4<f32>
}




@fragment
fn fragment_main(input : VertexOutput) -> FragmentOut {
    
    var out : FragmentOut;
    out.color = vec4<f32>(input.uv,0.0,1.0);
    out.selection = vec4<f32>(0.0,0.0,0.0,1.0);

    return out;

    if x >= camera.width || y >= camera.height {
        return;
    }

    let objectIndex: u32 = textureLoad(objectTexture, vec2<u32>(x, y)).x;

    //for (var i = 0; i < i32(selections.count); i++) {

        //if selections.indecies[i] == objectIndex {

            let pixel = textureLoad(depthTexture, vec2<u32>(x, y)).x;
            let pixelRight = textureLoad(depthTexture, vec2<u32>(x + 1, y)).x;
            let pixelBottom = textureLoad(depthTexture, vec2<u32>(x, y + 1)).x;
            let pixelBottomRight = textureLoad(depthTexture, vec2<u32>(x + 1, y + 1)).x;

            let gx : f32 = pixel - pixelBottomRight;
            let gy : f32 = pixelRight - pixelBottom;

            let gradient = sqrt(gx * gx + gy * gy);

            let color : vec4<f32> = vec4<f32>(gradient,gradient,gradient,1.0);


            textureStore(selectionTexture, vec2<u32>(x, y), color);
            textureStore(colorTexture, vec2<u32>(x,y), color);
        
}


