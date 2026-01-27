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
import { Ray } from "./engine/Ray";
import { Util } from "./util/Util";
import { create_tm_mesh, tm_mesh } from "./engine/TMILoader";
import { TMIBvh } from "./engine/TMIBvh";
import { TMIComputePass } from "./render/pass/TMIComputePass";

export class App {
    private static instance: App;


    private constructor() {


        this.currentScene = new Scene();
        this.loadedScenes = [this.currentScene];
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



    private loadedScenes: Scene[];
    private currentScene: Scene;
    public webgpu!: WebGPU;
    public outdated: boolean = true;

    makeMesh(buf:ArrayBuffer): TriangleMesh {
            const vertices = new Uint32Array(buf.slice(0,4))[0]; 
            const faces = new Uint32Array(buf.slice(4,8))[0];

            const h_off = 4*7
            const v_size = 3 * 4 * vertices
            const f_size = 3 * 4 * faces
            console.log(`${vertices} vertices, ${faces} faces, ${buf.byteLength} bytes`);


            const arr = new Float32Array(buf.slice(h_off,h_off+v_size));
            const el = new Uint32Array(buf.slice(h_off+v_size,h_off+v_size+f_size));
            
            const paddedArr = new Float32Array((arr.length / 3) * 8);
            let idx = 0;
            for (let i = 0; i < paddedArr.length; i++) {
                if (i % 8 < 3) {
                    paddedArr[i] = arr[idx++];
                }
            }

            return new TriangleMesh(paddedArr, el);
    }

    initialize = async () => {

        this.webgpu = await WebGPU.init();
        this.currentScene = new Scene();

        const root = ResizableWindow.initializeRootWindow("horizontal");
        const right = root.addChild(0, "horizontal");
        right.setContent(new ViewportWindow());


        //const eptBin: ArrayBuffer = await (await fetch("../assets/models/c5h10_ept_100.bin")).arrayBuffer();
        //const wptBin: ArrayBuffer = await (await fetch("../assets/models/c5h10_wpt_100.bin")).arrayBuffer();
        //const sptBin: ArrayBuffer = await (await fetch("../assets/models/c5h10_spt_100.bin")).arrayBuffer();
        //const dptBin: ArrayBuffer = await (await fetch("../assets/models/c5h10_dpt_100.bin")).arrayBuffer();
//
        //const eptMesh = this.makeMesh(eptBin);
        //const wptMesh = this.makeMesh(wptBin);
        //const sptMesh = this.makeMesh(sptBin);
        //const dptMesh = this.makeMesh(dptBin);
//
        //const ept = new MeshInstance(eptMesh);
        //const wpt = new MeshInstance(wptMesh);
        //const spt = new MeshInstance(sptMesh);
        //const dpt = new MeshInstance(dptMesh);
        //
        //ept.setScale(1/40,1/40,1/80);
        //ept.setPosition(2,2,0);
//
        //wpt.setScale(1/40,1/40,1/160);
        //wpt.setPosition(-7,2,0);
//
        //spt.setScale(1/40,1/40,5/3);
        //spt.setPosition(2,-8.75,0);
//
        //dpt.setScale(1/40,1/40,4/5);
        //dpt.setPosition(-7,-8.75,0);
//
        //this.currentScene.addEntity(ept);
        //this.currentScene.addEntity(wpt);
        //this.currentScene.addEntity(spt);
        //this.currentScene.addEntity(dpt);

        const cubemodel : string = await (await fetch("../assets/models/tree.obj")).text();
        const cube = TriangleMesh.parseFromObj(cubemodel);

        const cent = new MeshInstance(cube);
        //cent.setScale(0.1,0.1,0.1);

        this.currentScene.addEntity(cent);



        //console.log(eptMesh);
        
        //const tmi_mesh : tm_mesh = create_tm_mesh(eptBin);
        //const tmi_bvh : TMIBvh = new TMIBvh(tmi_mesh);
        //const tmi_pass : TMIComputePass = new TMIComputePass(tmi_bvh,10_000_000);

        //const sites = new Float32Array(10_000_000*2);

        //for (let i = 0; i < sites.length/2;i++) {

        //    sites[i*2] = Math.random()*120-60;
        //    sites[i*2+1] = Math.random()*120-60;
        //}


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



