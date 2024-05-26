import { ViewportNavigator } from "./ViewportNavigator";
import { Viewport } from './Viewport';
import { mat4, vec2, vec3 } from "gl-matrix";

export class BlenderNavigator extends ViewportNavigator {

    constructor(viewport: Viewport) {
        super(viewport);
        this.cameraOrbitDistance = vec3.distance(this.viewport.camera.position,this.cameraOrbitCenter);
    }

   private cameraOrbitCenter : vec3 = [0,0,0]; 
   private cameraOrbitDistance : number;



    use(): void {
        super.use();

        this.viewport.canvas.addEventListener("contextmenu", this.disableContextmenu);
        


        this.viewport.canvas.addEventListener("mousedown", this.mouseMove);

        this.viewport.canvas.addEventListener("wheel", (event : WheelEvent) => {

            console.log(event.deltaY);
            this.cameraOrbitDistance +=  Math.log(this.cameraOrbitDistance) * event.deltaY * 0.001;

            const camera = this.viewport.camera;

            const offset = vec3.scale([0,0,0],camera.facing,-this.cameraOrbitDistance);

            camera.position = vec3.add([0,0,0],this.cameraOrbitCenter,offset);
            console.log(camera.position);

        });





    }
    stop(): void {
        throw new Error("Method not implemented.");
    }


    disableContextmenu(event: MouseEvent) {
        event.preventDefault();
    }

    mouseMove = async (event: MouseEvent) => {
        event.preventDefault();






        if ((event.button === 1 || (event.button === 0 && this.keyboardButtonsPressed.has("AltLeft")))) {

            await this.viewport.canvas.requestPointerLock();

        
            let u = this.viewport.camera.getRightVector();
            let v = this.viewport.camera.getUpVector();

            const pointerMove = (event:PointerEvent) => {

                const diff = vec2.fromValues(event.movementX, event.movementY);

                const facing = this.viewport.camera.facing;

                


                vec3.scale(u, u, diff[0] * this.cameraOrbitDistance);
                vec3.scale(v, v, diff[1] * this.cameraOrbitDistance);
                


                vec3.add(u, u, v);

                vec3.scale(u, u, -1 / 1000);

                vec3.add(this.viewport.camera.position, u, this.viewport.camera.position);
                vec3.add(this.cameraOrbitCenter,u,this.cameraOrbitCenter);
            }

            const pointerRotate = (event:PointerEvent) => {

                const diff = vec2.fromValues(event.movementX, event.movementY);

                // build orbit please





            }






            this.viewport.canvas.addEventListener("pointermove", pointerMove);


            this.viewport.canvas.addEventListener("pointerup", (event: PointerEvent) => {

                this.viewport.canvas.removeEventListener("pointermove",pointerMove);
                document.exitPointerLock();

            });


        } 

        



    }

    









}