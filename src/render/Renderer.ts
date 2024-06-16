import { Viewport } from "../engine/Viewport";
import { WebGPU } from "../engine/WebGPU";
import { RenderPass } from "./pass/RenderPass";
import { RenderGraph } from './RenderGraph';
import { App } from "../app";

export abstract class Renderer {
    public webgpu: WebGPU;

    constructor(name:String) {
        this.sharedBuffers = new Map<String, GPUBuffer>();
        this.sharedTextures = new Map<String, GPUTexture>();
        this.webgpu = App.getInstance().webgpu;
        this.passes = [];
        this.name = name;
    }

    /**
     * Map of buffers with Buffer label serving as key.
     */
    private sharedBuffers: Map<String, GPUBuffer>


    /**
     * Map of textures with Texture label serving as key.
     */
    private sharedTextures: Map<String, GPUTexture>;

    private name : String;

    protected passes : RenderPass[];


    /**
     * Creates a new {@link GPUBuffer} according to the {@link GPUBufferDescriptor}.
     * @param descriptor Description of the {@link GPUBuffer} to create.
     * @param label Overrides the label attribute of {@link descriptor} and serves as the key for {@link sharedBuffers}.
     * @returns The {@link @GPUBuffer}
     */
    public createBuffer(descriptor: GPUBufferDescriptor, label: string): GPUBuffer {
        descriptor.label = label;
        const buffer = this.webgpu.getDevice().createBuffer(descriptor);
        this.sharedBuffers.get(label)?.destroy();     // kills old buffer if needed
        this.sharedBuffers.set(label, buffer);
        return buffer;
    }

    /**
     * Destroys the {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to destroy.
     */
    public destroyBuffer(label: string): void {
        this.sharedBuffers.get(label)?.destroy;
        this.sharedBuffers.delete(label);
    }

    /**
     * Returns the {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to retrieve.
     * @returns The {@link GPUBuffer}. If no buffer with {@link label} exists an Error is thrown.
     */
    public getBuffer(label: string): GPUBuffer {
        const buffer = this.sharedBuffers.get(label);
        if (buffer) { return buffer }
        throw new Error(`There is no buffer with the label: ${label}`);
    }



    /**
     * Return the Map of {@link GPUBuffer}s registered in ``this`` {@link WebGPU} instance.
     * Needed incase you need direct access to the Map. Like looping over all buffers.
     * @returns the internal Map of {@link GPUBuffer}s
     */
    public getBuffers(): Map<String, GPUBuffer> {
        return this.sharedBuffers;
    }


    /**
     * Creates a new {@link GPUTexture} according to the {@link GPUTextureDescriptor}.
     * @param descriptor Description of the {@link GPUTexture} to create.
     * @param label Overrides the label attribute of {@link descriptor} and serves as the key for {@link sharedTextures}.
     * @returns The {@link @GPUTexture}.
     */
    public createTexture(descriptor: GPUTextureDescriptor, label: string): GPUTexture {
        descriptor.label = label;
        const texture = this.webgpu.getDevice().createTexture(descriptor);
        this.sharedTextures.get(label)?.destroy();
        this.sharedTextures.set(label, texture);
        return texture;
    }

    /**
     * Destroys the {@link GPUTexture} specified by the {@link label}.
     * @param label Label of the texture to destroy.
     */
    public destroyTexture(label: string): void {
        this.sharedTextures.get(label)?.destroy();
        this.sharedTextures.delete(label);
    }

    /**
     * Returns the {@link GPUTexture} specified by the {@link label}.
     * @param label Label of the texture to retrieve.
     * @returns The {@link GPUTexture}. If no texture with {@link label} exists an Error is thrown.
     */
    public getTexture(label: string): GPUTexture {
        const texture = this.sharedTextures.get(label);
        if (texture) { return texture }
        throw new Error(`There is no texture with the label: ${label}`);
    }

    /**
     * Return the Map of {@link GPUTexture}s registered in ``this`` {@link WebGPU} instance.
     * Needed incase you need direct access to the Map. Like looping over all textures.
     * @returns the internal Map of {@link GPUTexture}s
     */
    public getTextures(): Map<String, GPUTexture> {
        return this.sharedTextures;
    }

    /**
     * Loads a image file as {@link GPUTexture} into {@link sharedTextures} with filename as key.
     * Throws an error if {@link file} type does not match `image/*`
     * @param file {@link File} to load as a texture.
     */
    public async loadTextureFromFile(file: File) {

        if (!file.type.includes("image")) {
            throw new Error(`Type: ${file.type} is not a image type.`);
        }

        const blob = await file.arrayBuffer()
        const imageBitmap = await createImageBitmap(new Blob([blob]));

        const descriptor: GPUTextureDescriptor = {
            size: { width: imageBitmap.width, height: imageBitmap.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            label:file.name
        }


        const texture = this.createTexture(descriptor, file.name);

        this.webgpu.getDevice().queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture },
            [imageBitmap.width, imageBitmap.height, 1]      // width height depth
        );

    }



    public abstract render(viewport:Viewport):void







}