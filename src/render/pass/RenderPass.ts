import { Viewport } from "../../engine/Viewport";
import { Renderer } from '../Renderer';

export abstract class RenderPass {


    constructor (renderer:Renderer, input:PassResource[], output:PassResource[]) {
        this.renderer = renderer;
        this.inputResources = input;
        this.outputResources = output;
    }

    
    /**
     * Represents the resources required for this shader to run. 
     * They are excepted to be available in the shared Resources of {@link renderer}.
     */
    protected inputResources: PassResource[];


    protected renderer : Renderer;

    private passDescriptor: GPURenderPassDescriptor | GPUComputePassDescriptor = {};


    public getDescriptor() : GPURenderPassDescriptor | GPUComputePassDescriptor {
        return  this.passDescriptor;
    }

    private name : string = "";

    public getName():string {
        return this.name;
    }




    /**
     * Represents the resources excepted to be written into shared Resources of {@link renderer}.
     */
    protected outputResources: PassResource[];

    public abstract render(viewport:Viewport):void;

    public getInputResources(): PassResource[] {
        return this.inputResources;
    }

    public getOutputResources(): PassResource[] {
        return this.outputResources;
    }





}