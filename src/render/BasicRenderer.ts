import { Renderer } from "./Renderer";
import { Viewport } from '../engine/Viewport';
import { TrianglePass } from "./pass/TrianglePass";
import { RenderPass } from "./pass/RenderPass";
import { RenderGraph } from "./RenderGraph";

export class BasicRenderer extends Renderer {
    
    constructor () {
        super("basic");
        this.passes = [new TrianglePass()]
    }

    public render(viewport:Viewport): void {
        
        const sorted = RenderGraph.topSort(this.passes);


        this.passes.forEach((pass:RenderPass) => {

            pass.render(this,viewport);

        });

    }










}