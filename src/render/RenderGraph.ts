import { RenderPass } from "./pass/RenderPass";

/**
 * 
 * When rendering multiple different {@link RenderPass} in a {@link Renderer} there are always some dependencies between the used resources
 * used in the different passes. To avoid an conflicts {@link RenderPass} as an interface also defines input and output resources.
 */
export class RenderGraph {

    static topSort(passes:RenderPass[]):RenderPass[] {
        throw new Error("This method is not implemented yet");



        return [];
    }




}


