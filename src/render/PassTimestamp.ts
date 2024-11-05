import { App } from "../app";
import { RenderPass } from "./pass/RenderPass";

export class PassTimestamp implements GPUResource {

    private querySet: GPUQuerySet;
    private resolveBuffer: GPUBuffer;
    private resultBuffer: GPUBuffer;

    private constructor(querySet: GPUQuerySet, resolveBuffer: GPUBuffer, resultBuffer: GPUBuffer) {
        this.querySet = querySet;
        this.resolveBuffer = resolveBuffer;
        this.resultBuffer = resultBuffer;
    }

    destroy(): void {
        this.querySet.destroy();
        this.resolveBuffer.destroy();
        this.resultBuffer.destroy();
    }

    public static attachTimestamps(pass: RenderPass): PassTimestamp {
        const device = App.getWebGPU().getDevice();

        if (!device.features.has("timestamp-query")) {
            new Error(
                `Cannot attach timestamps to pass, because the WebGPU device does not support 'timestamp-query'.
                Try enabling 'WebGPU Developer Features' under chrome://flags.`
            );
        }

        const querySet = device.createQuerySet({
            type: "timestamp",
            count: 2,
            label: `${pass.getName()}-pass-timestamp-queryset`
        });

        const resolveBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            label: `${pass.getName()}-pass-timestamp-resolve`
        });

        const resultBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: `${pass.getName()}-pass-timestamp-result`
        });

        const timestampWrites: GPURenderPassTimestampWrites = {
            querySet: querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        };

        pass.getDescriptor().timestampWrites = timestampWrites;

        return new PassTimestamp(querySet, resolveBuffer, resultBuffer);
    }


    public prepareResolve(encoder: GPUCommandEncoder): void {
        encoder.resolveQuerySet(this.querySet, 0, 2, this.resolveBuffer, 0);
        encoder.copyBufferToBuffer(this.resolveBuffer, 0, this.resultBuffer, 0, this.resolveBuffer.size);
    }

    public resolve(): Promise<bigint> {

        return this.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
            const timestamps: BigInt64Array = new BigInt64Array(this.resultBuffer.getMappedRange());
            const difference: bigint = timestamps[1] - timestamps[0];
            this.resultBuffer.unmap();  // makes buffer available to gpu again

            return Promise.resolve(difference);
        }).catch(err => {
            return Promise.reject(err); 
        });
    }



}