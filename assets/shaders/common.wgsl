
fn fresnel (normal:vec3<f32>, view:vec3<f32>, exponent:f32) -> f32 {
    return pow(1.0 - dot(normal,view), exponent);
}