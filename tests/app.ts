import {WebGPU} from "../src/engine/WebGPU";
import {Scene} from "../src/engine/Scene";
import {Viewport} from "../src/engine/Viewport";
import {TriangleMesh} from "../src/engine/TriangleMesh";
import {Util} from "../src/util/Util";
import { MeshInstance } from "../src/entity/MeshInstance";
import { vec3 } from "gl-matrix";


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


    const viewport = new Viewport(webgpu,canvas,scene);


    const model : string = await (await fetch ("../assets/models/suzanne.obj")).text();
    const model1 : string = await (await fetch("../assets/models/cube.obj")).text();

    const mesh : TriangleMesh = TriangleMesh.parseFromObj(model);
    const mesh2 : TriangleMesh = TriangleMesh.parseFromObj(model1);


    console.log("mesh1: ",mesh);
    console.log("mesh2: ",mesh2);





    const entity = new MeshInstance(mesh)
    entity.setPosition(-2,1,1);

    const cube = new MeshInstance(mesh2);
    cube.setPosition(-1,-1,-4);

    
    scene.addEntity(cube);
    scene.addEntity(new MeshInstance(mesh));
    

    scene.addEntity(entity);
    viewport.camera.setPosition(3,2,3);
    console.log(scene.entities);
    
    vec3.normalize(viewport.camera.facing,vec3.fromValues(-1,-1,-1));
    
    //viewport.camera.setOrthographicProjection(400,300,1,1000);

    let t = 0;

    const renderLoop = () => {

        t += 0.01;
        entity.setZRotation(t);


        //console.log("eee");
        viewport.render();
        console.clear();
        requestAnimationFrame(renderLoop)
    }






    button.onclick = () => {

        console.log("button clicked");
        renderLoop();
    }

}

initialize();