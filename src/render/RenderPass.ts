import { Renderer } from "./Renderer";

export interface RenderPass {

    render(renderer : Renderer):void;
    inputResources():PassResource[];
    outputResources():PassResource[];



}