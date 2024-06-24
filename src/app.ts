import { WebGPU } from "./engine/WebGPU";
import { Scene } from "./engine/Scene";
import { Viewport } from './engine/Viewport';
import { TriangleMesh } from "./engine/TriangleMesh";
import { MeshInstance } from "./entity/MeshInstance";
import { quat, vec3 } from "gl-matrix";
import { ResizableWindow } from './gui/ResizableWindow';
import { ViewportWindow } from "./gui/ViewportWindow";
import { Entity } from "./entity/Entity";

export class App {
    private static instance: App;
    
    
    private constructor () {

        this.loadedScenes = new Array();
        this.currentScene = new Scene();
    }

    
    public static getInstance():App {

        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    /**
     * Returns the current {@link GPUDevice} of the {@link WebGPU} instance.
     * @returns 
     */
    public static getRenderDevice():GPUDevice {
        return App.getInstance().webgpu.getDevice();
    }

    public static getWebGPU():WebGPU {
        return App.getInstance().webgpu;
    }





    private loadedScenes : Scene[];
    public currentScene : Scene;
    public webgpu! : WebGPU;




    initialize = async () => {

        this.webgpu = await WebGPU.initializeInstance();
        this.currentScene = new Scene();

        const root = ResizableWindow.initializeRootWindow("horizontal");
        const right = root.addChild(0,"horizontal");
        const left = root.addChild(0,"vertical",800);
        left.addChild(0,"horizontal");
        const child2 = left.addChild(0,"horizontal",600);

        child2.setContent(new ViewportWindow());

    
        const model: string = await (await fetch("../assets/models/suzanne_smooth.obj")).text();
        const model1: string = await (await fetch("../assets/models/cube.obj")).text();
    
        const mesh: TriangleMesh = TriangleMesh.parseFromObj(model);
        const mesh2: TriangleMesh = TriangleMesh.parseFromObj(model1);

        console.log("mesh1: ", mesh);
        console.log("mesh2: ", mesh2);
    
    
        for (let i = 0; i < 10000; i++) {
    
            let entity : MeshInstance;
    
            Math.random() < 0.5 ? entity = new MeshInstance(mesh) : entity = new MeshInstance(mesh2);
            entity.setPosition(Math.random()*10-2.5,Math.random()*10-2.5,Math.random()*10-2.5);
            entity.scale = [0.1,0.1,0.1];
            entity.setFacing(vec3.random([0,0,0]));
            this.currentScene.addEntity(entity);
    
        }
    
        this.currentScene.entities.forEach( (entity : Entity, uuid : String) => {
            const increment = quat.setAxisAngle(quat.create(),entity.getForward(),0.01);
            quat.multiply(entity.rotation,increment,entity.rotation);
            quat.normalize(entity.rotation,entity.rotation);
        })
        
        this.currentScene.viewports.forEach((viewport:Viewport) => {
            requestAnimationFrame(viewport.render);
        })

    
    }

}

const app = App.getInstance();
app.initialize();



