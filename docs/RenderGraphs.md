## BlendAIR's render graphs explained.

### What is a render graph?
By render graphs we mean a tool designed to simplify the creation of multipass rendering pipelines, key points being eliminating verbose declarations and wasteful resource management.

Whats exactly does this mean in our case? One of my biggest annoyances with webgpu are the verbose declaration of `bindgroup` and `pipeline` resources. Thus render graphs allow of the simple binding of resources via pass builders. 

The idea is to have a variety of function to define the usage of `buffers`, `textures` and `samplers` within the environment of the render graph. From those definitions the render graph can compile actual resource to be used at runtime. In the current implementation `bindgroup`and `pipeline` resources are automatically create and set for the `render` / `compute` pass.


```ts
    public bindBuffer(handle, group ,binding ,visiblity ,type)

    public bindTexture(handle, group, binding, visibility, textureLayout)

    public bindSampler(handle, group, binding, visibility, type?)

    // Note that this signature may be subject to changes
```

### Example code of a render graph


```ts

interface Data {
    value: string;
    num: number;
    indirectBuffer: BufferHandle
}

const renderGraph = new RenderGraph();
    const indirectHandle : BufferHandle = renderGraph.createBuffer("indirect", {
        size: 300,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT
    });

    const resultBuffer : BufferHandle = renderGraph.createBuffer("result", {
        size: 2048,
        usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE
    });


    {
        const { builder, data } = renderGraph.addComputePass<Data>("test1")

        data.indirectBuffer = builder.useBuffer(indirectHandle, "read-only");
        data.num = 69;
        data.value = "webgpu";

        builder.bindBuffer(resultBuffer, 0, 0, GPUShaderStage.COMPUTE, "storage");

        const module = App.getRenderDevice().createShaderModule({
            code: /*wgsl*/ `

                @binding(0) @group(0) var<storage,write> resultBuffer: array<u32>;

                @compute @workgroup_size(16)
                fn main (@builtin(global_invocation_id) global_id: vec3<u32>) {
                    if (arrayLength(resultBuffer) - 1 > global_id.x) {
                        resultBuffer[global_id.x] = global_id.x;
                    }
                }
            `
        });

        builder.setComputePipelineDescriptor({
            compute: {
                entryPoint: "main",
                module: module
            },
        });

        builder.setComputeFunc(async (enc, passData) => {
            const indirectBuffer = await passData.indirectBuffer.resolve();
            for (let i = 0; i < indirectBuffer.size / 3; i++) {
                enc.dispatchWorkgroupsIndirect(indirectBuffer, 12*i);
            }
        });
    }

    {
        const { builder, data } = renderGraph.addComputePass<{ buf: BufferHandle }>("test2")

        data.buf = builder.bindBuffer(indirectHandle, 0, 0, GPUShaderStage.COMPUTE, "storage");

        const module = App.getRenderDevice().createShaderModule({
            code: /*wgsl*/ `
                // Define a pipeline-overridable constant
                @id(0) override my_constant: u32 = 16;

                @binding(0) @group(0) var<storage,write> indirectBuffer: array<u32>;

                @compute @workgroup_size(16)
                fn main (@builtin(global_invocation_id) global_id: vec3<u32>) {
                    if (arrayLength(indirectBuffer) - 1 > global_id.x) {
                        indirectBuffer[global_id.x] = 69;
                    }
                }
            `
        });

        const workgroup_size = 8;

        builder.setComputePipelineDescriptor({
            compute: {
                entryPoint: "main",
                module: module
            }
        });

        builder.setComputeFunc(async (enc, data) => {
            const count = Math.ceil((await data.buf.resolve()).size / workgroup_size);
            enc.dispatchWorkgroups(count); // e.g ceil(2048 / 64) = 32
        })
    }


```
