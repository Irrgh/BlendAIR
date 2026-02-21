import { Viewport } from '../engine/Viewport';
import { WebGPU } from "../engine/WebGPU";
import { RenderPass } from "./pass/RenderPass";
import { RenderGraph } from './RenderGraph';
import { App } from "../app";
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from '../entity/Camera';
import { TriangleMesh } from '../engine/TriangleMesh';
import { MeshInstance } from '../entity/MeshInstance';
import { Entity } from '../entity/Entity';
import { ArrayStorage } from '../util/ArrayStorage';

export abstract class Renderer {
    public webgpu: WebGPU = App.getInstance().webgpu;
    public viewport: Viewport;
    public drawParameters: Uint32Array;

    /**
     * 
     * @param name 
     * @param viewport 
     * @todo please add passes as an actual parameter
     */
    constructor(name: string, viewport: Viewport) {
        this.name = name;
        this.viewport = viewport;
        this.drawParameters = new Uint32Array();
    }

    /**
     * Map of buffers with Buffer label serving as key.
     */
    private buffers: Map<string, GPUBuffer> = new Map();
    private bufferModifiers: Map<string, Modifier> = new Map();


    /**
     * Map of textures with Texture label serving as key.
     */
    private textures: Map<string, GPUTexture> = new Map();
    private textureModifiers: Map<string, Modifier> = new Map();

    private name: string;

    protected passes: RenderPass[] = [];

    /**
     * Creates a new {@link GPUBuffer} according to the {@link GPUBufferDescriptor}.
     * @param descriptor Description of the {@link GPUBuffer} to create.
     * @param label Overrides the label attribute of {@link descriptor} and serves as the key for {@link buffers}.
     * @returns The {@link @GPUBuffer}
     */
    public createBuffer(descriptor: GPUBufferDescriptor, label: string, modifier?: Modifier): GPUBuffer {
        descriptor.label = label;
        const buffer = this.webgpu.getDevice().createBuffer(descriptor);
        this.buffers.get(label)?.destroy();     // kills old buffer if needed
        this.buffers.set(label, buffer);
        if (modifier) { this.bufferModifiers.set(label, modifier); }
        return buffer;
    }

    /**
     * Destroys the {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to destroy.
     */
    public destroyBuffer(label: string): void {
        this.buffers.get(label)?.destroy();
        this.buffers.delete(label);
        this.bufferModifiers.delete(label);
    }

    /**
     * Returns the {@link GPUBuffer} specified by the {@link label}.
     * @param label Label of the buffer to retrieve.
     * @returns The {@link GPUBuffer}. If no buffer with {@link label} exists an Error is thrown.
     */
    public getBuffer(label: string): GPUBuffer {
        const buffer = this.buffers.get(label);
        if (buffer) {
            return buffer;
        }
        throw new Error(`There is no buffer with the label: ${label}`);
    }

    public getBufferUpdated(label: string): GPUBuffer {
        const buffer = this.getBuffer(label);
        const modifier = this.bufferModifiers.get(label);
        if (modifier && modifier.modified) {
            modifier.update(this.viewport);
            modifier.modified = false;
        }

        return buffer;
    }


    





    /**
     * Return the Map of {@link GPUBuffer}s registered in ``this`` {@link WebGPU} instance.
     * Needed incase you need direct access to the Map. Like looping over all buffers.
     * @returns the internal Map of {@link GPUBuffer}s
     */
    public getBuffers(): Map<String, GPUBuffer> {
        return this.buffers;
    }


    /**
     * Creates a new {@link GPUTexture} according to the {@link GPUTextureDescriptor}.
     * @param descriptor Description of the {@link GPUTexture} to create.
     * @param label Overrides the label attribute of {@link descriptor} and serves as the key for {@link textures}.
     * @returns The {@link @GPUTexture}.
     */
    public createTexture(descriptor: GPUTextureDescriptor, label: string, modifier?: Modifier): GPUTexture {
        descriptor.label = label;
        const texture = this.webgpu.getDevice().createTexture(descriptor);
        this.textures.get(label)?.destroy();
        this.textures.set(label, texture);
        if (modifier) { this.textureModifiers.set(label, modifier) }
        return texture;
    }

    /**
     * Destroys the {@link GPUTexture} specified by the {@link label}.
     * @param label Label of the texture to destroy.
     */
    public destroyTexture(label: string): void {
        this.textures.get(label)?.destroy();
        this.textures.delete(label);
        this.textureModifiers.delete(label);
    }

    /**
     * Returns the {@link GPUTexture} specified by the {@link label}.
     * @param label Label of the texture to retrieve.
     * @returns The {@link GPUTexture}. If no texture with {@link label} exists an Error is thrown.
     */
    public getTexture(label: string): GPUTexture {
        const texture = this.textures.get(label);
        if (texture) {
            const modifier = this.textureModifiers.get(label);
            if (modifier && modifier.modified) {
                modifier.update(this.viewport);
                modifier.modified = false;
            }
            return texture
        }
        throw new Error(`There is no texture with the label: ${label}`);
    }

    /**
     * Return the Map of {@link GPUTexture}s registered in ``this`` {@link WebGPU} instance.
     * Needed incase you need direct access to the Map. Like looping over all textures.
     * @returns the internal Map of {@link GPUTexture}s
     */
    public getTextures(): Map<String, GPUTexture> {
        return this.textures;
    }

