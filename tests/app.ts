import {WebGPU} from "../src/engine/WebGPU";
import {Scene} from "../src/engine/Scene";
import {Viewport} from "../src/engine/Viewport";
import {TriangleMesh} from "../src/engine/TriangleMesh";
import {Util} from "../src/util/Util";


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


    button.onclick = () => {

        console.log("button clicked");
        viewport.render();
    }

    const model : string = await (await fetch ("../assets/models/cube.obj")).text();


    const mesh : TriangleMesh = TriangleMesh.parseFromObj(model);

    console.log(mesh);



}

initialize();