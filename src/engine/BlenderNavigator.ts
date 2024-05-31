import { ViewportNavigator } from "./ViewportNavigator";
import { Viewport } from './Viewport';
import { mat4, quat, vec2, vec3 } from "gl-matrix";
import { KeyListener } from './KeyListener';
import { App } from '../../tests/app'
import { Util } from "../util/Util";

export class BlenderNavigator extends ViewportNavigator {

    constructor(viewport: Viewport) {
        super(viewport);
        this.polarFacing = Util.cartesianToSpherical(this.viewport.camera.getForward());
        this.cameraOrbitCenter = vec3.add([0,0,0],this.viewport.camera.getForward(),this.viewport.camera.position);
    }



    private cameraOrbitCenter: vec3;

    private polarFacing : SphericalCoordinate


    use(): void {
        super.use();

        this.viewport.canvas.addEventListener("contextmenu", this.disableContextmenu);

        this.viewport.canvas.addEventListener("mousedown", this.mouseMove);

        this.viewport.canvas.addEventListener("wheel", (event: WheelEvent) => {

            this.polarFacing.r += Math.max(Math.log(this.polarFacing.r),0.1) * event.deltaY * 0.001 *(KeyListener.combinationPressed("ShiftLeft") ? 0.1 : 1);

            const camera = this.viewport.camera;

            const offset = vec3.scale([0, 0, 0], camera.getForward(), -this.polarFacing.r);

            vec3.add(camera.position, this.cameraOrbitCenter, offset);

        });





    }
    stop(): void {
        throw new Error("Method not implemented.");
    }


    disableContextmenu(event: MouseEvent) {
        event.preventDefault();
    }

    mouseMove = async (event: MouseEvent) => {
        event.preventDefault();






        if ((event.button === 1 || (event.button === 0 && KeyListener.combinationPressed("AltLeft")))) {

            await this.viewport.canvas.requestPointerLock();




            const pointerMove = (event: PointerEvent) => {

                const diff = vec2.fromValues(event.movementX, event.movementY);

                let u = this.viewport.camera.getRight();
                let v = this.viewport.camera.getUp();


                vec3.scale(u, u, diff[0] * this.polarFacing.r);
                vec3.scale(v, v, diff[1] * this.polarFacing.r);



                vec3.add(u, u, v);

                vec3.scale(u, u, -1 / 1000);
                

                vec3.add(this.viewport.camera.position, u, this.viewport.camera.position);
                vec3.add(this.cameraOrbitCenter, u, this.cameraOrbitCenter);
            }

            const pointerRotate = (event: PointerEvent) => {

                const diff = vec2.fromValues(event.movementX, event.movementY);

                // build orbit please
                let u = this.viewport.camera.getRight();
                let v = this.viewport.camera.getUp();


                this.polarFacing.theta += diff[0] * 0.005;
                this.polarFacing.phi += diff[1] * 0.005;

                const pos = Util.sphericalToCartesian(this.polarFacing);
                //this.viewport.camera.position = vec3.add([0,0,0],pos,this.cameraOrbitCenter);
                
                const horizontalRot : quat = quat.create();
                const verticalRot : quat = quat.create();

                quat.setAxisAngle(horizontalRot,[0,0,1],diff[0]*0.005);
                quat.setAxisAngle(verticalRot, u, diff[1] * 0.005);
                
                const oldRotation = this.viewport.camera.rotation;

                quat.mul(oldRotation,horizontalRot,oldRotation);
                quat.normalize(oldRotation,oldRotation);
                quat.mul(oldRotation,verticalRot,oldRotation);
                quat.normalize(oldRotation,oldRotation);



                //this.viewport.camera.cameraUp = this.viewport.camera.getUp();

            }




            if (KeyListener.combinationPressed("ShiftLeft")){
                this.viewport.canvas.addEventListener("pointermove", pointerMove);
            } else {
                this.viewport.canvas.addEventListener("pointermove", pointerRotate);
            }

            


            this.viewport.canvas.addEventListener("pointerup", (event: PointerEvent) => {

                this.viewport.canvas.removeEventListener("pointermove", pointerMove);
                this.viewport.canvas.removeEventListener("pointermove", pointerRotate);
                document.exitPointerLock();

            });


        }





    }











}