import { App } from "../../app";
import { Pass } from "./Pass";

export class RenderPass<T> extends Pass<T> {
    protected declare pipeline: GPURenderPipeline;
    protected declare desc: GPURenderPassDescriptor;
    private render: RenderFunc<T>;

    constructor(name: string, bindgroups: Map<number, GPUBindGroup>, desc: GPURenderPassDescriptor, pipeline: GPURenderPipeline, render: RenderFunc<T>) {
        super(name,bindgroups, desc, pipeline);
        this.render = render;
    }

    /**
     * Executes the `render` function after preparing the {@link GPURenderPassEncoder} and setting the {@link GPUBindGroup}s
     * and {@link GPURenderPipeline} in it.
     * @param cmd a {@link GPUCommandEncoder} to record gpu commands.
     * @param passData arbitrary data {@link T} needed for execution.
     */
    public execute(cmd: GPUCommandEncoder, passData: T): void {
        // Debug
        cmd.insertDebugMarker(`${this.name}-pass-debug`);
        cmd.pushDebugGroup(`${this.name}-pass-execution`);

        // Preparation
        const enc = cmd.beginRenderPass(this.desc);
        enc.setPipeline(this.pipeline);
        this.bindgroups.forEach((bindgroup : GPUBindGroup, index:number) => {
            enc.setBindGroup(index,bindgroup);
        })

        // Execution
        this.render(enc,passData);

        cmd.popDebugGroup();
    }

} 