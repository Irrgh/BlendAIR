import { ContentWindow } from "./ContentWindow";
import { ResizableWindow } from "./ResizableWindow";
import { Viewport} from '../engine/Viewport';
import { App } from '../app';
import { BlenderNavigator } from "../engine/BlenderNavigator";
import { quat } from "gl-matrix";

export class ViewportWindow extends ContentWindow {
    
    
    constructor () {

        const canvas = document.createElement("canvas");

        const app : App = App.getInstance();
        console.log(app.webgpu,app.currentScene);
        const viewport = new Viewport(app.webgpu,canvas,app.currentScene);

        console.log(viewport);

        super(canvas);

        this.viewport = viewport;
        this.canvas = canvas;
        this.viewport.setNavigator(new BlenderNavigator(viewport));
        quat.setAxisAngle(viewport.camera.rotation,[-1,-1,-1],0);
    }
    
    private canvas : HTMLCanvasElement;
    private viewport : Viewport;
    
    
    
    
    
    
    
    resize(width: number, height: number): void {
        
        this.viewport.resize(width,height-50);


    }












}