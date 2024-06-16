import { Camera } from "../entity/Camera";
import { Entity } from '../entity/Entity';
import { MeshInstance } from "../entity/MeshInstance";
import { TriangleMesh } from "./TriangleMesh";
import { Viewport } from "./Viewport";

export class Scene {

    /**
     * All entities except viewport Camera are included in here;
     */
    entities : Map<String,Entity>

    /**
     * @todo All scene changing updates will be routed through here to prompt redrawing in all associated Viewports.
     */
    viewports:Set<Viewport>;

    public primarySelection?: Entity;
    public selections: Set<Entity>;



    /**
     * Represent the origin for actions like Viewport panning, object inserting etc.
     * @todo implement rendering types for entities
     */
    // cursor3d : Entity;


    constructor() {
        this.entities = new Map<String,MeshInstance>();
        this.viewports = new Set<Viewport>();
        this.selections = new Set<Entity>;
    }

    /**
     * Redraws all connected viewports after a change
     * @todo implement this ig
     */
    onUpdate () {

        this.viewports.forEach((viewport) => {
            
            

        });

    }


    public getId(entity:Entity):number {
        throw new Error("This method is not implemented yet.");
        // I probably need to change the entity Map or something
    }


    public addEntity (entity : MeshInstance) {
        this.entities.set(entity.name,entity);
    }







    








    









}