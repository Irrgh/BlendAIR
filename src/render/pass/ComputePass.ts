import { Pass } from "./Pass";

export class ComputePass<T> extends Pass<T> {
    protected declare pipelinePromise: Promise<GPUComputePipeline>;
    protected declare desc: GPUComputePassDescriptor;
    private compute: ComputeFunc<T>;

    constructor(name: string, bindgroups: Map<number, GPUBindGroup>, desc: GPUComputePassDescriptor, pipeline: Promise<GPUComputePipeline>,passData:T, compute: ComputeFunc<T>) {
        super(name, bindgroups, desc, pipeline,passData);
        this.compute = compute;
    }

    /**
     * Executes the `compute` function after preparing the {@link GPUComputePassEncoder} and setting the {@link GPUBindGroup}s
     * and {@link GPUComputePipeline} in it.
     * @param cmd a {@link GPUCommandEncoder} to record gpu commands.
     * @param passData arbitrary data {@link T} needed for execution.
     */
    public execute(cmd: GPUCommandEncoder): Promise<void> {
        return this.pipelinePromise.then((pipeline: GPUComputePipeline) => {// Debug
            // Debug
            cmd.insertDebugMarker(`[${this.name}]-debug`);
            cmd.pushDebugGroup(`[${this.name}]-execution`);

            // Preparation
            const enc = cmd.beginComputePass(this.desc);
            enc.pushDebugGroup(`[${this.name}]-preparation`);

            enc.setPipeline(pipeline);
            this.bindgroups.forEach((bindgroup: GPUBindGroup, index: number) => {
                enc.setBindGroup(index, bindgroup);
            })

            enc.popDebugGroup();
            
            // Execution
            this.compute(enc, this.passData);
            enc.end()

            cmd.popDebugGroup();
        });
    }
}