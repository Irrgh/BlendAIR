import { Controller } from "./Controller";
import { Viewport } from './Viewport';
import { mat3, mat4, quat, vec3 } from 'gl-matrix';


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



export class XrController implements Controller {
    private managed?: Viewport;
    private xr?: XRSession;
    private layer?: XRWebGLLayer;
    private viewport?: Viewport;
    private ctx?: WebGLRenderingContext;
    private referenceSpace?: XRReferenceSpace;

    constructor(private mode: XRSessionMode, private options?: XrSessionOptions) {

    }


    public async manage(viewport: Viewport): Promise<void> {
        if (!navigator.xr) {
            Promise.reject("Navigator does not support XR.");
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
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.layer!.framebuffer);
        console.log(`eyes: ${pose.views.length}`);

        for (const view of pose.views) {
            const vp = this.layer!.getViewport(view)!;
            console.log(`${vp.x},${vp.y}, ${vp.width}, ${vp.height}`);
            gl.viewport(vp.x, vp.y, vp.width, vp.height);

            const qYup = quat.fromValues(
                view.transform.orientation.x,
                view.transform.orientation.y,
                view.transform.orientation.z,
                view.transform.orientation.w
            );

            const qZup = quat.fromValues(qYup[0], -qYup[2], qYup[1], qYup[3]);

            
            const pos = view.transform.position;

            const convertedPos: vec3 = [
                pos.x,      // x stays the same
                -pos.z,     // WebXR z → -Y
                pos.y,      // WebXR y → Z
            ];

            this.viewport.camera.setPosition(
                convertedPos[0],
                convertedPos[1],
                convertedPos[2]
            );

            this.viewport.camera.setRotation(qZup);

            mat4.copy(this.viewport.camera.getProjectionMatrix(), view.projectionMatrix);
            this.viewport.render();
        }



        this.xr!.requestAnimationFrame(this.onXRFrame);
    }




}