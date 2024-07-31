import { quat, quat2, vec2, vec3 } from "gl-matrix";
import { State } from "./State";
import { Viewport } from "../engine/Viewport";
import { Entity } from "../entity/Entity";
import { Util } from "../util/Util";

export class ObjectRotate extends State {
    public name = "object-rotate";
    private axis: vec3;

    /**
     * Rotation angle in radians.
     */
    private angle: number = 0;
    private angleInit : number;
    private viewport: Viewport;
    private cursorPos: vec2;

    private centroidNdc:vec2;


    constructor(viewport: Viewport,cursorPos:vec2) {
        super();
        this.viewport = viewport;
        this.axis = this.viewport.camera.getForward();
        this.angle = 0;
        const ndc = this.viewport.camera.getNdcCoords(this.getAverage());
        this.centroidNdc = [ndc[0],ndc[1]];
        this.cursorPos = cursorPos;

        const centerToCursor = vec2.sub(vec2.create(),this.toCursorCoords(this.centroidNdc),this.cursorPos);
        this.angleInit = Math.atan2(centerToCursor[1],centerToCursor[0]);



        //this.viewport.canvas.requestPointerLock();
    }

    public abort(): void {
        const scene = this.viewport.scene;
        const invRotation = quat.create();
        quat.setAxisAngle(invRotation, this.axis, -this.angle);

        scene.selections.forEach((entity: Entity) => {
            quat.mul(entity.getRotation(), invRotation, entity.getRotation());
            quat.normalize(entity.getRotation(), entity.getRotation());
        });

        requestAnimationFrame(this.viewport.render);
        document.exitPointerLock();
    }

    public finalize(): void {
        document.exitPointerLock();
    }



    public handlePointerMove(event: PointerEvent): void {
        vec2.add(this.cursorPos, this.cursorPos, vec2.fromValues(event.movementX, event.movementY));

        const centerToCursor = vec2.sub(vec2.create(),this.toCursorCoords(this.centroidNdc),this.cursorPos);

        const newAngle = Math.atan2(centerToCursor[1],centerToCursor[0]) - this.angleInit;

        const diff = newAngle - this.angle;
        this.angle = newAngle;

        const scene = this.viewport.scene;
        const rotation = quat.create();
        quat.setAxisAngle(rotation, this.axis, diff);
        scene.selections.forEach((entity: Entity) => {
            quat.mul(entity.getRotation(), rotation, entity.getRotation());
            quat.normalize(entity.getRotation(), entity.getRotation());
        });

        requestAnimationFrame(this.viewport.render);
    }

    private getAverage(): vec3 {

        const sum = vec3.create();

        this.viewport.scene.selections.forEach((entity: Entity) => {
            vec3.add(sum, sum, entity.getPosition());
        });

        vec3.scale(sum, sum, 1 / this.viewport.scene.selections.size);

        return sum;
    }

    private toCursorCoords(ndc : vec2): vec2 {

        const cursorCoords : vec2 = [
            (ndc[0] + 1) / 2 * this.viewport.canvas.width,
            (ndc[0] - 1) / -2 * this.viewport.canvas.height,
        ]

        return cursorCoords;
    }


}