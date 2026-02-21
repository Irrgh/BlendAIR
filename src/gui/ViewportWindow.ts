import { ContentWindow } from "./ContentWindow";
import { ResizableWindow } from "./ResizableWindow";
import { Viewport } from '../engine/Viewport';
import { App } from '../app';
import { MeshInstance } from "../entity/MeshInstance";
import { TriangleMesh } from "../engine/TriangleMesh";
import { BlenderController } from '../input/BlenderController';
import { Controller } from "../engine/Controller";
import { XrController } from "../engine/XrController";

export class ViewportWindow extends ContentWindow {

    controller : Controller


    constructor() {

        
        const canvas = document.createElement("canvas");
        super(canvas);

        const app: App = App.getInstance();

        this.controller = new BlenderController();

        const viewport = new Viewport(canvas, App.getScene(),true);

        this.controller.manage(viewport);


        //const session : WebXRSession = new WebXRSession(viewport,"immersive-vr");
        

        this.viewport = viewport;
        this.canvas = canvas;
        this.canvas.tabIndex = 0;

        const importButton = document.createElement("abbr");
        importButton.title = "Import .obj 3d-models from a file";
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

            const scene = App.getScene()
            const entity: MeshInstance = new MeshInstance(mesh);
            scene.addEntity(entity);
            App.getInstance().outdated = true;
            requestAnimationFrame(this.viewport.render);

        });

        this.headerElement.append(importButton);

        const button = document.createElement("abbr");
        button.title = "This is mainly meant as a debug tool to check wgsl shaders since the vscode wgsl language server extensions are very cryptic in their descriptions"
        button.innerText = "Check shader";
        button.classList.add("window-header-element");
        button.addEventListener("click", async () => {
            const fileHandle = (await window.showOpenFilePicker())[0];
            const file = await fileHandle.getFile();


            const shader = await (file).text();

            const shaderModule = app.webgpu.getDevice().createShaderModule({
                code: shader
            });

            if ((await shaderModule.getCompilationInfo()).messages.length == 0) {
                console.warn(`${file.name} compiled without errors!`)
            }


        });

        this.headerElement.append(button);

        const btn = document.createElement("button");
        btn.innerText = "enter vr"
        btn.classList.add("window-header-element");
        btn.addEventListener("click", () => {
            const xrController = new XrController("immersive-vr",{
                requiredFeatures: ["local-floor"]
            });
            xrController.manage(viewport);


        });

        this.headerElement.append(btn);

        canvas.addEventListener("drop", async (ev) => {
            ev.preventDefault();

            console.log(ev.dataTransfer?.files);

            if (!ev.dataTransfer?.files) {
                return;
            }

            const len = ev.dataTransfer.files.length;
            const files = Array.from(ev.dataTransfer.files);

            for (let i = 0; i < len; i++) {

                const file = files[i];

                console.log(file?.name);

                if (file && file.name.endsWith(".obj")) {

                    const model = await file.text();

                    console.log("parsing starts now");

                    console.time("import parsing");
                    const mesh = TriangleMesh.parseFromObj(model);
                    console.timeEnd("import parsing");

                    const scene = App.getScene()
                    const entity: MeshInstance = new MeshInstance(mesh);
                    scene.addEntity(entity);
                    requestAnimationFrame(this.viewport.render);

                }

            }

        })

        canvas.ondragover = (ev) => {
            ev.preventDefault();
        }

    }

    private canvas: HTMLCanvasElement;
    private viewport: Viewport;

    resize(width: number, height: number): void {
        this.viewport.resize(width, height - ResizableWindow.MINIMUM_DIMENSIONS);
    }

}