import { vec3, quat, mat4 } from "gl-matrix";
/**
 * Represent an object in 3d world space.
 */
export class Entity {
    /**
     * Constructs a new entity
     * @param {vec3} position  position of origin of entity
     * @param {quat} rotation  rotation of entity
     * @param {vec3} scale scale of entity
     */
    constructor(position, rotation, scale) {
        this.position = position || vec3.create();
        this.rotation = rotation || quat.create();
        this.scale = scale || vec3.create();
        this.facing = vec3.fromValues(0, 0, -1);
    }
    /**
     * Represent the position of origin of the entity in 3d world space.
     */
    position;
    /**
     * Represents the rotation of the entity in world space.
     */
    rotation;
    /**
     * Represents the scale of the entity in world space.
     */
    scale;
    /**
     * Represent the direction the the entity facing.
     */
    facing;
    /**
     * Returns the transformation matrix of the entity.
     * Used inside the Shaders for transformation for local to world space.
     * @returns {mat4} matrix representing a the world transform.
     */
    getWorldTransform() {
        const mat = mat4.create();
        return mat4.fromRotationTranslationScale(mat, this.rotation, this.position, this.scale);
    }
}
