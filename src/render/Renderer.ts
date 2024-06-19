import { Viewport } from "../engine/Viewport";
import { WebGPU } from "../engine/WebGPU";
import { RenderPass } from "./pass/RenderPass";
import { RenderGraph } from './RenderGraph';
import { App } from "../app";

export abstract class Renderer {
    public webgpu: WebGPU;

    constructor(name: String) {
        this.sharedBuffers = new Map<string, ReactiveBuffer>();
        this.sharedTextures = new Map<string, GPUTexture>();
        this.webgpu = App.getInstance().webgpu;
        this.passes = [];
        this.name = name;
    }

    /**
     * Map of buffers with Buffer label serving as key.
     */
    private sharedBuffers: Map<String, ReactiveBuffer>


    /**
     * Map of textures with Texture label serving as key.
     */
    private sharedTextures: Map<String, GPUTexture>;

    private name: String;

    protected passes: RenderPass[];

    /**
     * Creates a new {@link GPUBuffer} according to the {@link GPUBufferDescriptor}.
     * @param descriptor Description of the {@link GPUBuffer} to create.
     * @param label Overrides the label attribute of {@link descriptor} and serves as the key for {@link sharedBuffers}.
     * @returns The {@link @GPUBuffer}
     */
    public createBuffer(descriptor: GPUBufferDescriptor, label: string, updater?: (viewport: Viewport) => void): GPUBuffer {
        descriptor.label = label;
        const buffer = this.webgpu.getDevice().createBuffer(descriptor);
        this.sharedBuffers.get(label)?.buffer.destroy();     // kills old buffer if needed
        this.sharedBuffers.set(label, {
            buffer: buffer,
            modified: false,
            updater: updater
        });
        return buffer;
    }

    /**
     * Destroys the {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to destroy.
     */
    public destroyBuffer(label: string): void {
        this.sharedBuffers.get(label)?.buffer.destroy;
        this.sharedBuffers.delete(label);
    }

    /**
     * Returns the {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to retrieve.
     * @returns The {@link GPUBuffer}. If no buffer with {@link label} exists an Error is thrown.
     */
    public getBuffer(label: string): ReactiveBuffer {
        const buffer = this.sharedBuffers.get(label);

        if (buffer) {
            return buffer;
        }
        throw new Error(`There is no buffer with the label: ${label}`);
    }

    /**
     * Returns the automatically updated {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to retrieve.
     * @param viewport 
     * @returns 
     */
    public getUpdatedBuffer(label: string, viewport: Viewport): ReactiveBuffer {
        const buffer = this.sharedBuffers.get(label);

        if (buffer) {
            if (buffer.modified && buffer.updater) { buffer.updater(viewport) }
            buffer.modified = false;
            return buffer;
        }
        throw new Error(`There is no buffer with the label: ${label}`);
    }





    /**
     * Return the Map of {@link GPUBuffer}s registered in ``this`` {@link WebGPU} instance.
     * Needed incase you need direct access to the Map. Like looping over all buffers.
     * @returns the internal Map of {@link GPUBuffer}s
     */
    public getBuffers(): Map<String, ReactiveBuffer> {
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
            label: file.name
        }


        const texture = this.createTexture(descriptor, file.name);

        this.webgpu.getDevice().queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture },
            [imageBitmap.width, imageBitmap.height, 1]
        );

    }


    private updateCameraData = (viewport: Viewport) => {

        const renderer : Renderer = viewport.getRenderer();
        
        const cameraValues = new ArrayBuffer(144);
        const cameraViews = {
            view: new Float32Array(cameraValues, 0, 16),
            proj: new Float32Array(cameraValues, 64, 16),
            width: new Uint32Array(cameraValues, 128, 1),
            height: new Uint32Array(cameraValues, 132, 1),
        };

        cameraViews.view.set(viewport.camera.getViewMatrix());
        cameraViews.proj.set(viewport.camera.getProjectionMatrix());
        cameraViews.width.set([viewport.width]);
        cameraViews.height.set([viewport.height]);

        renderer.destroyBuffer("camera");

        const cameraBuffer: GPUBuffer = renderer.createBuffer({
            size: cameraValues.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            label: "camera"
        }, "camera");

        App.getRenderDevice().queue.writeBuffer(cameraBuffer, 0, cameraValues);
    }

    public abstract render(viewport: Viewport): void







}