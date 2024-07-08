struct VertexOutput {
    @builtin(position)
    position: vec4<f32>,
    @location(0)
    uv: vec2<f32>,
};

// This vertex shader produces the following, when drawn using indices 0..3:
//
//  1 |  0-----x.....2
//  0 |  |  s  |  . ´
// -1 |  x_____x´
// -2 |  :  .´
// -3 |  1´
//    +---------------
//      -1  0  1  2  3
//
// The axes are clip-space x and y. The region marked s is the visible region.
// The digits in the corners of the right-angled triangle are the vertex
// indices.
//
// The top-left has UV 0,0, the bottom-left has 0,2, and the top-right has 2,0.
// This means that the UV gets interpolated to 1,1 at the bottom-right corner
// of the clip-space rectangle that is at 1,-1 in clip space.
@vertex
fn fullscreen_vertex_shader(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    // See the explanation above for how this works

    var positions = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), // Bottom-left
        vec2<f32>( 1.0, -1.0), // Bottom-right
        vec2<f32>(-1.0,  1.0), // Top-left
        vec2<f32>(-1.0,  1.0), // Top-left
        vec2<f32>( 1.0, -1.0), // Bottom-right
        vec2<f32>( 1.0,  1.0)  // Top-right
    );

    // Define the UV coordinates for the quad
    var uvs = array<vec2<f32>, 6>(
        vec2<f32>(0.0, 1.0), // Top-left
        vec2<f32>(1.0, 1.0), // Top-right
        vec2<f32>(0.0, 0.0), // Bottom-left
        vec2<f32>(0.0, 0.0), // Bottom-left
        vec2<f32>(1.0, 1.0), // Top-right
        vec2<f32>(1.0, 0.0)  // Bottom-right
    );


    var output: VertexOutput;
    output.position = vec4<f32>(positions[vertex_index],0.0,1.0);
    output.uv = vec2<f32>(uvs[vertex_index]);


    return output;
}