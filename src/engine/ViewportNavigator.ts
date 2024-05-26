import { Viewport } from './Viewport';
export abstract class ViewportNavigator {

    protected viewport : Viewport;

    constructor (viewport : Viewport) {
        this.viewport = viewport;
        this.use();
        console.log("bor whar");
    }

    mouseButtonPressed: boolean[] = [];
    isDragging:boolean = false;


    protected keyboardButtonsPressed: Set<String> = new Set<String>;





    use():void {
        console.log("i am doig");
        document.addEventListener("keydown",this.keyPressed);
        document.addEventListener("keyup",this.keyReleased);
        
    }

    stop():void {
        document.removeEventListener("keydown",this.keyPressed);
        document.removeEventListener("keyup",this.keyReleased);
    }

    private keyPressed = (event:KeyboardEvent) => {
        console.log(`${event.code} pressed`);
        this.keyboardButtonsPressed.add(event.code);
    }

    private keyReleased = (event:KeyboardEvent) => {
        console.log(`${event.code} released`);
        this.keyboardButtonsPressed.delete(event.code);
    }

    private mousePressed = (event:MouseEvent) => {
        this.mouseButtonPressed[event.button] = true;
    }

    private mouseReleased = (event:MouseEvent) => {
        this.mouseButtonPressed[event.button] = false;
    }








    protected combinationPressed(...keys:string[]):boolean {
        return keys.reduce((acc:boolean,curr:string) => {
            return acc && this.keyboardButtonsPressed.has(curr);
        },true);
    }






}