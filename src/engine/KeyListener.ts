export class KeyListener {

    private constructor() {

        this.keyboardButtonsPressed = new Set<String>();
        document.addEventListener("keydown",this.keyPressed);
        document.addEventListener("keyup",this.keyReleased);


    }

    private static instance : KeyListener;

    private keyboardButtonsPressed : Set<String>;



    public static getInstance():KeyListener {

        if (!KeyListener.instance) {
            KeyListener.instance = new KeyListener();
        }
        return KeyListener.instance;
    }


    private keyPressed = (event:KeyboardEvent) => {
        this.keyboardButtonsPressed.add(event.code);
    }

    private keyReleased = (event:KeyboardEvent) => {
        this.keyboardButtonsPressed.delete(event.code);
    }

    /**
     * Returns true if all supplied {@link keys} are pressed.
     * @param keys Keyboard keys as seen in [MDN Reference](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code)
     * @returns True if all keys are pressed, false if not.
     */
    public static combinationPressed(...keys:string[]):boolean {
        
        const instance = KeyListener.getInstance();
        
        return keys.reduce((acc:boolean,curr:string) => {
            return acc && instance.keyboardButtonsPressed.has(curr);
        },true);
    }















}