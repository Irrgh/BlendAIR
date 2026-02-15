import { Controller } from "./Controller";
import { Viewport } from './Viewport';
import { mat3, mat4, quat, vec3 } from 'gl-matrix';
import { TriangleMesh } from './TriangleMesh';
import { MeshInstance } from '../entity/MeshInstance';
import { App } from "../app";


interface XRDomOverlayRoot {
    root: HTMLElement,
}

interface XRDepthSensing {
    usagePreference?: String[];
    formatPreference?: String[];
}

/**
 * {@link(XRSessionInit)} is not up to date
 */
interface XrSessionOptions {
    requiredFeatures?: String[];
    optionalFeatures?: String[];
    domOverlay?: XRDomOverlayRoot;
    depthSensing?: XRDepthSensing;
}


const xUpFromYUpPosition = (pos: DOMPointReadOnly) => {
    return [
        pos.x,      // x stays the same
        -pos.z,     // WebXR z → -Y
        pos.y,      // WebXR y → Z
    ];
}

const xUpFromYUpOrientation = (orient: DOMPointReadOnly) => {
    return quat.fromValues(orient.x, -orient.z, orient.y, orient.w);
}

export class XrController implements Controller {
    private managed?: Viewport;
    private xr?: XRSession;
    private layer?: XRWebGLLayer;
    private viewport?: Viewport;
    private ctx?: WebGLRenderingContext;
    private referenceSpace?: XRReferenceSpace;

    private controllers = new Map<XRHandedness, MeshInstance>();

    private cmesh!: TriangleMesh;

    constructor(private mode: XRSessionMode, private options?: XrSessionOptions) {




    }


    public async manage(viewport: Viewport): Promise<void> {
        if (!navigator.xr) {
            return Promise.reject("Navigator does not support XR.");
        }

        if (!await navigator.xr!.isSessionSupported(this.mode)) {
            return Promise.reject("XRSession mode is not supported.");
        }

        if (this.viewport) { await this.detach(); }

        this.xr = await navigator.xr!.requestSession(this.mode, this.options as XRSessionInit);
        this.ctx = await viewport.xrReadyContext();

        this.layer = new XRWebGLLayer(this.xr, this.ctx);
        this.xr.updateRenderState({ baseLayer: this.layer });

        this.referenceSpace = await this.xr.requestReferenceSpace('local-floor');

        this.viewport = viewport;

        const cubemodel: string = await (await fetch("../assets/models/cube.obj")).text();
        this.cmesh = TriangleMesh.parseFromObj(cubemodel);

        this.xr.addEventListener("inputsourceschange", (event) => {
            for (const source of event.added) {
                console.log("Controller added:", source.handedness, source.profiles, source);
            }

            for (const source of event.removed) {
                console.log("Controller removed:", source.handedness);
            }
        });


        this.xr.requestAnimationFrame(this.onXRFrame);
    }

    public async detach(): Promise<void> {
        this.viewport = undefined;
        this.xr?.end();
    }

    private onXRFrame = (time: DOMHighResTimeStamp, frame: XRFrame) => {
        if (!this.viewport) return;
        const pose = frame.getViewerPose(this.referenceSpace!);
        if (!pose) return;
        const gl = this.ctx!;

        this.handleInput(frame);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.layer!.framebuffer);

        const vps: XRViewport[] = pose.views.map((view) => this.layer!.getViewport(view)!);

        this.viewport.resizeForXR(vps);

        for (const view of pose.views) {
            const vp = this.layer!.getViewport(view)!;
    
            const qZup = xUpFromYUpOrientation(view.transform.orientation);

            const pos = xUpFromYUpPosition(view.transform.position);

            this.viewport.camera.setPosition(pos[0], pos[1], pos[2]);

            this.viewport.camera.setRotation(qZup);

            mat4.copy(this.viewport.camera.getProjectionMatrix(), view.projectionMatrix);


            gl.viewport(vp.x, vp.y, vp.width, vp.height);
            this.viewport.render();
        }



        this.xr!.requestAnimationFrame(this.onXRFrame);
    }

    private handleInput = (frame: XRFrame) => {
        this.xr!.inputSources.forEach(inputSource => {
            if (!inputSource.gripSpace) {
                console.warn(inputSource);
                return;
            }

            let controller = this.controllers.get(inputSource.handedness);
            if (!controller) {
                controller = new MeshInstance(this.cmesh);
                controller.setScale(0.1, 0.1, 0.1);
                this.viewport!.scene.addEntity(controller);
                this.controllers.set(inputSource.handedness, controller);
            }
            const pose = frame.getPose(inputSource.gripSpace!, this.referenceSpace!);
            if (!pose) {
                console.error(inputSource.gripSpace);
                return;
            }

            const position = xUpFromYUpPosition(pose.transform.position);
            const orientation = xUpFromYUpOrientation(pose.transform.orientation);

            console.log(position);

            controller!.setPosition(position[0], position[1], position[2]);
            controller!.setRotation(orientation);


        });
    }




}