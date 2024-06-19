import { Navigator } from "./Navigator";
import { Viewport } from './Viewport';
import { mat4, quat, vec2, vec3 } from "gl-matrix";
import { KeyListener } from './KeyListener';
import { Util } from "../util/Util";

/**
 * Implements the {@link Navigator} interface to achieve Camera control similar to Blender.
 */
export class BlenderNavigator implements Navigator {

    constructor(viewport: Viewport) {
        this.viewport = viewport;
        this.cameraPosition = Util.cartesianToSpherical(this.viewport.camera.getForward());
        this.cameraPosition.phi -= Math.PI/2;
        this.orbitCenter = vec3.add([0,0,0],this.viewport.camera.getForward(),this.viewport.camera.position);
        this.horizontalRotationSign = vec3.dot([0,0,1],this.viewport.camera.getUp()) > 0 ? 1 : -1;
    }

    private viewport : Viewport;
    private orbitCenter: vec3;

    private cameraPosition : SphericalCoordinate;
    private horizontalRotationSign : number;


    use(): void {
        this.viewport.canvas.addEventListener("mousedown", this.mouseDown);

        this.viewport.canvas.addEventListener("wheel", this.wheel);

    }
    stop(): void {
        const canvas = this.viewport.canvas;
        canvas.removeEventListener("mousedown",this.mouseDown);
        canvas.removeEventListener("pointerup",this.mouseUp);
        canvas.removeEventListener("pointermove",this.pointerMove);
        canvas.removeEventListener("pointermove",this.pointerRotate);
        canvas.removeEventListener("wheel",this.wheel);
    }

    private mouseDown = async (event: MouseEvent) => {
        event.preventDefault();

        const startUp : vec3 = this.viewport.camera.getUp();
        this.horizontalRotationSign = vec3.dot([0,0,1],startUp) > 0 ? 1 : -1




        if ((event.button === 1 || (event.button === 0 && KeyListener.combinationPressed("AltLeft")))) {

            await this.viewport.canvas.requestPointerLock();



            if (KeyListener.combinationPressed("ShiftLeft")){
                this.viewport.canvas.addEventListener("pointermove", this.pointerMove);
            } else {
                this.viewport.canvas.addEventListener("pointermove", this.pointerRotate);
            }

            


            window.addEventListener("pointerup", this.mouseUp);


        }

    }


    private mouseUp = (event: PointerEvent) => {
        this.viewport.canvas.removeEventListener("pointermove", this.pointerMove);
        this.viewport.canvas.removeEventListener("pointermove", this.pointerRotate);
        document.exitPointerLock();
    }


    private wheel = (event: WheelEvent) => {

        this.cameraPosition.r += Math.max(Math.log(this.cameraPosition.r),0.1) * event.deltaY * 0.001 *(KeyListener.combinationPressed("ShiftLeft") ? 0.1 : 1);

        const camera = this.viewport.camera;

        const offset = vec3.scale([0, 0, 0], camera.getForward(), -this.cameraPosition.r);

        vec3.add(camera.position, this.orbitCenter, offset);

        this.viewport.cameraChanged = true;


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
        

        vec3.add(this.viewport.camera.position, u, this.viewport.camera.position);
        vec3.add(this.orbitCenter, u, this.orbitCenter);

        this.viewport.cameraChanged = true;
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
        vec3.add(this.viewport.camera.position,pos,this.orbitCenter);
        
        const horizontalRot : quat = quat.create();
        const verticalRot : quat = quat.create();

        quat.setAxisAngle(horizontalRot,[0,0,1],diff[0]*0.005* this.horizontalRotationSign);
        quat.setAxisAngle(verticalRot, u, -diff[1] * 0.005);
        
        const oldRotation = this.viewport.camera.rotation;

        quat.mul(oldRotation,verticalRot,oldRotation);
        quat.mul(oldRotation,horizontalRot,oldRotation); 
        quat.normalize(oldRotation,oldRotation);

        this.viewport.cameraChanged = true;
        requestAnimationFrame(this.viewport.render);
    }








}