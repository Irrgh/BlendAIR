import { ContentWindow } from "./ContentWindow";
import { ResizableWindow } from "./ResizableWindow";
import { Viewport } from '../engine/Viewport';
import { App } from '../app';
import { BlenderNavigator } from "../engine/BlenderNavigator";
import { quat } from "gl-matrix";
import { MeshInstance } from "../entity/MeshInstance";
import { TriangleMesh } from "../engine/TriangleMesh";

export class ViewportWindow extends ContentWindow {


    constructor() {

        const canvas = document.createElement("canvas");

        const app: App = App.getInstance();
        const viewport = new Viewport(App.getWebGPU(), canvas, app.currentScene);


        super(canvas);

        this.viewport = viewport;
        this.canvas = canvas;
        this.viewport.setNavigator(new BlenderNavigator(viewport));

        const importButton = document.createElement("button");
        importButton.innerText = "Import .obj";
        importButton.classList.add("window-header-element");
        importButton.addEventListener("click", async () => {
            const fileHandle = (await window.showOpenFilePicker())[0];
            const file = await fileHandle.getFile();
            const model = await file.text();
            console.log("parsing starts now");

            console.time("import parsing");
            const mesh = TriangleMesh.parseFromObj(model);
            console.timeEnd("import parsing");
            
            const scene = App.getInstance().currentScene;
            const entity : MeshInstance = new MeshInstance(mesh);
            scene.addEntity(entity);


        });

        this.headerElement.append(importButton);





        const button = document.createElement("button");
        button.innerText = "Check shader";
        button.classList.add("window-header-element");
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