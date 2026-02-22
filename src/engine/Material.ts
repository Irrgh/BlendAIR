import { App } from "../app"


export const materialBindGroupLayout = () => {
    return App.getRenderDevice().createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: "float",
                }
            }
        ]
    });
};

export class Material {

    private color: GPUTexture;
    bindgroup: GPUBindGroup;
    readonly id: string = window.crypto.randomUUID();

    constructor(size = 1024) {
        const device = App.getRenderDevice();
        this.color = device.createTexture({
            size: [size, size],
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });

        // Fill texture with UV grid
        const pixels = new Uint8Array(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;

                // Simple colorful UV grid pattern
                const u = Math.floor((x / size) * 255);
                const v = Math.floor((y / size) * 255);

                pixels[i + 0] = u;           // R = U
                pixels[i + 1] = v;           // G = V
                pixels[i + 2] = 0;     // B = complementary U
                pixels[i + 3] = 255;         // A = opaque
            }
        }

        device.queue.writeTexture(
            { texture: this.color },
            pixels,
            { bytesPerRow: size * 4 },
            { width: size, height: size }
        );


        this.bindgroup = device.createBindGroup({
            layout: materialBindGroupLayout(),
            entries: [
                {
                    binding: 0,
                    resource: this.color.createView()
                }
            ]
        });
    }




}