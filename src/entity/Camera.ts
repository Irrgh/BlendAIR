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
    public projectionMatrix: mat4;

    /**
     * Represents the view projection needed for rendering.
     */
    public viewMatrix: mat4;

    /**
     * Default UP direction for a camera.
     * @todo PLEASE DONT DO THIS!
     */
    public cameraUp: vec3 = vec3.fromValues(0.1, 0, 0.9);   


    /**
     * Sets the projection matrix for orthographic projection.
     * @param {number} cx center of x-coordinate 
     * @param {number} cy center of y-coordinate
     * @param {number} near near clipping plane
     * @param {number} far far clipping plane
     */
    public setOrthographicProjection(cx: number, cy: number, near: number, far: number): void {
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
    public setPerspectiveProjection(fovy: number, aspect: number, near: number, far: number): void {
        mat4.identity(this.projectionMatrix);
        mat4.perspective(this.projectionMatrix, fovy, aspect, near, far);
    }

    /**
     * Returns the projection matrix of the camera.
     * @returns {mat4} projection matrix of the camera.
     */
    public getProjectionMatrix():mat4 {
        return this.projectionMatrix; 
    }



    /**
     * Returns the view matrix of the camera.
     * @returns {mat4} view matrix of the camera
     */
    public getViewMatrix(): mat4 {
        const direction = vec3.clone(this.facing);
        mat4.identity(this.viewMatrix);
        mat4.lookAt(this.viewMatrix,
            vec3.clone(this.position),
            direction,
            this.cameraUp
        );
        console.log(this.viewMatrix);
        return this.viewMatrix;
    }













} 