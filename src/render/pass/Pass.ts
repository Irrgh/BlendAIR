export abstract class Pass<T> {
    public readonly name : string;
    protected bindgroups : Map<number,GPUBindGroup>;
    protected pipeline: GPUComputePipeline | GPURenderPipeline;
    protected desc: GPUComputePassDescriptor | GPURenderPassDescriptor;

    constructor (name:string, bindgroups : Map<number,GPUBindGroup>, desc:GPUComputePassDescriptor | GPURenderPassDescriptor, pipeline: GPUComputePipeline | GPURenderPipeline) {
        this.name = name;
        this.bindgroups = bindgroups;
        this.desc = desc;
        this.pipeline = pipeline;
    }

    public abstract execute (cmd : GPUCommandEncoder, passData: T) : void;
}