export abstract class Pass<T> {
    public readonly name : string;
    protected bindgroups : Map<number,GPUBindGroup>;
    protected pipelinePromise: Promise<GPUComputePipeline> | Promise<GPURenderPipeline>;
    protected desc: GPUComputePassDescriptor | GPURenderPassDescriptor;

    constructor (name:string, bindgroups : Map<number,GPUBindGroup>, desc:GPUComputePassDescriptor | GPURenderPassDescriptor, pipeline: Promise<GPUComputePipeline> | Promise<GPURenderPipeline>) {
        this.name = name;
        this.bindgroups = bindgroups;
        this.desc = desc;
        this.pipelinePromise = pipeline;
    }

    public abstract execute (cmd : GPUCommandEncoder, passData: T) : void;
}