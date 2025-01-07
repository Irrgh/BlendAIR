import { mat4, vec3, vec4 } from "gl-matrix";
import { Entity } from "./Entity";
import { Util } from "../util/Util";

/**
 * Represent a camera entity
 */
export class Camera extends Entity {

    constructor() {
        super();
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();

        this.projection = {
            fovy: Util.degreeToRadians(90),
            aspect: 16 / 9,
            near: 0.1,
            far: 100
        };
        this.setPerspectiveProjection(this.projection);
    }
    /**
     * Represents the camera projection needed for rendering.
     */
    private projectionMatrix: mat4;

    /**
     * Represents the view projection needed for rendering.
     */
    private viewMatrix: mat4;

    private projection: Projection;

    /**
     * Sets the projection of this camera to orthographic.
     * @param o {@link Orthographic} projection parameters.
     */
    public setOrthographicProjection(o:Orthographic): void {
        this.projection = o;
        mat4.identity(this.projectionMatrix);

        const left = (o.scale * o.aspect) / -2;
        const right = (o.scale * o.aspect) / 2;
        const top = (o.scale / o.aspect) / -2;
        const bottom = (o.scale / o.aspect) / 2;

        mat4.ortho(this.projectionMatrix, left, right, top, bottom, o.near, o.far);
    }

    /**
     * Sets the projection of this camera to perspective.
     * @param p {@link Perspective} projection parameters.
     */
    public setPerspectiveProjection(p:Perspective): void {
        this.projection = p;
        mat4.identity(this.projectionMatrix);

        mat4.perspective(this.projectionMatrix, p.fovy, p.aspect, p.near, p.far);
    }

    public resizeCamera(width:number,height:number) {

        



    }


    /**
     * Returns the projection matrix of the camera.
     * @returns {mat4} projection matrix of the camera.
     */
    public getProjectionMatrix(): mat4 {
        return this.projectionMatrix;
    }



    /**
     * Returns the view matrix of the camera.
     * @returns {mat4} view matrix of the camera
     */
    public getViewMatrix(): mat4 {
        const direction = vec3.clone(this.getForward());
        mat4.identity(this.viewMatrix);
        mat4.lookAt(this.viewMatrix,
            this.getPosition(),
            vec3.add(vec3.create(), direction, this.getPosition()),
            this.getUp()
        );
        return this.viewMatrix;
    }


    public getProjectionType(): Projection {
        return this.projection;
    }


    /**
     * Returns the normalized device coordinates of an Entity as seen from the camera.
     * @param entity 
     */
    public getNdcCoords(pos: vec3): vec4 {
        const proj = this.getProjectionMatrix();
        const view = this.getViewMatrix();

        const posVector = vec4.fromValues(pos[0], pos[1], pos[2], 1);

        const viewTransform = vec4.transformMat4(vec4.create(), posVector, view);
        const projTransform = vec4.transformMat4(vec4.create(), viewTransform, proj);
        vec4.scale(projTransform, projTransform, 1 / projTransform[3]); // normalize

        return projTransform;
    }


    public getWorldCoordsFromNdc(ndc: vec4): vec4 {

        const invProj = mat4.invert(mat4.create(), this.getProjectionMatrix());
        const invView = mat4.invert(mat4.create(), this.getViewMatrix());

        const eyeCoords = vec4.create();
        vec4.transformMat4(eyeCoords, ndc, invProj);

        const worldCoords = vec4.create();
        vec4.transformMat4(worldCoords, eyeCoords, invView);

        vec4.scale(worldCoords, worldCoords, 1 / worldCoords[3]);

        return worldCoords;
    }




} 