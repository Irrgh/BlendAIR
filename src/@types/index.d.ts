declare module '*.wgsl' {
    const value: string;
    export default value;
}

declare type Vertex = {
    xPos: number,
    yPos: number,
    zPos: number,
    xNorm: number,
    yNorm: number,
    zNorm: number,
    u: number,
    v: number
}

declare type TriangleFace = {
    v1: number,
    v2: number,
    v3: number
}

declare type RenderLayers = {
    albedo: GPUTexture,
    depth: GPUTexture,
    normal: GPUTexture,
    uv: GPUTexture
}

declare type KeyCombination = string[]

declare type SphericalCoordinate = {
    r:number,
    phi: number, // elevation
    theta: number // azimuth
}