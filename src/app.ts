import { WebGPU } from "./engine/WebGPU";
import { Scene } from "./engine/Scene";
import { Viewport } from './engine/Viewport';
import { TriangleMesh } from "./engine/TriangleMesh";
import { MeshInstance } from "./entity/MeshInstance";
import { quat, vec3 } from "gl-matrix";
import { ResizableWindow } from './gui/ResizableWindow';
import { ViewportWindow } from "./gui/ViewportWindow";
import { Entity } from "./entity/Entity";
import { TimelineWindow } from "./gui/TimelineWindow";
import { AnimationSheet } from "./engine/AnimationSheet";
import { Bvh } from "./engine/Bvh";

import { Util } from "./util/Util";
import { create_tm_mesh, tm_mesh } from "./engine/TMILoader";
import { TMIBvh } from "./engine/TMIBvh";
import { TMIComputePass } from "./render/pass/TMIComputePass";
import { Ray } from "./engine/Acceleration";

export class App {
    private static instance: App;

    private constructor() {

    }


    public static getInstance(): App {

        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    /**
     * Returns the current {@link GPUDevice} of the {@link WebGPU} instance.
     * @returns 
     */
    public static getRenderDevice(): GPUDevice {
        return App.getInstance().webgpu.getDevice();
    }

    public static getWebGPU(): WebGPU {
        return App.getInstance().webgpu;
    }

    public static getScene(): Scene {
        return App.getInstance().currentScene;
    }



    private loadedScenes!: Scene[];
    private currentScene!: Scene;
    public webgpu!: WebGPU;
    public outdated: boolean = true;

    loadModel = async (path: string) => {
        const raw: string = await (await fetch(path)).text();
        const mesh = TriangleMesh.parseFromObj(raw);
        return mesh;
    }

    initialize = async () => {

        this.webgpu = await WebGPU.init();
        this.currentScene = new Scene();

        const root = ResizableWindow.initializeRootWindow("horizontal");
        const right = root.addChild(0, "horizontal");
        right.setContent(new ViewportWindow());

        const cube: TriangleMesh = await this.loadModel("../assets/models/cube.obj");
        const tree: TriangleMesh = await this.loadModel("../assets/models/tree.obj");
        const plane: TriangleMesh = await this.loadModel("../assets/models/plane.obj");
        const suzanne: TriangleMesh = await this.loadModel("../assets/models/suzanne.obj");


        const p1 = new MeshInstance(plane);
        p1.setScale(5,5,1);
        p1.setPosition(0,0,0.01);

        this.currentScene.addEntity(p1);

        const s1 = new MeshInstance(suzanne);
        s1.setPosition(-0.7, -1.7, 0.5);
        s1.setScale(0.5,0.5,0.5);
        s1.setYRotation(Math.PI / 7);
        this.currentScene.addEntity(s1);

        const c1 = new MeshInstance(cube);
        c1.setPosition(1.2, 1.2, 0.4);
        c1.setScale(0.5,0.5,0.4);

        const c2 = new MeshInstance(cube);
        c2.setPosition(-2.4, 1.3, 0.5);
        c1.setScale(1,1,0.5);
        c2.setZRotation(Math.PI / 4);

        this.currentScene.addEntity(c1);
        this.currentScene.addEntity(c2);
        
        const t1 = new MeshInstance(tree);
        t1.setPosition(1.3, 1.1, 0.8);
        t1.setScale(0.3,0.3,0.3);

        this.currentScene.addEntity(t1);



        //console.log(eptMesh);

        //const tmi_mesh : tm_mesh = create_tm_mesh(eptBin);
        //const tmi_bvh : TMIBvh = new TMIBvh(tmi_mesh);
        //const tmi_pass : TMIComputePass = new TMIComputePass(tmi_bvh,10_000_000);

        //const sites = new Float32Array(10_000_000*2);

        //for (let i = 0; i < sites.length/2;i++) {

        //    sites[i*2] = Math.random()*120-60;
        //    sites[i*2+1] = Math.random()*120-60;
        //}


        let dir : vec3 = vec3.normalize(vec3.create(),[-1,-2,-3]);
        let inv_dir : vec3 = vec3.inverse(vec3.create(),dir);
        let pos : vec3 = [0,0,0.5];
        
        let ray : Ray = {
            origin:pos,
            dir,
            inv_dir,
        }

        //console.log(await this.currentScene.accel.intersect([ray]));



        console.log(App.getRenderDevice().adapterInfo);

        //console.time("gpu sampling");
        //const res = await tmi_pass.sample(sites);
        //console.timeEnd("gpu sampling")
        //console.log(res);

        this.outdated = true;

        this.currentScene.viewports.forEach((viewport: Viewport) => {
            requestAnimationFrame(viewport.render);
        })


    }

}

const app = App.getInstance();
app.initialize();



