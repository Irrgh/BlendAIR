import { App } from "../../app";
import { Pass } from "./Pass";

export class RenderPass<T> extends Pass<T> {
    protected declare pipelinePromise: Promise<GPURenderPipeline>;
    protected declare desc: GPURenderPassDescriptor;
    private render: RenderFunc<T>;

    constructor(name: string, bindgroups: Map<number, GPUBindGroup>, desc: GPURenderPassDescriptor, pipeline: Promise<GPURenderPipeline>, passData:T, render: RenderFunc<T>) {
        super(name, bindgroups, desc, pipeline,passData);
        this.render = render;
    }

    /**
     * Executes the `render` function after preparing the {@link GPURenderPassEncoder} and setting the {@link GPUBindGroup}s
     * and {@link GPURenderPipeline} in it.
     * @param cmd a {@link GPUCommandEncoder} to record gpu commands.
     * @param passData arbitrary data {@link T} needed for execution.
     */
    public execute(cmd: GPUCommandEncoder): Promise<void> {

        return this.pipelinePromise.then((pipeline: GPURenderPipeline) => {

            // Debug
            cmd.insertDebugMarker(`[${this.name}]-debug`);
            cmd.pushDebugGroup(`[${this.name}]-execution`);

            // Preparation
            const enc = cmd.beginRenderPass(this.desc);
            enc.pushDebugGroup(`[${this.name}]-preparation`);

            enc.setPipeline(pipeline);
            this.bindgroups.forEach((bindgroup: GPUBindGroup, index: number) => {
                enc.setBindGroup(index, bindgroup);
            })

            enc.popDebugGroup();
            
            // Execution
            this.render(enc, this.passData);
            enc.end();

            cmd.popDebugGroup();
            
        });

    }

} 