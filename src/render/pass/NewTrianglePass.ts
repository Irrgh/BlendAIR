import { RenderPassBuilder } from "../RenderPassBuilder";
import { BufferHandle, TextureHandle } from "../ResourceHandle";


interface TrianglePassData {
    color: TextureHandle,
    depth: TextureHandle,
    normal: TextureHandle,
    objectId: TextureHandle,
    vertex: BufferHandle,
    index: BufferHandle
    objectIndex: BufferHandle,
    transform: BufferHandle,
    camera: BufferHandle,
    drawParameters: Uint32Array
}




export const createTrianglePass: (data: TrianglePassData) => RenderPassBuilder<TrianglePassData> = (data) => {

    const builder = new RenderPassBuilder("triangle", data);
    builder.addColorAttachment({
        view: data.color,
        loadOp: "load",
        storeOp: "store"
    }, 0);

    builder.addColorAttachment({
        view: data.normal,
        loadOp: "load",
        storeOp: "store"
    }, 1);

    builder.addColorAttachment({
        view: data.objectId,
        loadOp: "load",
        storeOp: "store"
    }, 2);

    builder.setDepthAttachment({
        view: data.depth,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        depthClearValue: 1.0,
    });

    builder.bindBuffer(data.camera, {
        layout: { type: "uniform" },
        group: 0,
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT
    });

    builder.bindBuffer(data.objectIndex, {
        layout: {type:"read-only-storage"},
        group: 0,
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT
    });

    builder.bindBuffer(data.transform, {
        layout: {type:"read-only-storage"},
        group: 0,
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT
    });

    builder.setPassFunc(renderFunc);


    return builder;
}

const renderFunc = (enc: GPURenderPassEncoder, passData: TrianglePassData) => {

    enc.setIndexBuffer(passData.index.getValue(),"uint32");
    enc.setVertexBuffer(0,passData.vertex.getValue());

    for (let i = 0; i < passData.drawParameters.length; i += 5) {

        enc.drawIndexed(
            passData.drawParameters[i],
            passData.drawParameters[i + 1],
            passData.drawParameters[i + 2],
            passData.drawParameters[i + 3],
            passData.drawParameters[i + 4]
        );
    }

}

