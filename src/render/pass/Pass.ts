export abstract class Pass<T> {
    public readonly name : string;
    protected bindgroups : Map<number,GPUBindGroup>;
    protected pipelinePromise: Promise<GPUComputePipeline> | Promise<GPURenderPipeline>;
    protected desc: GPUComputePassDescriptor | GPURenderPassDescriptor;
    protected passData : T;

    constructor (name:string, bindgroups : Map<number,GPUBindGroup>, desc:GPUComputePassDescriptor | GPURenderPassDescriptor, pipeline: Promise<GPUComputePipeline> | Promise<GPURenderPipeline>, passData:T) {
        this.name = name;
        this.bindgroups = bindgroups;
        this.desc = desc;
        this.pipelinePromise = pipeline;
        this.passData = passData;
    }

    public abstract execute (cmd : GPUCommandEncoder) : Promise<void>;
}