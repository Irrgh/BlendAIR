export class Timeline {

    private current : number = 0;
    private fps : number = 24;

    private first : number = 0;
    private last : number = 250;


    constructor() {}

    public getFirst ():number {
        return this.first;
    }

    public getLast():number {
        return this.last;
    }


    public getCurrent():number {
        return this.current;
    }

    public setCurrent(frame:number) {
        this.current = frame;
    }

    public getFps(): number {
        return this.fps
    }


}