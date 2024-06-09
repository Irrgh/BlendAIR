import { WebGPU } from "./engine/WebGPU";
import { Scene } from "./engine/Scene";
import { Viewport } from './engine/Viewport';
import { TriangleMesh } from "./engine/TriangleMesh";
import { Util } from "./util/Util";
import { MeshInstance } from "./entity/MeshInstance";
import { quat, vec3 } from "gl-matrix";
import { BlenderNavigator } from './engine/BlenderNavigator';
import { KeyListener } from './engine/KeyListener';
import { Navigator } from "./engine/Navigator";
import { ResizableWindow } from './gui/ResizableWindow';
import { ViewportWindow } from "./gui/ViewportWindow";


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

    private loadedScenes : Scene[];
    public currentScene : Scene;
    public webgpu! : WebGPU;




    initialize = async () => {

        this.webgpu = await WebGPU.initializeInstance();
        this.currentScene = new Scene();

        if (true) {
        const root = ResizableWindow.initializeRootWindow("horizontal");
        root.addChild(0);
        root.addChild(0,100);
        const child2 = root.addChild(1,200);

        child2.setContent(new ViewportWindow());

        }



        
    
        
    
        const canvas = document.createElement("canvas");
        canvas.height = 600;
        canvas.width = 800;
        document.body.append(canvas);
    
        const button = document.createElement("button");
        button.style.width = "50px";
        button.style.height = "50px";
        button.innerText = "Click to render";
    
        document.body.append(button);
    
    
        //const viewport = new Viewport(this.webgpu, canvas, this.currentScene);
        //viewport.setNavigator(new BlenderNavigator(viewport));
    
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
            vec3.scale(entity.scale,entity.scale,0.1);
            
            entity.setFacing(vec3.random([0,0,0]));

            this.currentScene.addEntity(entity);
    
    
    
        }
    
        this.currentScene.entities.forEach( (entity : MeshInstance, uuid : String) => {


            const increment = quat.setAxisAngle(quat.create(),entity.getForward(),0.01);
            quat.multiply(entity.rotation,increment,entity.rotation);
            quat.normalize(entity.rotation,entity.rotation);
        })
        
    
        //quat.setAxisAngle(viewport.camera.rotation,[-1,-1,-1],0);
    
        //viewport.camera.setOrthographicProjection(400,300,1,1000);
    
        let t = 0;
    
        const renderLoop = () => {
    
            t += 0.01;
            
            this.currentScene.entities.forEach( (entity : MeshInstance, uuid : String) => {


                const increment = quat.setAxisAngle(quat.create(),entity.getForward(),0.01);
                quat.multiply(entity.rotation,increment,entity.rotation);
                quat.normalize(entity.rotation,entity.rotation);
            })
    
            
            const startTime = performance.now();
            //viewport.render();
    
            console.log(`render time in ms: ${performance.now() - startTime}`);
    
            console.clear();
            requestAnimationFrame(renderLoop)
        }
    
    
    
    
    
        button.onclick = () => {
    
            console.log("button clicked");
            renderLoop();
        }
    
    }













}

const app = App.getInstance();
app.initialize();




