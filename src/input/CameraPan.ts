import { vec3 } from "gl-matrix";
import { State } from "./State";
import { Viewport } from "../engine/Viewport";

export class CameraPan extends State {
    public name = "camera-pan";
    private viewport: Viewport;
    private orbitCenter : vec3;
    private cameraPos: SphericalCoordinate;

    private sensitivity = 0.001;

    constructor(viewport: Viewport, orbitCenter: vec3, cameraPos: SphericalCoordinate) {
        super();
        this.viewport = viewport;
        this.orbitCenter = orbitCenter;
        this.cameraPos = cameraPos;

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

        const up = camera.getUp();
        const right = camera.getRight();

        vec3.scale(up, up, event.movementY * this.cameraPos.r);
        vec3.scale(right, right, event.movementX * this.cameraPos.r);

        const uv = vec3.add(vec3.create(),up,right);
        vec3.scale(uv,uv,-this.sensitivity);

        vec3.add(camera.getPosition(),camera.getPosition(),uv);
        vec3.add(this.orbitCenter,this.orbitCenter,uv);

        requestAnimationFrame(this.viewport.render);
    }

}