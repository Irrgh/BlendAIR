/**
 * Represents a handle for easy access to the core parts of WebGPU
 */
export class WebGPU {
    private querySet?: GPUQuerySet;
    private resolveBuffer?: GPUBuffer;
    private resultBuffer?: GPUBuffer;
    private timeStamps?: Map<GPURenderPassDescriptor | GPUComputePassDescriptor, TimestampData>



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

            const canTimestamp = this.adapter.features.has('timestamp-query');
            this.device = <GPUDevice>await this.adapter.requestDevice({
                requiredFeatures:
                    (canTimestamp ? ['timestamp-query'] : []),
            });
            if (!this.device) {
                throw new Error("No appropriate GPUDevice found.");
            }

            if (canTimestamp) {
                this.timeStamps = new Map();
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

    public canTimestamp(): boolean {
        return this.timeStamps ? true : false;
    }



    /**
     * Attaches Timestamps to a pass. Called before the pass is started.
     * @param passDescriptor 
     */
    public attachTimestamps(passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor) {

        if (this.canTimestamp()) {

            const data: TimestampData = {
                querySet: this.device.createQuerySet({
                    type: "timestamp",
                    count: 2,
                    label: `${passDescriptor.label}-timestamp-queryset`
                }),
                resolveBuffer: this.device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
                    label: `${passDescriptor}-timestamp-resolve`
                }),
                resultBuffer: this.device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                    label: `${passDescriptor.label}-timestamp-result`
                })
            }

            this.timeStamps?.set(passDescriptor, data);

            const timestampWrites: GPURenderPassTimestampWrites = {
                querySet: data.querySet,
                beginningOfPassWriteIndex: 0,
                endOfPassWriteIndex: 1,
            }
            passDescriptor.timestampWrites = timestampWrites;
        } else {
            console.warn(`This webGPU instance does not support 'timestamp-query'. Trying enabling 'WebGPU Developer Features' under chrome://flags.`)
        }
    }


    /**
     * Prepares the reading of timestamps. Needs to be called after `pass.end()` and before `encoder.finish()`.
     * @param passDescriptor Descriptor of the pass, where timestamps are attached to.
     * @param encoder {@link GPUCommandEncoder} needed for resolving the {@link GPUQuerySet}.
     */
    public prepareTimestampsResolution(passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor, encoder: GPUCommandEncoder) {

        if (this.canTimestamp()) {

            const data = this.timeStamps?.get(passDescriptor);
            if (data == undefined) {
                throw new Error(`There are no timestamps attached for the pass: ${passDescriptor}`,);
            }

            encoder.resolveQuerySet(data.querySet, 0, 2, data.resolveBuffer, 0);
            if (data.resultBuffer.mapState === 'unmapped') {
                encoder.copyBufferToBuffer(data.resolveBuffer, 0, data.resultBuffer, 0, data.resultBuffer.size);
            }
        }
    }

    /**
     * Called after `commandEncoder.finish()`
     * @returns time taken in nanoseconds
     * @todo add mapping with a renderpass because mapping / unmapping is async meaning one resultBuffer is not enough
     */
    public resolveTimestamp(passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor): Promise<number> {
        
          
        return new Promise((resolve, reject) => {
            if (this.canTimestamp()) {

                const data = this.timeStamps?.get(passDescriptor);
                if (data == undefined) {
                    reject(`There are no timestamps attached for the pass: ${passDescriptor}`,);
                    return;
                }

                if (data.resultBuffer.mapState === 'unmapped') {
                    const resultBuffer = this.resultBuffer;
                    data.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {

                        const mappedRange = data.resultBuffer.getMappedRange(0, data.resultBuffer.size);
                        const times = new BigInt64Array(mappedRange);

                        const diff: bigint = times[1] - times[0];
                        data.resultBuffer.unmap();

                        resolve(Number(diff));
                    }).catch(err => {
                        console.error('Failed to map result buffer:', err);
                        resolve(0); // Default value in case of error
                    });
                } else {
                    resolve(0); // Default value if buffer is already mapped
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
        const originalBuffer = stagingBuffer.getMappedRange(0, buffer.size);
        const copiedBuffer = originalBuffer.slice(0);


        console.log(`${buffer.label} buffer data:`, copiedBuffer);  // Verify the data
        stagingBuffer.unmap();
        stagingBuffer.destroy();
    }




}