import { vec2, vec3, vec4 } from "gl-matrix";
import { Viewport } from "../engine/Viewport";
import { State } from "./State";
import { Entity } from "../entity/Entity";

export class ObjectScale extends State {
    public name = "object-scale";
    private viewport: Viewport;
    private cursorPosition: vec2;

    private scale = 1;
    private oneUnitLength: number;
    private centroidNdc: vec2;


    constructor(viewport: Viewport, cursorPos: vec2) {
        super();
        this.viewport = viewport;
        this.cursorPosition = vec2.clone(cursorPos);

        const averageNdc = this.viewport.camera.getNdcCoords(this.getAverage())
        this.centroidNdc = [averageNdc[0], averageNdc[1]];
        this.oneUnitLength = vec2.dist(this.cursorPosition, this.toCursorCoords(this.centroidNdc));

        this.viewport.canvas.requestPointerLock();
    }

    public abort(): void {

        const scene = this.viewport.scene;

        scene.selections.forEach((entity: Entity) => {
            vec3.scale(entity.getScale(), entity.getScale(), 1 / this.scale);
        });


        document.exitPointerLock();
        requestAnimationFrame(this.viewport.render);
    }

    public finalize(): void {
        document.exitPointerLock();
    }






    public handlePointerMove(event: PointerEvent): void {
        vec2.add(this.cursorPosition, this.cursorPosition, vec2.fromValues(event.movementX, event.movementY));

        const scale = vec2.dist(this.cursorPosition, this.toCursorCoords(this.centroidNdc)) / this.oneUnitLength;
    
        const factor = scale / this.scale;
        this.scale = scale;


        const scene = this.viewport.scene;

        scene.selections.forEach((entity: Entity) => {
            vec3.scale(entity.getScale(), entity.getScale(), factor);
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