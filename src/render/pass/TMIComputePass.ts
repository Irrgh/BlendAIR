import { App } from "../../app";
import { TMIBvh } from "../../engine/TMIBvh";
import shader_code from "../../../assets/shaders/tmi.wgsl";

const tri_byte_size = 16;
const vert_byte_size = 16;
const node_byte_size = 32;
const in_byte_size = 8;
const out_byte_size = 4;

const workgroup_size = 32;
const chunk_size = 65535 * workgroup_size;




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
    private staging_buffer! : GPUBuffer;
    private thread_num_uniform_buffer: GPUBuffer;
    private offset_storage_buffer: GPUBuffer;

    private bindgroupLayout: GPUBindGroupLayout;
    private bindgroup!: GPUBindGroup;

    private shader: GPUShaderModule;

    private pipelineLayout: GPUPipelineLayout;
    private pipeline: GPUComputePipeline;
    private pipeline2: GPUComputePipeline;

    private max_z!: number;
    







    constructor(bvh: TMIBvh, max_size:number) {

        this.device = App.getRenderDevice();
        this.submitBVH(bvh);
        this.max_z = bvh.nodes[0].max[2] + 1.0;

        this.max_z_uniform_buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.thread_num_uniform_buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        this.offset_storage_buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });

        this.in_storage_buffer = this.device.createBuffer({
            size: max_size*in_byte_size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        });

        this.out_storage_buffer = this.device.createBuffer({
            size: max_size*out_byte_size,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE
        });

        this.staging_buffer = this.device.createBuffer({
            size: max_size*out_byte_size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });


        this.device.queue.writeBuffer(this.max_z_uniform_buffer, 0, new Float32Array([this.max_z]));

        this.bindgroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
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
                }, {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform" }
                }, {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" }
                }
            ]
        });

        this.bindgroup = this.device.createBindGroup({
            layout: this.bindgroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.in_storage_buffer }
                }, {
                    binding: 1,
                    resource: { buffer: this.out_storage_buffer }
                }, {
                    binding: 2,
                    resource: { buffer: this.node_storage_buffer }
                }, {
                    binding: 3,
                    resource: { buffer: this.tri_storage_buffer }
                }, {
                    binding: 4,
                    resource: { buffer: this.vert_storage_buffer }
                }, {
                    binding: 5,
                    resource: { buffer: this.max_z_uniform_buffer }
                }, {
                    binding: 6,
                    resource: { buffer: this.thread_num_uniform_buffer }
                }, {
                    binding: 7,
                    resource: { buffer: this.offset_storage_buffer }
                }
            ]
        });

        this.shader = this.device.createShaderModule({
            code: shader_code
        })


        this.pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindgroupLayout]
        });


        this.pipeline = this.device.createComputePipeline({
            compute: {
                module: this.shader,
                entryPoint: "intersection"
            },
            layout: this.pipelineLayout
        })

        this.pipeline2 = this.device.createComputePipeline({
            compute: {
                module:this.shader,
                entryPoint:"offset_increment"
            },
            layout:this.pipelineLayout
        });


    }


    public submitBVH(bvh: TMIBvh) {

        this.vertBuffer = new DataView(new ArrayBuffer(vert_byte_size * bvh.vertices.length / 3));
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
        }


        this.node_storage_buffer?.destroy();
        this.tri_storage_buffer?.destroy();
        this.vert_storage_buffer?.destroy();
        this.max_z_uniform_buffer?.destroy();



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
        const num_chunks = Math.ceil(samples / chunk_size);

        this.device.queue.writeBuffer(this.in_storage_buffer, 0, sites);

        let offset = 0;
        const workgroups_per_dispatch = Math.ceil(chunk_size / workgroup_size);
        const threads_per_dispatch = workgroups_per_dispatch * workgroup_size;
        const dispatchCount = Math.ceil(samples / threads_per_dispatch);

        this.device.queue.writeBuffer(this.offset_storage_buffer,0,new Uint32Array([0]));
        this.device.queue.writeBuffer(this.thread_num_uniform_buffer,0,new Uint32Array([threads_per_dispatch]));

        this.device.queue.writeBuffer(this.thread_num_uniform_buffer, 0, new Uint32Array([threads_per_dispatch]));

        const querys = this.device.createQuerySet({
            type: "timestamp",
            count: dispatchCount*2
        });

        const timeResolveBuffer = this.device.createBuffer({
            size: 8*dispatchCount*2,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
        });

        const timeStagingBuffer = this.device.createBuffer({
            size:8*dispatchCount*2,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });


        let dispatch = 0;

        while (offset < samples) {
            const enc = this.device.createCommandEncoder();
            const pass = enc.beginComputePass({
                timestampWrites: {
                    querySet: querys,
                    beginningOfPassWriteIndex:dispatch*2,
                    endOfPassWriteIndex:dispatch*2+1,
                }
            });
            pass.setBindGroup(0, this.bindgroup);
            pass.setPipeline(this.pipeline);
            pass.dispatchWorkgroups(workgroups_per_dispatch);

            pass.setPipeline(this.pipeline2);
            pass.dispatchWorkgroups(1);
            offset += threads_per_dispatch;
            pass.end();
            this.device.queue.submit([enc.finish()]);
            dispatch++;
        }

        
        const enc = this.device.createCommandEncoder();
        enc.resolveQuerySet(querys,0,dispatchCount*2,timeResolveBuffer,0);
        enc.copyBufferToBuffer(timeResolveBuffer,0,timeStagingBuffer,0,dispatchCount*2*8);
        enc.copyBufferToBuffer(this.out_storage_buffer, 0, this.staging_buffer, 0, this.out_storage_buffer.size);
        

        this.device.queue.submit([enc.finish()]);

        await timeStagingBuffer.mapAsync(GPUMapMode.READ);

        const timeStamps = new BigInt64Array(timeStagingBuffer.getMappedRange());
        let sum : bigint = 0n;
        for (let i = 0; i < dispatchCount; i++) {

            const span : bigint = timeStamps[i*2+1] - timeStamps[i*2];
            sum += span;
            console.log(`chunk ${i} took: ${Number(span) / 1_000_000} ms`)

        }
        console.log(`compute took: ${Number(sum) / 1_000_000} ms in total`);
        timeStagingBuffer.unmap();



        await this.staging_buffer.mapAsync(GPUMapMode.READ);

        const res = new Float32Array(this.staging_buffer.getMappedRange());
        output.set(res);
        this.staging_buffer.unmap();
        

        return output;
    }
}