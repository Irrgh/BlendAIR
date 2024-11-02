import { vec2, vec3 } from "gl-matrix";
import { Viewport } from "../engine/Viewport";
import { ObjectMove } from "./ObjectMove";
import { ObjectRotate } from "./ObjectRotate";
import { ObjectScale } from "./ObjectScale";
import { State } from "./State";
import { KeyListener } from "../engine/KeyListener";
import { Util } from "../util/Util";
import { CameraPan } from "./CameraPan";
import { CameraOrbit } from "./CameraOrbit";
import { App } from "../app";

export class InputStateMachine {
    private viewport: Viewport;


    constructor(viewport: Viewport) {
        this.viewport = viewport;
        this.cursorPos = vec2.create();

        this.viewport.canvas.addEventListener("pointerenter", () => {
            this.viewport.canvas.focus();
        });

        this.viewport.canvas.addEventListener("keydown", this.keyDown);
        this.viewport.canvas.addEventListener("keyup", this.keyUp);
        this.viewport.canvas.addEventListener("wheel", this.cameraZoom);
        this.viewport.canvas.addEventListener("pointermove", this.pointerMove);
        this.viewport.canvas.addEventListener("pointerdown", this.pointerDown);
        this.viewport.canvas.addEventListener("pointerup", this.pointerUp);

        document.addEventListener("pointerlockchange",(event) => {
            if (!document.pointerLockElement) {
                const state = this.stateStack.pop();
                state?.abort();
            }
        });



        this.cameraCentroid = vec3.create();
        this.cameraPosition = Util.cartesianToSpherical(this.viewport.camera.getForward());
        this.cameraPosition.phi -= Math.PI / 2;
    };


    private cursorPos: vec2;
    private cameraCentroid: vec3;
    private cameraPosition: SphericalCoordinate;




    private stateStack: State[] = [];






    public keyDown = (event: KeyboardEvent) => {
        event.preventDefault();

        const state = this.stateStack.pop();        // peeking into the stack
        if (state) {
            this.stateStack.push(state);

            switch (event.code) {

                case "Escape":
                    state.abort();
                    this.stateStack.pop();
                    break;


            }



        } else {

            if (this.viewport.scene.selections.size !== 0) {
                switch (event.code) {

                    case "KeyG": this.stateStack.push(new ObjectMove(this.viewport));
                        break;
                    case "KeyR": this.stateStack.push(new ObjectRotate(this.viewport, this.cursorPos));
                        break;
                    case "KeyS": this.stateStack.push(new ObjectScale(this.viewport, this.cursorPos));
                }
            }

        }




    }

    public keyUp = (event: KeyboardEvent) => {

    }

    public pointerDown = (event: MouseEvent) => {

        const state = this.stateStack.pop();
        if (state) {
            this.stateStack.push(state);

            switch (state.name) {

                case "object-move":
                    if (event.button === 0) {
                        state.finalize();
                        this.stateStack.pop();
                    }
                    break;
                case "object-scale":
                    if (event.button === 0) {
                        state.finalize();
                        this.stateStack.pop();
                    }
                    break;
                case "object-rotate":
                    if (event.button === 0) {
                        state.finalize();
                        this.stateStack.pop();
                    }
                    break;
            }

        } else {

            if ((KeyListener.combinationPressed("AltLeft") && event.button === 0) || event.button === 1) {

                if (KeyListener.combinationPressed("ShiftLeft")) {
                    this.stateStack.push(new CameraPan(this.viewport, this.cameraCentroid, this.cameraPosition));
                } else {
                    this.stateStack.push(new CameraOrbit(this.viewport, this.cameraCentroid, this.cameraPosition));
                }

            } else if (event.button === 0) {

                this.select(event);

            }
        }
    }

    public pointerMove = (event: PointerEvent) => {

        event.preventDefault();

        const rect = this.viewport.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        vec2.set(this.cursorPos, x, y);

        const state = this.stateStack.pop();
        if (state) {
            this.stateStack.push(state);
            state.handlePointerMove(event);
        }


    }

    private pointerUp = (event: PointerEvent) => {

        const state = this.stateStack.pop();
        if (state) {
            this.stateStack.push(state);

            switch (state.name) {

                case "camera-orbit":
                    state.finalize();
                    this.stateStack.pop();
                    break;
                case "camera-pan":
                    state.finalize();
                    this.stateStack.pop();
                    break;
            }

        }



    }


    private cameraZoom = (event: WheelEvent) => {

        this.cameraPosition.r += Math.max(Math.log(this.cameraPosition.r), 0.1) * event.deltaY * 0.001 * (KeyListener.combinationPressed("ShiftLeft") ? 0.1 : 1);

        const camera = this.viewport.camera;

        const offset = vec3.scale([0, 0, 0], camera.getForward(), -this.cameraPosition.r);

        vec3.add(camera.getPosition(), this.cameraCentroid, offset);

        requestAnimationFrame(this.viewport.render);

    }


    private select(event: MouseEvent) {

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
            const x = Math.floor(event.clientX - rect.left);
            const y = Math.floor(event.clientY - rect.top);


            const index = (y * (bytesPerRow / 4) + x); // 4 bytes per pixel (RGBA)

            const objectIndex = data[index];

            const scene = this.viewport.scene;

            if (!KeyListener.combinationPressed("ShiftLeft")) {

                scene.selections.clear();
                scene.primarySelection = undefined;
            }

            if (objectIndex !== 0) { // ENV hit


                const entity = Array.from(scene.entities)[objectIndex - 1][1];    // 0 is ENV hence id 0 could not be index 0

                scene.primarySelection = entity;
                scene.selections.add(entity);
            }

            readableBuffer.destroy();

            requestAnimationFrame(this.viewport.render);
        });





    }




}