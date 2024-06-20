import { Renderer } from "./Renderer";
import { Viewport } from '../engine/Viewport';
import { TrianglePass } from "./pass/TrianglePass";
import { RenderPass } from "./pass/RenderPass";
import { RenderGraph } from "./RenderGraph";
import { MeshInstance } from "../entity/MeshInstance";
import { Entity } from "../entity/Entity";
import { TriangleMesh } from "../engine/TriangleMesh";
import { App } from "../app";

export class BasicRenderer extends Renderer {
    
    constructor (viewport:Viewport) {
        super("basic",viewport);
        this.passes = [new TrianglePass()]
        
    }


    








    public render(): void {
        
        const sorted = RenderGraph.topSort(this.passes);


        this.passes.forEach((pass: RenderPass) => {

            pass.render(this,this.viewport);

        });

    }










}