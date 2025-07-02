import { Bvh } from "../../engine/Bvh";
import { RenderPass } from "./RenderPass";
import { App } from "../../app";

const tri_byte_size = 32;
const vert_byte_size = 16;
const node_byte_size = 32;
const in_byte_size = 8;
const out_byte_size = 4;

export class TMIComputePass {

    private triBuffer : ArrayBuffer;
    private nodeBuffer : ArrayBuffer;
    private vertBuffer : ArrayBuffer;

    
    constructor(bvh: Bvh) {




    }


    public submitBVH(bvh : Bvh) {






    }







}