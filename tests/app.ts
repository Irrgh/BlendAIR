import { WebGPU } from "../src/engine/WebGPU";
import { Scene } from "../src/engine/Scene";
import { Viewport } from "../src/engine/Viewport";
import { TriangleMesh } from "../src/engine/TriangleMesh";
import { Util } from "../src/util/Util";
import { MeshInstance } from "../src/entity/MeshInstance";
import { quat, vec3 } from "gl-matrix";
import { BlenderNavigator } from '../src/engine/BlenderNavigator';


const initialize = async () => {

    const webgpu = await WebGPU.initializeInstance()

    const scene = new Scene();

    const canvas = document.createElement("canvas");
    canvas.height = 600;
    canvas.width = 800;
    document.body.append(canvas);

    const button = document.createElement("button");
    button.style.width = "50px";
    button.style.height = "50px";
    button.innerText = "Click to render";

    document.body.append(button);


    const viewport = new Viewport(webgpu, canvas, scene);
    viewport.setNavigator(new BlenderNavigator(viewport));

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
        vec3.random(entity.facing,1);
        scene.addEntity(entity);



    }


    

    vec3.normalize(viewport.camera.facing, vec3.fromValues(-1, -1, -1));

    //viewport.camera.setOrthographicProjection(400,300,1,1000);

    let t = 0;

    const renderLoop = () => {

        t += 0.01;
        
        scene.entities.forEach( (entity : MeshInstance, uuid : String) => {
            quat.setAxisAngle(entity.rotation,entity.facing,t);
        })

        
        const startTime = performance.now();
        //console.log("eee");
        viewport.render();

        console.log(`render time in ms: ${performance.now() - startTime}`);

        console.clear();
        requestAnimationFrame(renderLoop)
    }





    button.onclick = () => {

        console.log("button clicked");
        renderLoop();
    }

}

initialize();