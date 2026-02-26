import { mat4, vec3 } from "gl-matrix"
import { TMIBvh, TMIBvhNode } from "./TMIBvh"
import { App } from "../app";

export type Instance = {
    name: string,            // reference to BLAS
    transform: mat4, // 4x4 matrix
    invTransform: mat4,
    boundsMin: vec3,
    boundsMax: vec3,
    center: vec3
}

export class TLAS {

    public nodes: TMIBvhNode[];
    public instances: Instance[];
    public nodes_used: number;

    public nodeBuffer : GPUBuffer;

    constructor(instances: Instance[]) {
        this.instances = instances;
        this.nodes = new Array(instances.length * 2 - 1);

        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i] = { min: [0, 0, 0], first_pc: 0, max: [0, 0, 0], prim_count: 0 };
        }

        this.nodes[0].first_pc = 0;
        this.nodes[0].prim_count = instances.length;
        this.nodes_used = 1;

        this.updateBounds(0);
        this.subdivide(0);

        const nodeArray = new Uint8Array(this.nodes_used * 32);
        const nodeDataView = new DataView(nodeArray.buffer);

        for (let i = 0; i < this.nodes_used; i++) {
            const node = this.nodes[i];

            const base = i * 32;

            nodeDataView.setFloat32(base + 0, node.min[0], true);
            nodeDataView.setFloat32(base + 4, node.min[1], true);
            nodeDataView.setFloat32(base + 8, node.min[2], true);
            nodeDataView.setUint32(base + 12, node.first_pc, true);
            nodeDataView.setFloat32(base + 16, node.max[0], true);
            nodeDataView.setFloat32(base + 20, node.max[1], true);
            nodeDataView.setFloat32(base + 24, node.max[2], true);
            nodeDataView.setUint32(base + 28, node.prim_count, true);
        }
        
        const device = App.getRenderDevice();
        const nodeBuffer = device.createBuffer({
            size: Math.max(nodeArray.byteLength, 32),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(nodeBuffer, 0, nodeArray);
        this.nodeBuffer = nodeBuffer;

    }

    private updateBounds(idx: number) {
        const n = this.nodes[idx];

        vec3.set(n.min, 1e30, 1e30, 1e30);
        vec3.set(n.max, -1e30, -1e30, -1e30);

        for (let i = 0; i < n.prim_count; i++) {

            const inst = this.instances[n.first_pc + i];
            vec3.min(n.min, n.min, inst.boundsMin);
            vec3.max(n.max, n.max, inst.boundsMax);
        }
    }

    private subdivide(idx: number) {

        const n = this.nodes[idx];
        if (n.prim_count <= 2) {
            return;
        }

        const dim: vec3 = vec3.sub([0, 0, 0], n.max, n.min);
        let axis: number = 0;
        if (dim[1] > dim[0]) axis = 1;
        if (dim[2] > dim[axis]) axis = 2;
        const splitPos = n.min[axis] + dim[axis] * 0.5;

        let i = n.first_pc;
        let j = i + n.prim_count - 1;

        while (i <= j) {
            if (this.instances[i].center[axis] < splitPos) {
                i++;
            } else {
                const tmp = this.instances[i];
                this.instances[i] = this.instances[j];
                this.instances[j] = tmp;
                j--;
            }
        }

        const leftCount = i - n.first_pc;
        if (leftCount == 0 || leftCount == n.prim_count) {
            return;
        }

        const leftIndex = this.nodes_used++;
        const rightIndex = this.nodes_used++;

        this.nodes[leftIndex].first_pc = n.first_pc;
        this.nodes[leftIndex].prim_count = leftCount;
        this.nodes[rightIndex].first_pc = i;
        this.nodes[rightIndex].prim_count = n.prim_count - leftCount;
        n.first_pc = leftIndex;
        n.prim_count = 0;

        this.updateBounds(leftIndex);
        this.updateBounds(rightIndex);

        this.subdivide(leftIndex);
        this.subdivide(rightIndex);

    }



}