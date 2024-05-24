import { ViewportNavigator } from "./ViewportNavigator";
import { Viewport } from './Viewport';
import { vec2, vec3 } from "gl-matrix";

export class BlenderNavigator extends ViewportNavigator {

    constructor(viewport: Viewport) {
        super(viewport);
    }

    dragStart: vec2 = [0, 0];
    dragHead: vec2 = [0, 0];

    mouseButtonsPressed: boolean[] = [];




    use(): void {


        this.viewport.canvas.addEventListener("contextmenu", this.disableContextmenu);
        


        this.viewport.canvas.addEventListener("mousedown", this.mouseMove);







    }
    stop(): void {
        throw new Error("Method not implemented.");
    }


    disableContextmenu(event: MouseEvent) {
        event.preventDefault();
    }

    mouseMove = async (event: MouseEvent) => {
        if (event.button === 2) {

            this.dragStart = [event.screenX, event.screenY];


            await this.viewport.canvas.requestPointerLock();

            this.dragHead = vec2.clone(this.dragStart);

            const pointerMove = (event:PointerEvent) => {
                vec2.set(this.dragHead, event.screenX, event.screenY);

                const diff = vec2.fromValues(event.movementX, event.movementY);

                const facing = this.viewport.camera.facing;

                let u: vec3;
                let v: vec3 = [0, 0, 0];

                if (facing[0] !== 0 || facing[1] !== 0) {
                    u = vec3.fromValues(facing[1], -facing[0], 0);
                } else {
                    u = [1, 0, 0];
                }

                vec3.normalize(u, u);
                vec3.normalize(v, v);
                vec3.cross(v, facing, u);

                vec3.scale(u, u, diff[0]);
                vec3.scale(v, v, diff[1]);

                vec3.add(u, u, v);

                vec3.scale(u, u, -1 / 1000);

                const newPos = vec3.add([0, 0, 0], u, this.viewport.camera.position);
                vec3.add(this.viewport.camera.position, newPos, [0, 0, 0]);
            }



            this.viewport.canvas.addEventListener("pointermove", pointerMove);


            this.viewport.canvas.addEventListener("pointerup", (event: PointerEvent) => {

                this.viewport.canvas.removeEventListener("pointermove",pointerMove);
                document.exitPointerLock();

            });


        }
    }




}