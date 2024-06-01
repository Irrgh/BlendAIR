export interface Debugable {

    setDebugValue(name:String,value:String):void;
    setEnabled(enabled:boolean):void;
    getEnabled():void;
    getDebugValues():Map<String,String>;

}