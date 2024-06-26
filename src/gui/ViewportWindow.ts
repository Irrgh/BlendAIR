import { ContentWindow } from "./ContentWindow";
import { ResizableWindow } from "./ResizableWindow";
import { Viewport } from '../engine/Viewport';
import { App } from '../app';
import { BlenderNavigator } from "../engine/BlenderNavigator";
import { quat } from "gl-matrix";

export class ViewportWindow extends ContentWindow {


    constructor() {

        const canvas = document.createElement("canvas");

        const app: App = App.getInstance();
        console.log(app.webgpu, app.currentScene);
        const viewport = new Viewport(app.webgpu, canvas, app.currentScene);

        console.log(viewport);

        super(canvas);

        this.viewport = viewport;
        this.canvas = canvas;
        this.viewport.setNavigator(new BlenderNavigator(viewport));
        quat.setAxisAngle(viewport.camera.rotation, [-1, -1, -1], 0);


        const button = document.createElement("button");
        button.innerText = "Check shader";
        button.addEventListener("click",  async () => {
            const fileHandle = (await window.showOpenFilePicker())[0];
            const file = await fileHandle.getFile();


            const shader = await(file).text();

            const shaderModule = app.webgpu.getDevice().createShaderModule({
                code: shader
            });

            if ((await shaderModule.getCompilationInfo()).messages.length == 0) {
                console.warn(`${file.name} compiled without errors!`)
            }


        });
        this.headerElement.append(button);










    }

    private canvas: HTMLCanvasElement;
    private viewport: Viewport;







    resize(width: number, height: number): void {

        this.viewport.resize(width, height - ResizableWindow.MINIMUM_DIMENSIONS);


    }












}