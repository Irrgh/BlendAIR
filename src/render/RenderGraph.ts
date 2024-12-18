import { App } from "../app";
import { ComputePassBuilder } from "./ComputePassBuilder";
import { ComputePass } from "./pass/ComputePass";
import { OldRenderPass } from "./pass/OldRenderPass";
import { Pass } from "./pass/Pass";
import { PassBuilder } from "./PassBuilder";
import { RenderPassBuilder } from "./RenderPassBuilder";
import { BufferHandle, SamplerHandle, TextureHandle, ResourceHandle } from './ResourseHandle';

/**
 * 
 * When rendering multiple different {@link OldRenderPass} in a {@link Renderer} there are always some dependencies between the used resources
 * used in the different passes. To avoid an conflicts {@link OldRenderPass} as an interface also defines input and output resources.
 */
export class RenderGraph {

    private passBuilders: PassBuilder<any>[];
    private passRegistry: Set<string>;
    private adjacencyLists: number[][];
    private sortedPasses: number[];

    private resourceRegistry: Set<string>;
    private buffers: Map<string, BufferHandle>;
    private textures: Map<string, TextureHandle>;
    private samplers: Map<string, SamplerHandle>;



    private exports: Set<BufferHandle | TextureHandle>;

    constructor() {
        this.passBuilders = new Array();
        this.passRegistry = new Set();
        this.adjacencyLists = new Array();
        this.resourceRegistry = new Set();
        this.sortedPasses = new Array();

        this.buffers = new Map();
        this.textures = new Map();
        this.samplers = new Map();
        this.exports = new Set();
    }


    private ensureResourceUniqueness(name: string) {
        if (this.resourceRegistry.has(name)) {
            throw new Error(`Resource declaration error: [${name}] has already been defined as a resource.`);
        }
        this.resourceRegistry.add(name);
    }


    private ensurePassUniqueness(name: string) {
        if (this.passRegistry.has(name)) {
            throw new Error(`Pass declaration error: [${name}] has already been defined as a pass.`);
        }
        this.passRegistry.add(name);
    }

    public addRenderPass<PassData>(name: string): { builder: RenderPassBuilder<PassData>, data: PassData } {
        this.ensurePassUniqueness(name);

        const passData = {} as PassData;
        const passBuilder = new RenderPassBuilder<PassData>(name, passData);
        this.passBuilders.push(passBuilder);

        return { builder: passBuilder, data: passData };
    }

    public addComputePass<PassData>(name: string): { builder: ComputePassBuilder<PassData>, data: PassData } {
        this.ensurePassUniqueness(name);

        const passData = {} as PassData;
        const passBuilder = new ComputePassBuilder<PassData>(name, passData);
        this.passBuilders.push(passBuilder);

        return { builder: passBuilder, data: passData };
    }

    public createBuffer(name: string, desc: GPUBufferDescriptor): BufferHandle {
        this.ensureResourceUniqueness(name);
        const handle = new BufferHandle(name, desc);
        this.buffers.set(name, handle)
        return handle;
    }

    public createTexture(name: string, desc: GPUTextureDescriptor): TextureHandle {
        this.ensureResourceUniqueness(name);
        const handle = new TextureHandle(name, desc);
        this.textures.set(name, handle);
        return handle;
    }

    public createSampler(name: string, desc: GPUSamplerDescriptor): SamplerHandle {
        this.ensureResourceUniqueness(name);
        const handle = new SamplerHandle(name, desc);
        this.samplers.set(name, handle);
        return handle;
    }


    /**
     * Sets whether a {@link GPUBuffer} or {@link GPUTexture} should be exported after execution of the {@link RenderGraph}.
     * Resources that are not set to be exported might result in passes that provide them being culled.
     * @param handle name of the {@link GPUBuffer} | {@link GPUTexture} to export.
     * @param exported 
     */
    public setExport(handle: BufferHandle | TextureHandle, exported: boolean) {
        if (exported) {
            this.exports.add(handle);
        } else {
            this.exports.delete(handle);
        }
    }



    public execute() {
        this.constructAdjacencyLists();
        this.topologicalSort();

        this.sortedPasses.forEach((index: number) => {

            const pass = this.passBuilders[index];

        });

    }

