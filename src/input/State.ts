export abstract class State {

    public abstract name : string;
    public abstract abort():void;
    public abstract finalize():void;
    public abstract handlePointerMove(event:PointerEvent):void;


}