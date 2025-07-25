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



    initialize = async () => {

        this.webgpu = await WebGPU.init();
        this.currentScene = new Scene();


        const root = ResizableWindow.initializeRootWindow("horizontal");
        const right = root.addChild(0, "horizontal");
        const left = root.addChild(0, "vertical", 1500);
        const child1 = left.addChild(0, "horizontal");
        const child2 = left.addChild(0, "horizontal", 700);

        child1.setContent(new TimelineWindow());
        child2.setContent(new ViewportWindow());




        function makeMesh(buf:ArrayBuffer): TriangleMesh {
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

            for (let i = 0; i < el.length; i++) {
                el[i] = el[i] - 1
            } 


            for (let i = 0; i < el.length/3; i++) {
                let [a, b, c] = el.slice(i * 3, i * 3 + 3);
                let p0: vec3 = arr.slice(a * 3, a * 3 + 3);
                let p1: vec3 = arr.slice(b * 3, b * 3 + 3);
                let p2: vec3 = arr.slice(c * 3, c * 3 + 3);
                let v10 = vec3.normalize(vec3.create(),vec3.sub(vec3.create(), p1, p0));
                let v20 = vec3.normalize(vec3.create(),vec3.sub(vec3.create(), p2, p0));
                let cross = vec3.cross(vec3.create(), v10, v20);
                paddedArr[a * 8 + 3] = cross[0];
                paddedArr[a * 8 + 4] = cross[1];
                paddedArr[a * 8 + 5] = cross[2];
            }

            const a : any[] = [];
            const s : Set<number> = new Set();
            for (var i = 0; i < el.length;i++) {
                if (el[i] >= arr.length/3) {
                    a.push({val:el[i], idx:i});
                    
                }
                s.add(el[i]);
            }
            console.log(a);

            return new TriangleMesh(paddedArr, el);
        }


        const buf: ArrayBuffer = await (await fetch("../assets/models/200x200_0.01.bin")).arrayBuffer();

        const md0 = makeMesh(buf);

        const ed0 = new MeshInstance(md0);

        
        ed0.setScale(.25,.25,.25);
        
        ed0.setPosition(0,0,0.1);

        this.currentScene.addEntity(ed0);
        
        console.log(md0);
        
        const tmi_mesh : tm_mesh = create_tm_mesh(buf);
        const tmi_bvh : TMIBvh = new TMIBvh(tmi_mesh);
        const tmi_pass : TMIComputePass = new TMIComputePass(tmi_bvh,100_000_000);

        const sites = new Float32Array(100_000_000*2);

        for (let i = 0; i < sites.length/2;i++) {

            sites[i*2] = Math.random()*120-60;
            sites[i*2+1] = Math.random()*120-60;
        }


        console.log(App.getRenderDevice().adapterInfo);

        console.time("gpu sampling");
        const res = await tmi_pass.sample(sites);
        console.timeEnd("gpu sampling");

        console.log(res);

        this.outdated = true;

        this.currentScene.viewports.forEach((viewport: Viewport) => {
            requestAnimationFrame(viewport.render);
        })


    }

}

const app = App.getInstance();
app.initialize();