    private constructAdjacencyLists() {

        for (let nodeIndex = 0; nodeIndex < this.passBuilders.length; nodeIndex++) {

            const node = this.passBuilders[nodeIndex];
            const nodeDeps = node.getDependencies();

            if (nodeDeps.write.size == 0) continue;

            const adjacencyNodeIndecies: number[] = [];
            this.adjacencyLists[nodeIndex] = adjacencyNodeIndecies;

            for (let otherNodeIdx = 0; otherNodeIdx < this.passBuilders.length; otherNodeIdx++) {

                if (nodeIndex === otherNodeIdx) continue;

                const establishAdjacency = (name: string) => {
                    if (nodeDeps.write.has(name)) {
                        adjacencyNodeIndecies.push(otherNodeIdx);
                        return true;
                    }
                    return false;
                }

                const otherNode = this.passBuilders[otherNodeIdx];
                const otherNodeDeps = otherNode.getDependencies();

                for (const element of otherNodeDeps.read) {
                    if (establishAdjacency(element)) break;     // if one resource depends the entire pass depends.
                }
            }
        }
    }

    private depthFirstSearch(nodeIndex: number, visited: boolean[], stack: number[]) {

        if (visited[nodeIndex]) {
            return;
        }
        visited[nodeIndex] = true;
        stack.push(nodeIndex);

        this.adjacencyLists[nodeIndex].forEach((index) => {
            this.depthFirstSearch(index, visited, stack);
        });

    }

    /**
     * Sorts the passes in topological order so that
     * dependencies can be resolved.
     */
    private topologicalSort() {
        const visited = new Array<boolean>(this.passBuilders.length).fill(false);
        const stack: number[] = [];

        for (let nodeIndex = 0; nodeIndex < this.passBuilders.length; nodeIndex++) {
            this.depthFirstSearch(nodeIndex, visited, stack);
        }

        stack.reverse();
        this.sortedPasses = stack;
    }

    private resolveHandles(pass: PassBuilder<any>) {

        const device = App.getRenderDevice();
        const handles = pass.getHandleMaps();
        const accessMap = pass.getAccessMap();

        handles.buffers.forEach((handle, name) => {

            if (!this.buffers.has(name)) {
                const buffer = device.createBuffer(handle.desc)
                handle.setResolveValue(buffer);
                this.buffers.set(name, handle);
            }
        });

        handles.textures.forEach((handle, name) => {
            if (!this.textures.has(name)) {
                const texture = device.createTexture(handle.desc)
                handle.setResolveValue(texture);
                this.textures.set(name, handle);
            }
        });

        handles.samplers.forEach((handle, name) => {
            if (!this.samplers.has(name)) {
                const sampler = device.createSampler(handle.desc);
                handle.setResolveValue(sampler);
                this.samplers.set(name, handle);
            }
        });

    }

    private createBindgroups(pass: PassBuilder<any>) {
        const device = App.getRenderDevice();
        const groups = new Map<number, GPUBindGroup>();
        const layouts = new Array<GPUBindGroupLayout | null>();

        pass.getBindingLayouts().forEach((desc: GPUBindGroupLayoutDescriptor, group: number) => {

            const layout = device.createBindGroupLayout(desc);  // create GPUBindGroupLayout
            layouts[group] = layout // TODO: this might cause issues since if empty items dont count as null

            const bindings = pass.getGroupBindings(group);

            const entries: GPUBindGroupEntry[] = [];

            bindings.forEach(async (handle: ResourceHandle<any>, binding: number) => { // create binding entries

                if (!handle.isResolved()) {
                    throw new Error(`Critical RenderGraph error: [${handle}] is not resolved.`);
                }

                let resource!: GPUBindingResource;

                if (handle instanceof BufferHandle) {
                    resource = { buffer: await handle.resolve() };
                } else if (handle instanceof TextureHandle) {
                    resource = (await handle.resolve()).createView();
                } else if (handle instanceof SamplerHandle) {
                    resource = await handle.resolve();
                }

                entries.push({ resource, binding });

            });

            const bindgroup = device.createBindGroup({ layout, entries }); // create GPUBindgroup
            groups.set(group, bindgroup);

        });

        return { groups, layouts };
    }

    private createPass<T extends any>(builder: PassBuilder<T>): Pass<T> {
        const device = App.getRenderDevice();
        this.resolveHandles(builder);
        const { groups, layouts } = this.createBindgroups(builder);

        if (builder instanceof ComputePassBuilder) {

            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: layouts
            });

            const pipeline = device.createComputePipelineAsync({
                compute: builder.getComputePipelineDescriptor().compute,
                layout: pipelineLayout
            });

            // TODO: prepare pass descriptors!



        }

    }



}


