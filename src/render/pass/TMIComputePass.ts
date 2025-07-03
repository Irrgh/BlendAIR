import { App } from "../../app";
import { TMIBvh } from "../../engine/TMIBvh";

const tri_byte_size = 32;
const vert_byte_size = 16;
const node_byte_size = 32;
const in_byte_size = 8;
const out_byte_size = 4;

export class TMIComputePass {

    private triBuffer!: DataView;
    private nodeBuffer!: DataView;
    private vertBuffer!: DataView;

    private device: GPUDevice;

    private tri_storage_buffer!: GPUBuffer;
    private node_storage_buffer!: GPUBuffer;
    private vert_storage_buffer!: GPUBuffer;
    private max_z_uniform_buffer!: GPUBuffer;
    private in_storage_buffer!: GPUBuffer;
    private out_storage_buffer!: GPUBuffer;

    private read_staging_buffer!: GPUBuffer;

    private bindgroup!: GPUBindGroup;
    private pipeline!: GPUComputePipeline;



    private max_z!: number;
    private chunk_size = 128000;





    constructor(bvh: TMIBvh) {

        this.device = App.getRenderDevice();
        this.submitBVH(bvh);
        this.max_z = bvh.nodes[0].max[3] + 1.0;

        this.max_z_uniform_buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.in_storage_buffer = this.device.createBuffer({
            size: this.chunk_size * 8,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.out_storage_buffer = this.device.createBuffer({
            size: this.chunk_size * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        this.read_staging_buffer = this.device.createBuffer({
            size: this.chunk_size * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });


        this.device.queue.writeBuffer(this.max_z_uniform_buffer, 0, new Float32Array([this.max_z]));

        const bindgroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility:GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" }
                }, {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                }
            ]
        });



        this.bindgroup = this.device.createBindGroup({
            layout: bindgroupLayout,
            entries: [
                {
                    binding:0,
                    resource: {buffer:this.in_storage_buffer}
                }
            ]
        })




    }


    public submitBVH(bvh: TMIBvh) {

        this.vertBuffer = new DataView(new ArrayBuffer((bvh.vertices.length / 3) * 4));
        this.nodeBuffer = new DataView(new ArrayBuffer(node_byte_size * bvh.nodes.length));
        this.triBuffer = new DataView(new ArrayBuffer(tri_byte_size * bvh.tris.length));

        for (let i = 0; i < bvh.vertices.length / 3; i++) {

            const offset = vert_byte_size * i;

            this.vertBuffer.setFloat32(offset + 0, bvh.vertices[i * 3], true);
            this.vertBuffer.setFloat32(offset + 4, bvh.vertices[i * 3 + 1], true);
            this.vertBuffer.setFloat32(offset + 8, bvh.vertices[i * 3 + 2], true);

        }



        for (let i = 0; i < bvh.nodes.length; i++) {

            const offset = node_byte_size * i;
            const n = bvh.nodes[i];

            this.nodeBuffer.setFloat32(offset + 0, n.min[0], true);
            this.nodeBuffer.setFloat32(offset + 4, n.min[1], true);
            this.nodeBuffer.setFloat32(offset + 8, n.min[2], true);
            this.nodeBuffer.setInt32(offset + 12, n.first_pc, true);

            this.nodeBuffer.setFloat32(offset + 16, n.max[0], true);
            this.nodeBuffer.setFloat32(offset + 20, n.max[1], true);
            this.nodeBuffer.setFloat32(offset + 24, n.max[2], true);
            this.nodeBuffer.setInt32(offset + 28, n.prim_count, true);
        }

        for (let i = 0; i < bvh.tris.length; i++) {

            const offset = tri_byte_size * i;
            const tri = bvh.tris[i];

            this.triBuffer.setInt32(offset + 0, tri.indices[0], true);
            this.triBuffer.setInt32(offset + 4, tri.indices[1], true);
            this.triBuffer.setInt32(offset + 8, tri.indices[2], true);

            this.triBuffer.setFloat32(offset + 16, tri.center[0], true);
            this.triBuffer.setFloat32(offset + 20, tri.center[1], true);
            this.triBuffer.setFloat32(offset + 24, tri.center[2], true);

        }


        this.node_storage_buffer.destroy();
        this.tri_storage_buffer.destroy();
        this.vert_storage_buffer.destroy();
        this.max_z_uniform_buffer.destroy();



        this.node_storage_buffer = this.device.createBuffer({
            size: this.nodeBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.tri_storage_buffer = this.device.createBuffer({
            size: this.triBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.vert_storage_buffer = this.device.createBuffer({
            size: this.vertBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.vert_storage_buffer, 0, this.vertBuffer);
        this.device.queue.writeBuffer(this.node_storage_buffer, 0, this.nodeBuffer);
        this.device.queue.writeBuffer(this.tri_storage_buffer, 0, this.triBuffer);

    }


    public async sample(sites: Float32Array): Promise<Float32Array> {

        const output = new Float32Array(sites.length / 2);

        const samples = sites.length / 2;
        const num_chunks = Math.ceil(samples / this.chunk_size);

        for (let i = 0; i < num_chunks; i++) {

            const site_offset = this.chunk_size * 2 * i;

            this.device.queue.writeBuffer(this.in_storage_buffer, 0, sites, site_offset, this.chunk_size * 2)

            const enc = this.device.createCommandEncoder();
            const pass = enc.beginComputePass();

            pass.setBindGroup(0, this.bindgroup);
            pass.setPipeline(this.pipeline);

            pass.dispatchWorkgroups(Math.ceil(this.chunk_size / 256));
            pass.end();

            enc.copyBufferToBuffer(this.out_storage_buffer, 0, this.read_staging_buffer, 0, 0);

            await this.read_staging_buffer.mapAsync(GPUMapMode.READ, 0, 0)

            const res_chunk = new Float32Array(this.read_staging_buffer.getMappedRange());
            output.set(res_chunk, i * this.chunk_size);
            this.read_staging_buffer.unmap();

        }

        return output;
    }





}