import { Navigator } from "./Navigator";
import { Viewport } from './Viewport';
import { mat4, quat, vec2, vec3 } from "gl-matrix";
import { KeyListener } from './KeyListener';
import { Util } from "../util/Util";
import { App } from "../app";
import { Entity } from "../entity/Entity";
import { Scene } from './Scene';

/**
 * Implements the {@link Navigator} interface to achieve Camera control similar to Blender.
 */
export class BlenderNavigator implements Navigator {

    constructor(viewport: Viewport) {
        this.viewport = viewport;
        this.cameraPosition = Util.cartesianToSpherical(this.viewport.camera.getForward());
        this.cameraPosition.phi -= Math.PI / 2;
        this.orbitCenter = vec3.add([0, 0, 0], this.viewport.camera.getForward(), this.viewport.camera.getPosition());
        this.horizontalRotationSign = vec3.dot([0, 0, 1], this.viewport.camera.getUp()) > 0 ? 1 : -1;
    }

    private viewport: Viewport;
    private orbitCenter: vec3;

    private cameraPosition: SphericalCoordinate;
    private horizontalRotationSign: number;


    use(): void {
        this.viewport.canvas.addEventListener("mousedown", this.mouseDown);
        this.viewport.canvas.addEventListener("wheel", this.wheel);
        document.addEventListener("keydown", this.keyDown);

    }
    stop(): void {
        const canvas = this.viewport.canvas;
        canvas.removeEventListener("mousedown", this.mouseDown);
        canvas.removeEventListener("pointerup", this.mouseUp);
        canvas.removeEventListener("pointermove", this.pointerMove);
        canvas.removeEventListener("pointermove", this.pointerRotate);
        canvas.removeEventListener("wheel", this.wheel);
    }

