import { mat4, vec3 } from "gl-matrix";
import { Entity } from "./Entity";
/**
 * Represent a camera entity
 */
export class Camera extends Entity {
    constructor() {
        super();
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.setPerspectiveProjection(70, 16 / 9, 1, 1000);
    }
    /**
     * Represents the camera projection needed for rendering.
     */
    projectionMatrix;
    /**
     * Represents the view projection needed for rendering.
     */
    viewMatrix;
    /**
     * Default UP direction for a camera.
     */
    cameraUp = vec3.fromValues(0, 0, 1);
    /**
     * Sets the projection matrix for orthographic projection.
     * @param {number} cx center of x-coordinate
     * @param {number} cy center of y-coordinate
     * @param {number} near near clipping plane
     * @param {number} far far clipping plane
     */
    setOrthographicProjection(cx, cy, near, far) {
        mat4.identity(this.projectionMatrix);
        mat4.ortho(this.projectionMatrix, -cx / 2, cx / 2, -cy / 2, cy / 2, near, far);
    }
    /**
     * Sets the projection matrix for perspective projection.
     * @param {number} fovy vertical field of view in radians
     * @param {number} aspect aspect ratio in x / y
     * @param {number} near near clipping plane
     * @param {number} far far clipping plane
     */
    setPerspectiveProjection(fovy, aspect, near, far) {
        mat4.identity(this.projectionMatrix);
        mat4.perspective(this.projectionMatrix, fovy, aspect, near, far);
    }
    /**
     * Returns the projection matrix of the camera.
     * @returns {mat4} projection matrix of the camera.
     */
    getProjectionMatrix() {
        return this.projectionMatrix;
    }
    /**
     * Returns the view matrix of the camera.
     * @returns {mat4} view matrix of the camera
     */
    getViewMatrix() {
        const direction = vec3.clone(this.facing);
        mat4.identity(this.viewMatrix);
        mat4.lookAt(this.viewMatrix, vec3.clone(this.position), direction, this.cameraUp);
        return this.viewMatrix;
    }
}
