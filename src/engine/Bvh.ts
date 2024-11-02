import { vec3 } from "gl-matrix";
import { TriangleMesh } from "./TriangleMesh";
import { BvhNode } from "./BvhNode";
import { Ray } from "./Ray";


type Triangle = {
    /**
     * Index in rawVertex
     */
    v0: number,
    /**
     * Index in rawVertex
     */
    v1: number,
    /**
     * Index in rawVertex
     */
    v2: number,
    centroid: vec3;
}




export class Bvh {

    private primitives: Triangle[];
    private nodes: BvhNode[]

    private rawVertex: Float32Array;
    private rootIndex: number = 0;
    private nodesUsed: number = 1;

    private static maxDepth = 32;





    constructor(mesh: TriangleMesh) {
        this.rawVertex = mesh.getVertexBuffer();

        const faceData = mesh.getElementBuffer();
        const primCount = faceData.length / 3;


        this.primitives = new Array<Triangle>(primCount);
        this.initPrimitives(faceData);

        this.nodes = new Array<BvhNode>(primCount);

        const root: BvhNode = new BvhNode();
        root.firstLeft = 0;
        root.primCount = primCount;
        this.nodes[this.rootIndex] = root;

        this.updateBounds(this.rootIndex);
        this.subdivide(this.rootIndex);

    }


    private initPrimitives(facesRaw: Uint32Array): void {


        for (let i = 0; i < facesRaw.length / 3; i++) {

            const v0Index = facesRaw[i];
            const v1Index = facesRaw[i + 1];
            const v2Index = facesRaw[i + 2];


            const v0: vec3 = [             // only taking position
                this.rawVertex[v0Index*8],
                this.rawVertex[v0Index*8 + 1],
                this.rawVertex[v0Index*8 + 2],
            ];

            const v1: vec3 = [
                this.rawVertex[v1Index*8],
                this.rawVertex[v1Index*8 + 1],
                this.rawVertex[v1Index*8 + 2],
            ];

            const v2: vec3 = [
                this.rawVertex[v2Index*8],
                this.rawVertex[v2Index*8 + 1],
                this.rawVertex[v2Index*8 + 2],
            ];

        

            vec3.add(v0,v0,v1);
            vec3.add(v0, v0, v2);
            
            vec3.scale(v0, v0, 0.3333);

            this.primitives[i] = {
                v0: v0Index,
                v1: v1Index,
                v2: v2Index,
                centroid: v0,
            }


        }

    }


    private updateBounds(index: number) {

        const max = Number.POSITIVE_INFINITY;
        const min = Number.NEGATIVE_INFINITY;

        const node = this.nodes[index];
        vec3.set(node.aabbMin, max, max, max);
        vec3.set(node.aabbMax, min, min, min);

        for (let i = 0; i < node.primCount; i++) {

            const tri = this.primitives[node.firstLeft + i];        // choosen as

            const v0: vec3 = [             // only taking position
                this.rawVertex[tri.v0],
                this.rawVertex[tri.v0 + 1],
                this.rawVertex[tri.v0 + 2],
            ];

            const v1: vec3 = [
                this.rawVertex[tri.v1],
                this.rawVertex[tri.v1 + 1],
                this.rawVertex[tri.v1 + 2],
            ];

            const v2: vec3 = [
                this.rawVertex[tri.v2],
                this.rawVertex[tri.v2 + 1],
                this.rawVertex[tri.v2 + 2],
            ];

            vec3.min(node.aabbMin, node.aabbMin, v0);
            vec3.min(node.aabbMin, node.aabbMin, v1);
            vec3.min(node.aabbMin, node.aabbMin, v2);
            vec3.max(node.aabbMax, node.aabbMax, v0);
            vec3.max(node.aabbMax, node.aabbMax, v1);
            vec3.max(node.aabbMax, node.aabbMax, v2);

        }

    }


    private subdivide(index: number) {

        const node = this.nodes[index];

        if (node.primCount <= 2) {
            throw new Error("eee");
            
            return;}



        const dim = vec3.sub(vec3.create(), node.aabbMax, node.aabbMin);
        let axis = 0;   // [x,y,z]

        if (dim[1] > dim[0]) axis = 1;
        if (dim[2] > dim[axis]) axis = 2;
        let splitPos = node.aabbMin[axis] + dim[axis] * 0.5;

        let i = node.firstLeft;             // primcount > 0 -> firstprim
        let j = i + node.primCount - 1;

        // partition
        while (i <= j) {

            const val = this.primitives[i].centroid[axis]
            
            if (val < splitPos) {
                i++;
            } else {

                // swap
                let temp = this.primitives[i];
                this.primitives[i] = this.primitives[j];
                this.primitives[j] = temp;

                j--;
            }
        }

        const leftCount = i - node.firstLeft;   // primcount > 0 -> firstprim
        if (leftCount === 0 || leftCount === node.primCount) { return; }

        // child creation
        const leftIndex = this.nodesUsed++;
        const rightIndex = this.nodesUsed++;

        this.nodes[leftIndex] = new BvhNode();
        this.nodes[leftIndex].firstLeft = node.firstLeft;       // primcount > 0 -> firstprim
        this.nodes[leftIndex].primCount = leftCount;
        this.nodes[rightIndex] = new BvhNode();
        this.nodes[rightIndex].firstLeft = i;
        this.nodes[rightIndex].primCount = node.primCount - leftCount;
        node.firstLeft = leftIndex;             // primcount > 0 -> firstprim
        node.primCount = 0;


        this.updateBounds(leftIndex);
        this.updateBounds(rightIndex);

        // recursive subdivision
        this.subdivide(leftIndex);
        this.subdivide(rightIndex);



    }


