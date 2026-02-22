import { Camera } from "../entity/Camera";
import { Entity } from '../entity/Entity';
import { MeshInstance } from "../entity/MeshInstance";
import { TriangleMesh } from "./TriangleMesh";
import { Viewport } from "./Viewport";
import { Timeline } from './Timeline';
import { Acceleration } from './Acceleration';

export class Scene {

    /**
     * All entities except viewport Camera are included in here;
     */
    entities: Map<string, Entity>;
    public entityIndices: Map<Entity, number> = new Map();

    public accel: Acceleration;

    private redrawScheduled: boolean = false;
    private globalRedraw: boolean = false;


    /**
     * @todo All scene changing updates will be routed through here to prompt redrawing in all associated Viewports.
     */
    viewports: Set<Viewport>;

    public primarySelection?: Entity;
    public selections: Set<Entity>;
    public timeline: Timeline;
    public meshes: Map<string, TriangleMesh>;


    /**
     * Represent the origin for actions like Viewport panning, object inserting etc.
     * @todo implement rendering types for entities
     */
    // cursor3d : Entity;


    constructor() {
        this.entities = new Map<string, MeshInstance>();
        this.viewports = new Set<Viewport>();
        this.selections = new Set<Entity>;
        this.timeline = new Timeline();
        this.meshes = new Map<string, TriangleMesh>();
        this.accel = new Acceleration(this);
    }

    /**
     * Schedules a redraws for either a certain viewport or all viewports
     * @param viewport viewport to redraw, if `undefined` redraws all viewports.
     */
    public scheduleRedraws(viewport?:Viewport) {

        if (viewport) {
            viewport.redrawNext = true;
        } else {
            this.globalRedraw = true;
        }

        if (!this.redrawScheduled) {
            this.redrawScheduled = true;

            requestAnimationFrame(this.redraw);
        }
    }



    private redraw = () => {
        this.redrawScheduled = false;
        this.viewports.forEach((viewport: Viewport) => {

            if (viewport.redrawNext || this.globalRedraw) {
                viewport.render();
            }

        })
    }


    public getId(entity: Entity): number {
        const id = this.entityIndices.get(entity);
        if (id != undefined) { return id; }
        throw new Error(`Entity ${entity} does not exist.`)
    }


    public addEntity(entity: MeshInstance) {
        this.entities.set(entity.name, entity);
        this.entityIndices.set(entity, this.entityIndices.size);

        this.accel.update();
        console.log(this.accel);

        this.viewports.forEach(vp => {
            vp.updateMeshes();
            vp.updateTransforms();
        });
    }

    public getIds(): Map<Entity, number> {
        return this.entityIndices;
    }

    


























}