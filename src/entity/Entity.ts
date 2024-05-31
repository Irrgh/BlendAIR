import { vec3, quat, mat4, mat3 } from "gl-matrix";
import { Camera } from "./Camera";


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
    constructor(position?: vec3, rotation?: quat, scale?: vec3) {
        this.position = position || vec3.create();
        this.rotation = rotation || quat.create();
        this.scale = scale || vec3.fromValues(1, 1, 1);
        //this.facing = vec3.fromValues(0,0,-1);
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
    private forward: vec3 = [0, 1, 0];

    private up: vec3 = [0, 0, 1];

    private right: vec3 = [1, 0, 0];



    /**
     * Returns the transformation matrix of the entity.
     * Used inside the Shaders for transformation for local to world space.
     * @returns {mat4} matrix representing a the world transform.
     */
    public getWorldTransform(): mat4 {
        const mat = mat4.create();
        return mat4.fromRotationTranslationScale(mat, this.rotation, this.position, this.scale);
    }


    public setPosition(x: number, y: number, z: number) {
        vec3.set(this.position, x, y, z);
    }


    public setXRotation(radians: number): void {
        quat.setAxisAngle(this.rotation, vec3.fromValues(1, 0, 0), radians);
    }

    public setYRotation(radians: number): void {
        quat.setAxisAngle(this.rotation, vec3.fromValues(0, 1, 0), radians);
    }


    public setZRotation(radians: number): void {
        quat.setAxisAngle(this.rotation, vec3.fromValues(0, 0, 1), radians);
    }


    /**
     * Calculates the right facing vector. 
     * @returns The {@link  vec3} facing right of {@link facing}
     */
    public getRight(): vec3 {
        const vec: vec3 = [0, 0, 0];
        vec3.transformQuat(vec, this.right, this.rotation);
        return vec;
    }

    public getUp(): vec3 {
        const vec: vec3 = [0, 0, 0];
        vec3.transformQuat(vec, this.up, this.rotation);
        return vec;
    }

    public getForward(): vec3 {
        const vec: vec3 = [0, 0, 0];
        vec3.transformQuat(vec, this.forward, this.rotation);
        return vec;
    }


    /**
     * Sets the {@link rotation} quaternion to face forward in the direction of {@link vec3} `dir`.
     * @param dir A normalized {@link vec3}.
     */
    public setFacing(dir: vec3): void {

        const targetDirection = vec3.normalize(vec3.create(), dir);
        const dot = vec3.dot(this.getForward(), targetDirection);
        
        if (dot < -0.999999) {
            // Vectors are opposite; 180-degree rotation around any orthogonal axis (e.g., Z-axis)
            quat.setAxisAngle(this.rotation, [0, 0, 1], Math.PI);
        } else if (dot > 0.999999) {
            // Vectors are already aligned
            quat.identity(this.rotation);
        } else {
            const rotationAxis = vec3.cross(vec3.create(), this.getForward(), targetDirection);
            const rotationAngle = Math.acos(dot);
            quat.setAxisAngle(this.rotation, rotationAxis, rotationAngle);
        }
        

    }

}














