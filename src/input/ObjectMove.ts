import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { State } from "./State";
import { App } from "../app";
import { Entity } from "../entity/Entity";
import { Viewport } from "../engine/Viewport";

export class ObjectMove extends State {

    

    private cursorMovement: vec2;
    private viewport: Viewport;
    private refEntity : Entity;

    private depth : number;
    private startPos : vec3;
    private currentPos : vec3;
    public name = "object-move";

    constructor(viewport: Viewport) {
        super();
        this.refEntity = Array.from(App.getInstance().currentScene.selections)[0];
        this.viewport = viewport;
        this.cursorMovement = vec2.create();
        this.depth = this.viewport.camera.getNdcCoords(this.refEntity.getPosition())[2]; 
        const worldCursor = this.cursorToWorldSpace();
        this.startPos = [worldCursor[0],worldCursor[1],worldCursor[2]];
        this.currentPos = vec3.clone(this.startPos);
        
        this.viewport.canvas.requestPointerLock();
    }



    public abort(): void {

        const diff = vec3.sub(vec3.create(), this.startPos, this.currentPos);
        const scene = App.getInstance().currentScene;

        scene.selections.forEach((entity: Entity) => {
            vec3.add(entity.getPosition(), entity.getPosition(), diff);
        });
        
        requestAnimationFrame(this.viewport.render);
        document.exitPointerLock();
    }

    public finalize(): void {
        document.exitPointerLock();
    }


    public handlePointerMove(event: MouseEvent): void {
        vec2.add(this.cursorMovement, this.cursorMovement, vec2.fromValues(event.movementX, event.movementY));

        const scene = App.getInstance().currentScene;
        
        const oldDiff = vec3.sub(vec3.create(), this.currentPos, this.startPos);
        const cursorWorld = this.cursorToWorldSpace();
        this.currentPos = [cursorWorld[0],cursorWorld[1],cursorWorld[2]];
        const newDiff = vec3.sub(vec3.create(), this.currentPos, this.startPos);

        vec3.sub(newDiff,newDiff,oldDiff);

        scene.selections.forEach((entity: Entity) => {

            vec3.add(entity.getPosition(), entity.getPosition(), newDiff);

        });

        requestAnimationFrame(this.viewport.render);
    }


    private cursorToWorldSpace():vec4 {

        const cursorNdc : vec4 = [
            (this.cursorMovement[0] / this.viewport.canvas.width) * 2 - 1,
            -(this.cursorMovement[1] / this.viewport.canvas.height) * 2 + 1,
            this.depth,
            1
        ];

        const worldCoords = this.viewport.camera.getWorldCoordsFromNdc(cursorNdc);
        return worldCoords;
    }


}