    private mouseDown = async (event: MouseEvent) => {
        event.preventDefault();

        const startUp: vec3 = this.viewport.camera.getUp();
        this.horizontalRotationSign = vec3.dot([0, 0, 1], startUp) > 0 ? 1 : -1




        if ((event.button === 1 || (event.button === 0 && KeyListener.combinationPressed("AltLeft")))) {

            await this.viewport.canvas.requestPointerLock();



            if (KeyListener.combinationPressed("ShiftLeft")) {
                this.viewport.canvas.addEventListener("pointermove", this.pointerMove);
            } else {
                this.viewport.canvas.addEventListener("pointermove", this.pointerRotate);
            }




            window.addEventListener("pointerup", this.mouseUp);


        } else {

            const objectIndexTexture: GPUTexture = this.viewport.getRenderer().getTexture("object-index");
            const device = App.getRenderDevice();

            const bytesPerRow = Math.ceil(objectIndexTexture.width * 4 / 256) * 256;


            const readableBuffer = device.createBuffer({
                size: bytesPerRow * objectIndexTexture.height,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            const commandEncoder = device.createCommandEncoder();
            commandEncoder.copyTextureToBuffer(
                {
                    texture: objectIndexTexture,
                    origin: { x: 0, y: 0, z: 0 }
                },
                {
                    buffer: readableBuffer,
                    bytesPerRow: bytesPerRow,
                    rowsPerImage: objectIndexTexture.height
                },
                { width: objectIndexTexture.width, height: objectIndexTexture.height }
            );

            device.queue.submit([commandEncoder.finish()]);

            readableBuffer.mapAsync(GPUMapMode.READ).then(() => {

                const data = new Uint32Array(readableBuffer.getMappedRange());

                const rect = this.viewport.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;


                const index = (y * (bytesPerRow / 4) + x); // 4 bytes per pixel (RGBA)

                const objectIndex = data[index];

                const scene = App.getInstance().currentScene;

                if (!KeyListener.combinationPressed("ShiftLeft")) {
                    scene.selections.clear();
                    scene.primarySelection = undefined;
                }

                if (objectIndex == 0) { // ENV hit
                    return;
                }

                const entity = Array.from(scene.entities)[objectIndex - 1][1];    // 0 is ENV hence id 0 could not be index 0

                scene.primarySelection = entity;
                scene.selections.add(entity);

                readableBuffer.destroy();

                requestAnimationFrame(this.viewport.render);
            });





        }

    }


    private mouseUp = (event: PointerEvent) => {
        this.viewport.canvas.removeEventListener("pointermove", this.pointerMove);
        this.viewport.canvas.removeEventListener("pointermove", this.pointerRotate);
        document.exitPointerLock();
    }


    private wheel = (event: WheelEvent) => {

        this.cameraPosition.r += Math.max(Math.log(this.cameraPosition.r), 0.1) * event.deltaY * 0.001 * (KeyListener.combinationPressed("ShiftLeft") ? 0.1 : 1);

        const camera = this.viewport.camera;

        const offset = vec3.scale([0, 0, 0], camera.getForward(), -this.cameraPosition.r);

        vec3.add(camera.getPosition(), this.orbitCenter, offset);

        requestAnimationFrame(this.viewport.render);
    }

    private pointerMove = (event: PointerEvent) => {

        const diff = vec2.fromValues(event.movementX, -event.movementY);

        let u = this.viewport.camera.getRight();
        let v = this.viewport.camera.getUp();


        vec3.scale(u, u, diff[0] * this.cameraPosition.r);
        vec3.scale(v, v, diff[1] * this.cameraPosition.r);



        vec3.add(u, u, v);

        vec3.scale(u, u, -1 / 1000);


        vec3.add(this.viewport.camera.getPosition(), u, this.viewport.camera.getPosition());
        vec3.add(this.orbitCenter, u, this.orbitCenter);

        requestAnimationFrame(this.viewport.render);
    }

    private pointerRotate = (event: PointerEvent) => {

        const diff = vec2.fromValues(event.movementX, event.movementY);

        // build orbit please
        let u = this.viewport.camera.getRight();
        let v = this.viewport.camera.getUp();


        this.cameraPosition.theta += diff[0] * 0.005 * this.horizontalRotationSign;
        this.cameraPosition.phi += diff[1] * 0.005;

        const pos = Util.sphericalToCartesian(this.cameraPosition);
        vec3.add(this.viewport.camera.getPosition(), pos, this.orbitCenter);

        const horizontalRot: quat = quat.create();
        const verticalRot: quat = quat.create();

        quat.setAxisAngle(horizontalRot, [0, 0, 1], diff[0] * 0.005 * this.horizontalRotationSign);
        quat.setAxisAngle(verticalRot, u, -diff[1] * 0.005);

        const oldRotation = this.viewport.camera.getRotation();

        quat.mul(oldRotation, verticalRot, oldRotation);
        quat.mul(oldRotation, horizontalRot, oldRotation);
        quat.normalize(oldRotation, oldRotation);

        requestAnimationFrame(this.viewport.render);
    }

    private keyDown = async (event: KeyboardEvent) => {

        switch (event.code) {
            case "KeyG":
                await this.viewport.canvas.requestPointerLock();
                this.viewport.canvas.addEventListener("pointermove", this.objectMove);
                break;
            case "KeyS":
                await this.viewport.canvas.requestPointerLock();
                this.viewport.canvas.addEventListener("pointermove",this.objectScale);
                break;
            //case "KeyR":
            //    await this.viewport.canvas.requestPointerLock();
            //    this.viewport.canvas.addEventListener("pointermove",this.objectRotate);
            //    break;
        }
    }

    private objectMove = (event: PointerEvent) => {

        document.addEventListener("keydown", (event) => {
            if (event.code == "Escape") {
                this.viewport.canvas.removeEventListener("pointermove", this.objectMove);
                document.exitPointerLock();
            }
        });

        const scene = App.getInstance().currentScene;

        const refObject = scene.primarySelection ? scene.primarySelection : Array.from(scene.selections)[0];

        let factor = 1;


        if (refObject) {
            const toObject = vec3.sub(vec3.create(), refObject.getPosition(), this.viewport.camera.getPosition());
            const dot = vec3.dot(toObject, this.viewport.camera.getForward());
            factor = dot / vec3.length(this.viewport.camera.getForward());
        }

        const diff = vec2.fromValues(event.movementX, -event.movementY);

        let u = this.viewport.camera.getRight();
        let v = this.viewport.camera.getUp();


        vec3.scale(u, u, diff[0] * this.cameraPosition.r);
        vec3.scale(v, v, diff[1] * this.cameraPosition.r);



        vec3.add(u, u, v);

        vec3.scale(u, u, factor / 1000);



        scene.selections.forEach((entity: Entity) => {

            vec3.add(entity.getPosition(), u, entity.getPosition());



        });

        requestAnimationFrame(this.viewport.render);

    }


    private objectScale = (event:PointerEvent) => {

        document.addEventListener("keydown", (event) => {
            if (event.code == "Escape") {
                this.viewport.canvas.removeEventListener("pointermove", this.objectScale);
                document.exitPointerLock();
            }
        });

        const scale = 1 + Math.sqrt(event.movementX + event.movementY**2) / 1000;

        const scene = App.getInstance().currentScene;

        console.log(scale);

        scene.selections.forEach((entity) => {

            vec3.scale(entity.getScale(),entity.getScale(),scale);

        })
        

        requestAnimationFrame(this.viewport.render);

    }


}