    /**
     * Loads a image file as {@link GPUTexture} into {@link textures} with filename as key.
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

    public updateTransformBuffer(viewport:Viewport): void {

        const scene = viewport.scene;

        const transformArray: Float32Array = new Float32Array(scene.entities.size * 16);

        scene.entities.forEach((entity, uuid) => {
            const id = scene.getId(entity);
            transformArray.set(entity.getWorldTransform(), (id * 16));
        });

        const transformBuffer = this.createBuffer({
            size: Math.max(transformArray.byteLength, 32),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        }, "transform");

        App.getRenderDevice().queue.writeBuffer(transformBuffer, 0, transformArray.buffer);
    }

    public updateCameraData = (viewport: Viewport) => {

        const cameraValues = new ArrayBuffer(144);
        const cameraViews = {
            view: new Float32Array(cameraValues, 0, 16),
            proj: new Float32Array(cameraValues, 64, 16),
            width: new Uint32Array(cameraValues, 128, 1),
            height: new Uint32Array(cameraValues, 132, 1),
        };

        const camera = viewport.camera;
        const view = camera.getViewMatrix();

        cameraViews.view.set(viewport.camera.getViewMatrix());
        cameraViews.proj.set(viewport.camera.getProjectionMatrix());
        cameraViews.width.set([viewport.width]);
        cameraViews.height.set([viewport.height]);

        const cameraBuffer: GPUBuffer = this.createBuffer({
            size: cameraValues.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC,
            label: "camera"
        }, "camera");

        App.getRenderDevice().queue.writeBuffer(cameraBuffer, 0, cameraValues);
    }

    /**
     * Updates the mesh
     * @param viewport 
     */
    public updateMeshBuffer(viewport: Viewport): void {

        const scene = viewport.scene;

        let vertexSize = 0;
        let normalSize = 0;
        let uvSize = 0;
        let indexSize = 0;

        const instances: Map<TriangleMesh, { count: number, ids: number[] }> = new Map();

        scene.entities.forEach((object: Entity, name: String) => {

            if (!(object instanceof MeshInstance)) {
                return;
            }

            const mesh: TriangleMesh = object.mesh;
            const instance = instances.get(mesh);
            const id = scene.getId(object);

            if (!instance) {
                vertexSize += mesh.getVertexBuffer().length;
                indexSize += mesh.getElementBuffer().length;
                normalSize += mesh.getNormalBuffer().length;
                uvSize += mesh.getUVBuffer().length;

                instances.set(mesh, { count: 1, ids: [id] });
                return;
            }
            instance.count++;
            instance.ids.push(id);
        });


        const vertexArray: Float32Array = new Float32Array(vertexSize);
        const normalArray: Float32Array = new Float32Array(normalSize);
        const uvArray: Float32Array = new Float32Array(uvSize);
        const indexArray: Uint32Array = new Uint32Array(indexSize);
        const idArray: Uint32Array = new Uint32Array(scene.entities.size);
        const drawParameters: Uint32Array = new Uint32Array(instances.size * 5);


        // Offsets for writing into the flat buffers
        let vertexOffset = 0;
        let normalOffset = 0;
        let uvOffset = 0;
        let indexOffset = 0;
        let objectOffset = 0;
        let drawIndex = 0;

        instances.forEach((value: { count: number, ids: number[] }, mesh: TriangleMesh) => {

            // Copy vertex data into separate buffers
            vertexArray.set(mesh.getVertexBuffer(), vertexOffset);
            normalArray.set(mesh.getNormalBuffer(), normalOffset);
            uvArray.set(mesh.getUVBuffer(), uvOffset);

            // Offset indices to the correct vertex location
            indexArray.set(
                mesh.getElementBuffer().map(idx => idx + vertexOffset / 3), // divide by 3 since separate buffer
                indexOffset
            );

            // Set instance IDs
            idArray.set(value.ids, objectOffset);

            // Draw parameters: [indexCount, instanceCount, firstIndex, baseVertex, firstInstance]
            drawParameters.set([
                mesh.getElementBuffer().length,
                value.count,
                indexOffset,
                0,
                objectOffset
            ], drawIndex * 5);

            vertexOffset += mesh.getVertexBuffer().length;
            normalOffset += mesh.getNormalBuffer().length;
            uvOffset += mesh.getUVBuffer().length;
            indexOffset += mesh.getElementBuffer().length;
            objectOffset += value.count;
            drawIndex++;
        });

        const min = WebGPU.minBuffersize;
        const device = App.getRenderDevice();

        // Create GPU buffers
        const vertexBuffer = this.createBuffer({
            size: Math.max(vertexArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
        }, "vertex");

        const normalBuffer = this.createBuffer({
            size: Math.max(normalArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
        }, "normal");

        const uvBuffer = this.createBuffer({
            size: Math.max(uvArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
        }, "uv");

        const indexBuffer = this.createBuffer({
            size: Math.max(indexArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
        }, "index");

        

        const objectIndexBuffer = this.createBuffer({
            size: Math.max(idArray.byteLength, min),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
        }, "object-index");

        // Upload to GPU
        device.queue.writeBuffer(vertexBuffer, 0, vertexArray.buffer);
        device.queue.writeBuffer(normalBuffer, 0, normalArray.buffer);
        device.queue.writeBuffer(uvBuffer, 0, uvArray.buffer);
        device.queue.writeBuffer(indexBuffer, 0, indexArray.buffer);
        device.queue.writeBuffer(objectIndexBuffer, 0, idArray.buffer);

        this.drawParameters = drawParameters;

    }

    public abstract render(): void

}