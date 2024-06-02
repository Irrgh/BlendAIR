import { ContentWindow } from './ContentWindow';


/**
 * Creates a transparent debug window on the contentElement of a ContentWindow.
 * @todo WIP
 */
export class DebugOverlay {

    private window: ContentWindow;
    private debugMap : Map<String,HTMLDivElement>;
    private debugWindow :  HTMLDivElement;

    /** Is `this` enabled or not */
    private enabled: boolean = false;

    constructor (window:ContentWindow) {
        this.window = window;
        this.debugMap = new Map<String,HTMLDivElement>();
        this.debugWindow = document.createElement("div");
    }

    /**
     * Sets if `this` is enabled or not.
     * @param enabled 
     */
    public setEnabled(enabled:boolean):void {
        this.enabled = enabled;
    }

    /**
     * Returns if `this` is enabled or not.
     * @returns the state of {@link enabled}
     */
    public getEnabled():boolean {
        return this.enabled;
    }


    /**
     * Toggles if `this` is enabled or not.
     * @returns the state of {@link enabled} after toggling.
     */
    public toggleEnabled():boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Sets the value for a debug property
     * @param name 
     * @param value 
     */
    public setDebugValue(name:String,value:String) {
        
        let div = this.debugMap.get(name);

        if (!div) {
            div = this.createDebugDiv();
            this.debugMap.set(name,div);
        }
        div.innerText = `${name}: ${value}`
    }


    /**
     * Remove the debug value specified by {@link name}.
     * @param name 
     */
    public removeDebugValue(name:String) {
        const div = this.debugMap.get(name);
        if (div) {
            this.debugWindow.removeChild(div);
            this.debugMap.delete(name);
        } else {
            console.error(`No debug entry with name ${name} exists.`);
        }
    }


    /**
     * Makes the specified debug value invisible.
     * Modifies the `visible` css property.
     * @param name 
     * @param visible 
     */
    public setDebugVisibility(name:String, visible:boolean) {
        const div = this.debugMap.get(name);
        if (div) {
            
            if (visible) {
                div.classList.add("visible");
            } else {
                div.classList.remove("visible");
            }
        } else {
            console.error(`No debug entry with name ${name} exists.`);
        }
    }

    /**
     * Makes the specified debug value invisible.
     * Modifies the `display` css property.
     * @param name 
     * @param display
     */
    public setDebugDisplay(name:String, display:boolean) {
        const div = this.debugMap.get(name);
        if (div) {
            
            if (display) {
                div.classList.add("hidden");
            } else {
                div.classList.remove("hidden");
            }
        } else {
            console.error(`No debug entry with name ${name} exists.`);
        }
    }





    private createDebugDiv ():HTMLDivElement {
        const div = document.createElement("div");
        div.classList.add("debug");
        this.debugWindow.append(div);
        return div;
    }



    

}