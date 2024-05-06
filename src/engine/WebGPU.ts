/**
 * Represents a handle for easy access to the core parts of WebGPU
 */
export class WebGPU {

    private constructor () {}
    
    /**
     * Physical GPU device
     */
    public adapter!: GPUAdapter

    public device!: GPUDevice;




    /**
     * Initializes a new WebGPU instance and returns it.
     */
    public static async initializeInstance ():Promise<WebGPU> {
        const webgpu = new WebGPU();
        await webgpu.init();
        return webgpu;
    }


    private async init ():Promise<void> {

        if (!navigator.gpu) {
            throw new Error("WebGPU not supported on this browser.");
        }
        
        try {
            this.adapter = <GPUAdapter> await navigator.gpu.requestAdapter();
            if (!this.adapter) {
                throw new Error("No appropriate GPUAdapter found.");
            }
        
            this.device = <GPUDevice> await this.adapter.requestDevice();
            if (!this.device) {
                throw new Error("No appropriate GPUDevice found.");
            }
        } catch (error) {
            console.error("Error initializing WebGPU:", error);
            // Handle error gracefully, e.g., display a message to the user
        }






    }














}