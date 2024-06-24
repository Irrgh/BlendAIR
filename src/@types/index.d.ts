
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



/**
 * Describes the result of a render op on a Viewport.
 */
declare type RenderLayers = {
    /**
     * Color pass of a render.
     */
    albedo: GPUTexture,
    /**
     * Depth pass of a render. Is used for post processing effects like outlines.
     */
    depth: GPUTexture,
    /**
     * Normal pass of a render.
     */
    normal: GPUTexture,
    /**
     * Uv pass of a render. Not really sure if this i actually needed like this.
     */
    uv: GPUTexture
}

/**
 * A List of {@link String} describing keyboards codes [MDN Reference](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code)
 */
declare type KeyCombination = string[]




/**
 * Describes a point or vector in 3d space using spherical notation.
 */
declare type SphericalCoordinate = {
    /**
     * Radius of the vector.
     */
    r: number,
    /**
     * Elevation (vertical component) of the vector.
     */
    phi: number,
    /**
     * Azimuth (horizontal component) of the vector.
     */
    theta: number // azimuth
}

declare type RenderTypes
    = "wire"
    | "basic"
    | "preview"
    | "final"


declare type Projection
    = "perspective"
    | "orthographic"

declare type ChildLayout
    = "horizontal"
    | "vertical"


/**
 * A GPU Resource imported / exported from a Renderer into a RenderPass
 */
declare type PassResource = {
    label: String,
    resource: "buffer" | "texture",
    description?: String
}




declare type Modifier = {
    modified : boolean,
    /**
     * Updates the buffer before the next rendering operation if it was modified.
     * @param viewport Should contain all data needed.
     */
    update : (viewport:Viewport) => void
}


declare type TimestampData = {
    querySet: GPUQuerySet,
    resolveBuffer: GPUBuffer,
    resultBuffer: GPUBuffer;
}


interface Window {
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}