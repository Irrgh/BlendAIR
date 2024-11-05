/**
 * Represents a handle for easy access to the core parts of WebGPU
 */
export class WebGPU {
    
    private constructor(adapter: GPUAdapter, device: GPUDevice) {
        this.adapter = adapter;
        this.device = device;
    }

    /**
     * Physical GPU device
     */
    private adapter: GPUAdapter

    private device: GPUDevice;

    static minBuffersize: number = 32

    public static async init(): Promise<WebGPU> {

        if (!navigator.gpu) {
            return Promise.reject(new Error("WebGPU not supported on this browser."));
        }

        const adapter = await navigator.gpu.requestAdapter();

        if (!adapter) {
            return Promise.reject(new Error("No appropriate GPUAdapter found."));
        }

        const canTimestamp = adapter.features.has("timestamp-query");
        const device = await adapter.requestDevice(
            {
                requiredFeatures: canTimestamp ? ["timestamp-query","indirect-first-instance"] : []
            }
        );

        if (!device) {
            return Promise.reject(new Error("No appropriate GPUDevice found."));
        }

        return Promise.resolve(new WebGPU(adapter,device));

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