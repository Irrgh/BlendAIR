import { vec3 } from "gl-matrix";
import { App } from "../app";

export type Interpolation = "linear" | "bezier"
export type KeyFrame = { frame: number, value: vec3 };

export class AnimationSheet {

    private keyFrames: KeyFrame[];

    private interpolType: Interpolation = "linear";

    constructor(keyframes:KeyFrame[]) {
        if (keyframes.length == 0) {
            this.keyFrames = [{ frame: 0, value: vec3.create() }];
        } else {
            this.keyFrames = keyframes;
        }
    }



    public setInterpolation(type: Interpolation) {
        this.interpolType = type;
    }

    public setKeyframe(value: vec3) {
        this.keyFrames.push({ frame: App.getScene().timeline.getCurrent(), value: value });
        this.keyFrames.sort((a, b) => {
            return a.frame - b.frame;
        });

    }

    public getValue():vec3 {
        return this.getValueAt(App.getScene().timeline.getCurrent());
    }

    private getValueAt(frame: number):vec3 {

        let index = 0;
        let bigger = this.keyFrames[0];

        for (let i = 0; i < this.keyFrames.length; i++) {
            bigger = this.keyFrames[i];
            if (frame <= this.keyFrames[i].frame) {
                index = i;
                break;
            }
        }


        if (index > 0) {
            const smaller = this.keyFrames[index-1];

            const diff = Math.abs(bigger.frame - smaller.frame);
            const t = (frame - smaller.frame) / diff;

            switch (this.interpolType) {
                case "linear":
                    return vec3.lerp(vec3.create(), smaller.value, bigger.value, t);
                case "bezier":
                    const vector = vec3.sub(vec3.create(), bigger.value, smaller.value);
                    const c1 = vec3.add(vec3.create(), smaller.value, vec3.scale(vec3.create(), vector, 0.1));
                    const c2 = vec3.add(vec3.create(), smaller.value, vec3.scale(vec3.create(), vector, 0.9));
                    return vec3.bezier(vec3.create(), smaller.value, c1, c2, bigger.value, t);
            }


        } else {
            return bigger.value;
        }
    }









}