import  {vec3, quat, mat4}  from "gl-matrix";


/**
 * Represent an object in 3d world space.
 */
export abstract class Entity {

    /**
     * Constructs a new entity
     * @param {vec3} position  position of origin of entity
     * @param {quat} rotation  rotation of entity
     * @param {vec3} scale scale of entity
     */
    constructor (position?:vec3, rotation?:quat, scale?:vec3) {
        this.position = position || vec3.create();
        this.rotation = rotation || quat.create();
        this.scale = scale || vec3.fromValues(1,1,1);
        this.facing = vec3.fromValues(0,0,-1);
        this.name = "entity.0001";
    }

    /**
     * Displayname of the Entity
     */
    public name: string


    /**
     * Represent the position of origin of the entity in 3d world space.
     */
    public position: vec3;

    /**
     * Represents the rotation of the entity in world space.
     */
    public rotation: quat;

    /**
     * Represents the scale of the entity in world space.
     */
    public scale: vec3;

    /**
     * Represent the direction the the entity facing.
     */
    public facing: vec3;

    /**
     * Returns the transformation matrix of the entity.
     * Used inside the Shaders for transformation for local to world space.
     * @returns {mat4} matrix representing a the world transform.
     */
    public getWorldTransform():mat4 {
        const mat = mat4.create();
        return mat4.fromRotationTranslationScale(mat,this.rotation,this.position,this.scale);
    }


    public setPosition (x:number,y:number,z:number) {
        vec3.set(this.position,x,y,z);
    }


    public setZRotation(radians:number) {

        quat.setAxisAngle(this.rotation,vec3.fromValues(0,0,1),radians);
    }



}