    /**
     * Tests for ray intersection of the closest Triangle within the Bvh
     * @param ray 
     * @returns 
     */
    public intersectionBvh(ray: Ray) {

        const intersectionStack: Uint32Array = new Uint32Array(Bvh.maxDepth);   // depth in a balanced binary Tree.
        const distanceStack: Float32Array = new Float32Array(Bvh.maxDepth);
        let stackElements = 0;                                          // instead of using push / pop because of gpu implementation

        let tmin = { t: Number.MAX_VALUE, u: -1, v: -1, w: -1};


        const root = this.nodes[this.rootIndex];
        const rootIntersection = ray.intersectionAABB(root.aabbMin, root.aabbMax);

        if (rootIntersection) {
            distanceStack[stackElements] = rootIntersection.entry;
            intersectionStack[stackElements++] = this.rootIndex;                 // index in this.nodes
        }

        while (stackElements > 0) {

            if (tmin.t < distanceStack[stackElements-1]) {
                // the closest triangle is closer than the bounding box of the node
                // this basically means there is a triangle obscuring the ray for this aabb
                // since we always push the closest leaf on top of the stack we can return here.
                // overlap would normally interfere with this but: aabb.exit > tmin.t > aabb.entry

                // hopefully this is true

                return tmin;
            }
            console.log(stackElements, intersectionStack);
            const node = this.nodes[intersectionStack[--stackElements]]; // stack pop



            if (node.isLeaf()) {            // node is a leaf -> has primitives
                for (let i = 0; i < node.primCount; i++) {

                    const tcurr = this.intersectionTriangle(ray, node.firstLeft + 1);  // need some logic for barycentric coords and stuff

                    if (tcurr.t >= 0 && tcurr.t < tmin.t) {

                        tmin = tcurr;

                    }
                }
            } else {

                const child1 = this.nodes[node.firstLeft];      // firstChild;
                const child2 = this.nodes[node.firstLeft + 1];    // secondChild

                const t1 = ray.intersectionAABB(child1.aabbMin, child1.aabbMax);
                const t2 = ray.intersectionAABB(child2.aabbMin, child2.aabbMax);

                if (t1 && t2) {     // both intersect

                    if (t1.entry >= 0 && t2.entry >= 0) {                               // ray.origin is outside both children

                        if (t1.entry > t2.entry) {
                            distanceStack[stackElements] = t1.entry;
                            intersectionStack[stackElements++] = node.firstLeft;        // t2 is closer --> on top of stack
                            distanceStack[stackElements] = t2.entry;
                            intersectionStack[stackElements++] = node.firstLeft + 1;
                        } else {                                                        // t1 is closer --> on top of stack
                            distanceStack[stackElements] = t2.entry;
                            intersectionStack[stackElements++] = node.firstLeft + 1;
                            distanceStack[stackElements] = t1.entry;
                            intersectionStack[stackElements++] = node.firstLeft;
                        }

                    } else if (t1.entry < 0 && t2.entry < 0) {                          // ray.origin is inside both children

                        if (t1.exit > t2.exit) {                                        // t2 is closer --> on top of stack
                            distanceStack[stackElements] = t1.entry;                    // not sure if it makes sense to push a negative distance
                            intersectionStack[stackElements++] = node.firstLeft;
                            distanceStack[stackElements] = t2.entry;
                            intersectionStack[stackElements++] = node.firstLeft + 1;
                        } else {                                                        // t1 is closer --> on top of stack
                            distanceStack[stackElements] = t2.entry;                    // not sure if it makes sense to push a negative distance
                            intersectionStack[stackElements++] = node.firstLeft + 1;
                            distanceStack[stackElements] = t1.entry;
                            intersectionStack[stackElements++] = node.firstLeft;
                        }

                    } else if (t1.entry < 0) {                                          // ray.origin is in child1
                        distanceStack[stackElements] = t1.entry;
                        intersectionStack[stackElements++] = node.firstLeft;
                        distanceStack[stackElements] = t2.entry;
                        intersectionStack[stackElements++] = node.firstLeft + 1;
                    } else if (t2.entry < 0) {                                          // ray.origin is in child2
                        distanceStack[stackElements] = t2.entry;
                        intersectionStack[stackElements++] = node.firstLeft + 1;
                        distanceStack[stackElements] = t1.entry;
                        intersectionStack[stackElements++] = node.firstLeft;
                    }

                } else {            // one or zero intersect

                    if (t1) {
                        distanceStack[stackElements] = t1.entry;
                        intersectionStack[stackElements++] = node.firstLeft;
                    }

                    if (t2) {
                        distanceStack[stackElements] = t2.entry;
                        intersectionStack[stackElements++] = node.firstLeft + 1;
                    }
                }



            }

        }







        // there was no premature return --> no triangle intersected

        return -1.0;



    }

    private intersectionTriangle(ray: Ray, triangleIndex: number) {

        const tri = this.primitives[triangleIndex];
        const v0: vec3 = [                             /** @todo i need to refactor stuff like this */
            this.rawVertex[tri.v0 * 8],
            this.rawVertex[tri.v0 * 8 + 1],
            this.rawVertex[tri.v0 * 8 + 2],
        ];

        const v1: vec3 = [
            this.rawVertex[tri.v1 * 8],
            this.rawVertex[tri.v1 * 8 + 1],
            this.rawVertex[tri.v1 * 8 + 2],
        ];

        const v2: vec3 = [
            this.rawVertex[tri.v2 * 8],
            this.rawVertex[tri.v2 * 8 + 1],
            this.rawVertex[tri.v2 * 8 + 2],
        ];

        return ray.intersectTriangle(v0, v1, v2);
    }

    



}