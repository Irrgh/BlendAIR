

declare module '*.obj' {
    const value: string;
    export default value;
}


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


/**
 * Should be used on classes that contain {@link GPU} resources.
 * GPU include {@link GPUBuffer}, {@link GPUTexture}, {@link GPUQuerySet} and {@link GPUDevice}.
 */
declare interface GPUResource {
    
    /**
     * Destroys all GPU resources allocated.
     * GPU include {@link GPUBuffer}, {@link GPUTexture}, {@link GPUQuerySet} and {@link GPUDevice}.
     */
    destroy():void
}




interface Window {
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}