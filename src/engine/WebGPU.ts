/**
 * Represents a handle for easy access to the core parts of WebGPU
 */
export class WebGPU {

    private constructor() { }

    /**
     * Physical GPU device
     */
    private adapter!: GPUAdapter

    private device!: GPUDevice;

    
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

            this.device = <GPUDevice>await this.adapter.requestDevice();
            if (!this.device) {
                throw new Error("No appropriate GPUDevice found.");
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

}