import { ComputePassBuilder } from "./ComputePassBuilder";
import { OldRenderPass } from "./pass/OldRenderPass";
import { PassBuilder } from "./PassBuilder";
import { RenderPassBuilder } from "./RenderPassBuilder";
import { BufferHandle, SamplerHandle, TextureHandle } from "./ResourseHandle";

/**
 * 
 * When rendering multiple different {@link OldRenderPass} in a {@link Renderer} there are always some dependencies between the used resources
 * used in the different passes. To avoid an conflicts {@link OldRenderPass} as an interface also defines input and output resources.
 */
export class RenderGraph {

    private passBuilders: PassBuilder<any>[];
    private passRegistry: Set<string>;
    private adjacencyLists: number[][];

    private resourceRegistry: Set<string>;
    private textures: { handle: TextureHandle, desc: GPUTextureDescriptor }[];
    private buffers: { handle: BufferHandle, desc: GPUBufferDescriptor }[];
    private exports: Set<BufferHandle | TextureHandle>;

    constructor() {
        this.passBuilders = new Array();
        this.passRegistry = new Set();
        this.adjacencyLists = new Array();
        this.resourceRegistry = new Set();
        this.textures = [];
        this.buffers = [];
        this.exports = new Set();
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
        const handle = new BufferHandle(name);
        this.buffers.push({ handle, desc });
        return handle;
    }

    public createTexture(name: string, desc: GPUTextureDescriptor) {
        this.ensureResourceUniqueness(name);
        const handle = new TextureHandle(name);
        this.textures.push({ handle, desc });
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


    private topologicalSort(nodeIndex: number) {

        const visited = new Array<boolean>(this.passBuilders.length).fill(false);
        const stack: number[] = [];

        for (let nodeIndex = 0; nodeIndex < this.passBuilders.length; nodeIndex++) {
            this.depthFirstSearch(nodeIndex, visited,stack);
        }

        stack.reverse();



    }




}


