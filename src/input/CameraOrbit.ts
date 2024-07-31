import { quat, vec3 } from "gl-matrix";
import { State } from "./State";
import { Viewport } from "../engine/Viewport";
import { Util } from "../util/Util";

export class CameraOrbit extends State {
    public name = "camera-orbit";
    private viewport : Viewport;
    private orbitCenter : vec3;
    private cameraPos : SphericalCoordinate;

    private sensitivity = 0.001 * Math.PI * 2;
    private horizontalRotationSign: number;


    constructor(viewport:Viewport, orbitCenter:vec3, cameraPos :SphericalCoordinate) {
        super();
        this.viewport = viewport;
        this.orbitCenter = orbitCenter;
        this.cameraPos = cameraPos;
        this.horizontalRotationSign = vec3.dot([0, 0, 1], this.viewport.camera.getUp()) > 0 ? 1 : -1;

        this.viewport.canvas.requestPointerLock();
    }



    public abort(): void {
        document.exitPointerLock();
    }
    public finalize(): void {
        document.exitPointerLock();
    }



    public handlePointerMove(event: PointerEvent): void {
        
        const camera = this.viewport.camera;

        const right = camera.getRight();

        this.cameraPos.theta += event.movementX * this.sensitivity * this.horizontalRotationSign;
        this.cameraPos.phi += event.movementY * this.sensitivity;

        const pos = Util.sphericalToCartesian(this.cameraPos);
        vec3.add(this.viewport.camera.getPosition(), pos, this.orbitCenter);




        const horizontalQuat = quat.setAxisAngle(quat.create(),[0,0,1],event.movementX * this.sensitivity * this.horizontalRotationSign);
        const verticalQuat = quat.setAxisAngle(quat.create(),right,-event.movementY * this.sensitivity);


        const rotation = camera.getRotation();


        quat.mul(rotation,verticalQuat,rotation);
        quat.mul(rotation,horizontalQuat,rotation);
        quat.normalize(rotation,rotation);

        requestAnimationFrame(this.viewport.render);
    }
}