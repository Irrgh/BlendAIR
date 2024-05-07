declare module '*.wgsl' {
    const value: string;
    export default value;
}

declare type Vertex = {
    xPos:number,
    yPos:number,
    zPos:number,
    xNorm:number,
    yNorm:number,
    zNorm:number,
    u:number,
    v:number
}

declare type TriangleFace = {
    v1:number,
    v2:number,
    v3:number
}


