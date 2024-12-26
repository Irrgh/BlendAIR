import { App } from "../app";

export class PassTimestamp implements ResourceUser {

    private querySet: GPUQuerySet;
    private resolveBuffer: GPUBuffer;
    private resultBuffer: GPUBuffer;
    private name: string;


    private constructor(querySet: GPUQuerySet, resolveBuffer: GPUBuffer, resultBuffer: GPUBuffer,name:string) {
        this.querySet = querySet;
        this.resolveBuffer = resolveBuffer;
        this.resultBuffer = resultBuffer;
        this.name = name;
    }

    public destroy(): void {
        this.querySet.destroy();
        this.resolveBuffer.destroy();
        this.resultBuffer.destroy();
    }

    public static timestampsEnabled(): boolean {
        return App.getRenderDevice().features.has("timestamp-query");
    }

    public static attachTimestamps(passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor, name: string): PassTimestamp {
        const device = App.getRenderDevice();

        if (!device.features.has("timestamp-query")) {
            new Error(
                `Cannot attach timestamps to pass, because the WebGPU device does not support 'timestamp-query'.
                Try enabling 'WebGPU Developer Features' under chrome://flags.`
            );
        }

        name = `${name}-pass-timestamp`;

        const querySet = device.createQuerySet({
            type: "timestamp",
            count: 2,
            label: `${name}-queryset`
        });

        const resolveBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            label: `${name}-resolve`
        });

        const resultBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: `${name}-result`
        });

        const timestampWrites: GPURenderPassTimestampWrites = {
            querySet: querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        };

        passDescriptor.timestampWrites = timestampWrites;

        return new PassTimestamp(querySet, resolveBuffer, resultBuffer,name);
    }


    public prepareResolve(enc: GPUCommandEncoder): void {
        enc.pushDebugGroup(`[${this.name}]-preparation`)
        enc.resolveQuerySet(this.querySet, 0, 2, this.resolveBuffer, 0);
        if (this.resultBuffer.mapState === "unmapped") {
            enc.copyBufferToBuffer(this.resolveBuffer, 0, this.resultBuffer, 0, this.resolveBuffer.size);
        }
        enc.popDebugGroup();
    }

    public resolve(): Promise<number> {

        if (this.resultBuffer.mapState === "unmapped") {

            return this.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
                const timestamps: BigInt64Array = new BigInt64Array(this.resultBuffer.getMappedRange());
                const difference: number = Number(timestamps[1] - timestamps[0]);
                this.resultBuffer.unmap();  // makes buffer available to gpu again

                return difference;
            });

        }
        return Promise.reject("buffer is already mapped");

    }

}