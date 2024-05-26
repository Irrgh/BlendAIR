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
        this.name = window.crypto.randomUUID(); /** @todo this probably shouldn't stay like this */
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


    public setXRotation(radians:number):void {
        quat.setAxisAngle(this.rotation,vec3.fromValues(1,0,0),radians);
        vec3.rotateX(this.facing,this.facing,this.position,radians);
    }

    public setYRotation(radians:number):void {
        quat.setAxisAngle(this.rotation,vec3.fromValues(0,1,0),radians);
        vec3.rotateY(this.facing,this.facing,this.position,radians);
    }


    public setZRotation(radians:number):void {
        quat.setAxisAngle(this.rotation,vec3.fromValues(0,0,1),radians);
        vec3.rotateZ(this.facing,this.facing,this.position,radians);
    }


    /**
     * Calculates the right facing vector. 
     * @returns The {@link  vec3} facing right of {@link facing}
     */
    public getRightVector():vec3 {
        let u : vec3;

        if (this.facing[0] !== 0 || this.facing[1] !== 0) {
            u = vec3.fromValues(this.facing[1], -this.facing[0], 0);
        } else {
            u = [1, 0, 0];
        }
        return u;
    }

    public getUpVector():vec3 {
        let v : vec3 = [0,0,0];
        return vec3.cross(v,this.facing,this.getRightVector());
    }













}
