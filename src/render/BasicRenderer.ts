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


    /**
     * Updates the mesh
     * @param viewport 
     */
    public updateMeshBuffer (viewport):void {





    } 








    public render(viewport:Viewport): void {
        
        this.updateCameraData(viewport);


        const sorted = RenderGraph.topSort(this.passes);


        this.passes.forEach((pass:RenderPass) => {

            pass.render(this,viewport);

        });

    }










}