/**
 * Represents a handle for easy access to the core parts of WebGPU
 */
export class WebGPU {
    public canTimestamp: boolean = false;
    private querySet?: GPUQuerySet;
    private resolveBuffer?: GPUBuffer;
    private resultBuffer?: GPUBuffer;

    private constructor() { }

    /**
     * Physical GPU device
     */
    private adapter!: GPUAdapter

    private device!: GPUDevice;

    static minBuffersize: number = 32

    /**
     * Initializes a new WebGPU instance and returns it.
     */
    public static async initializeInstance(): Promise<WebGPU> {
        const webgpu = new WebGPU();
        await webgpu.init();
        return webgpu;
    }


    private async init(): Promise<void> {

        if (!navigator.gpu) {
            throw new Error("WebGPU not supported on this browser.");
        }

        try {
            this.adapter = <GPUAdapter>await navigator.gpu.requestAdapter();
            if (!this.adapter) {
                throw new Error("No appropriate GPUAdapter found.");
            }

            this.canTimestamp = this.adapter.features.has('timestamp-query');
            this.device = <GPUDevice>await this.adapter.requestDevice({
                requiredFeatures:
                    (this.canTimestamp ? ['timestamp-query'] : []),
            });
            if (!this.device) {
                throw new Error("No appropriate GPUDevice found.");
            }


            if (this.canTimestamp) {
                this.querySet = this.device.createQuerySet({
                    type: 'timestamp',
                    count: 2,
                });
                this.resolveBuffer = this.device.createBuffer({
                    size: this.querySet.count * 8,
                    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
                    label: "resolve"
                });
                this.resultBuffer = this.device.createBuffer({
                    size: this.resolveBuffer.size,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                    label: "result"
                });
            }
        } catch (error) {
            console.error("Error initializing WebGPU:", error);
            // Handle error gracefully, e.g., display a message to the user
        }


    }

    /**
     * Returns the {@link GPUAdapter} associated with ``this`` {@link WebGPU} instance.
     * @returns The {@link adapter}
     */
    public getAdapter(): GPUAdapter {
        return this.adapter;
    }

    /**
     * Returns the {@link GPUDevice} associated with ``this`` {@link WebGPU} instance.
     * @returns The {@link device}
     */
    public getDevice(): GPUDevice {
        return this.device
    }

    public attachTimestamps(passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor) {

        if (this.canTimestamp && this.querySet) {
            const timestampWrites: GPURenderPassTimestampWrites = {
                querySet: this.querySet,
                beginningOfPassWriteIndex: 0,
                endOfPassWriteIndex: 1,
            }
            passDescriptor.timestampWrites = timestampWrites;
        } else {
            console.warn(`This webGPU instance does not support 'timestamp-query'. Trying enabling 'WebGPU Developer Features' under chrome://flags.`)
        }
    }


    /**
     * Needs to be called before `encoder.finish()` is called.
     * @param encoder 
     */
    public prepareTimestampsResolution(encoder: GPUCommandEncoder) {
        if (this.canTimestamp && this.resultBuffer && this.resolveBuffer && this.querySet) {
            encoder.resolveQuerySet(this.querySet, 0, 2, this.resolveBuffer, 0);
            if (this.resultBuffer.mapState === 'unmapped') {
                encoder.copyBufferToBuffer(this.resolveBuffer, 0, this.resultBuffer, 0, this.resultBuffer.size);
            }
        }
    }

    /**
     * Called after `commandEncoder.finish()`
     * @returns time taken in nanoseconds
     */
    public resolveTimestamps(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (this.canTimestamp && this.resultBuffer && this.resolveBuffer && this.querySet) {
                if (this.resultBuffer.mapState === 'unmapped') {
                    const resultBuffer = this.resultBuffer;
                    this.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {

                        const mappedRange = resultBuffer.getMappedRange(0, resultBuffer.size);
                        const times = new BigInt64Array(mappedRange);

                        const diff: bigint = times[1] - times[0];
                        resultBuffer.unmap();

                        resolve(Number(diff));
                    }).catch(err => {
                        reject(`Failed to map result buffer: '${err}'`); // Default value in case of error
                    });
                } else {
                    reject("Buffer is already mapped");
                }
            } else {
                console.warn(`This webGPU instance does not support 'timestamp-query'. Trying enabling 'WebGPU Developer Features' under chrome://flags.`);
                resolve(0); // Default value if conditions are not met
            }
        });
    }

    public async printBufferContent(buffer: GPUBuffer) {

        const stagingBuffer = this.device.createBuffer({
            size: buffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: `reading-${buffer.label}`
        })

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, buffer.size);
        const commands = commandEncoder.finish();
        this.device.queue.submit([commands]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const originalBuffer = stagingBuffer.getMappedRange(0,buffer.size);
        const copiedBuffer = originalBuffer.slice(0);


        console.log(`${buffer.label} buffer data:`,copiedBuffer);  // Verify the data
        //stagingBuffer.unmap();
        //stagingBuffer.destroy();
    }




}