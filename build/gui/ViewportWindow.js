import { Viewport } from "../Viewport.js";
import { ResizableLayout, ResizableType, ResizableWindow } from "./ResizableWindow.js";
export class ViewportWindow extends ResizableWindow {
    constructor() {
        super(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD);
        this.canvas = document.createElement("canvas");
        this.viewport = new Viewport(this.canvas);
        this.div.append(this.canvas);
        this.viewport.clear();
        window.requestAnimationFrame(this.render);
    }
    canvas;
    viewport;
    async render(time) {
        console.log(time);
        //await this.viewport?.clear(Util.randomColor(1));
    }
}
