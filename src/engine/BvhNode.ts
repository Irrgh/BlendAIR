import { vec3 } from "gl-matrix";

export class BvhNode  {
    
    aabbMin: vec3;
    aabbMax: vec3;
    /**
     * Index of either leftChild or first primitive based on {@link Bvh.isLeaf}
     */
    firstLeft: number;
    primCount: number;

    constructor () {
        this.aabbMin = vec3.create();
        this.aabbMax = vec3.create();
        this.firstLeft = 0;
        this.primCount = 0;
    }
    
    isLeaf() {
        return this.primCount > 0;
    }
    
}