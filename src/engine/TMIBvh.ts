import { vec3 } from "gl-matrix";
import { tm_mesh } from "./TMILoader";

export type TMIBvhNode = {
    min : vec3,
    first_pc : number,
    max : vec3,
    prim_count: number
}

export type TMITriangle = {
    indices: vec3,
    center: vec3
}

function aabb_center (a: vec3, b: vec3, c: vec3) : vec3{

    const max : vec3 = [-1e30,-1e30,-1e30];
    const min : vec3 = [1e30,1e30,1e30];

    vec3.min(min,min,a);
    vec3.min(min,min,b);
    vec3.min(min,min,c);

    vec3.max(max,max,a);
    vec3.max(max,max,b);
    vec3.max(max,max,c);

    const d : vec3 = [0,0,0];

    vec3.sub(d,max,min);
    vec3.scale(d,d,0.5);
    vec3.add(d,d,min);
    return d;
}



export class TMIBvh {

    public nodes : Array<TMIBvhNode>;
    public tris : Array<TMITriangle>;
    public vertices : Float32Array;
    
    public nodes_used: number;


    constructor (mesh : tm_mesh) {

        for (let i=0; i < mesh.vertices.length; i++) {
            if (isNaN(mesh.vertices[i])) console.log(i);
        }


        this.vertices = new Float32Array(mesh.vertices);
        this.nodes = new Array(mesh.faces.length/3*2-1);
        this.tris = new Array(mesh.faces.length/3);

        this.init_tris(mesh.faces);
        
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i] = {min:[0,0,0],first_pc:0,max:[0,0,0],prim_count:0};
        }

        this.nodes[0].first_pc = 0
        this.nodes[0].prim_count = mesh.faces.length/3;
        this.nodes_used = 1

        this.update_bounds(0);
        this.subdivide(0);

    }

    private init_tris(faces : Uint32Array) {

        for (let i = 0; i < faces.length/3; i++) {
            const tri : TMITriangle = {
                indices : [0,0,0],
                center : [0,0,0]
            }

            tri.indices[0] = faces[i*3]-1;
            tri.indices[1] = faces[i*3+1]-1;
            tri.indices[2] = faces[i*3+2]-1;

            const [a_i, b_i, c_i] = tri.indices;

            const a : vec3 = [
                this.vertices[a_i*3],
                this.vertices[a_i*3+1],
                this.vertices[a_i*3+2]
            ];


            const b : vec3 = [
                this.vertices[b_i*3],
                this.vertices[b_i*3+1],
                this.vertices[b_i*3+2]
            ];

            const c : vec3 = [
                this.vertices[c_i*3],
                this.vertices[c_i*3+1],
                this.vertices[c_i*3+2]
            ];

            if (a.some(isNaN) || b.some(isNaN) || c.some(isNaN)) {
                console.log(a,b,c,tri.indices);
            }



            tri.center = aabb_center(a,b,c);
            this.tris[i] = tri;
        }
    }

    private update_bounds(idx:number) {

        const n = this.nodes[idx];
        vec3.set(n.min,1e30,1e30,1e30);
        vec3.set(n.max,-1e30,-1e30,-1e30);

        for (let i = 0; i < n.prim_count; i++) {

            const tri = this.tris[n.first_pc+i].indices;

            //if (tri.some(isNaN)) {
            //    console.log(n.first_pc+i);
            //}

            const a : vec3 = [
                this.vertices[tri[0]*3],
                this.vertices[tri[0]*3+1],
                this.vertices[tri[0]*3+2]
            ];

            const b : vec3 = [
                this.vertices[tri[1]*3],
                this.vertices[tri[1]*3+1],
                this.vertices[tri[1]*3+2]
            ];

            const c : vec3 = [
                this.vertices[tri[2]*3],
                this.vertices[tri[2]*3+1],
                this.vertices[tri[2]*3+2]
            ];

            vec3.min(n.min,n.min,a);
            vec3.min(n.min,n.min,b);
            vec3.min(n.min,n.min,c);

            vec3.max(n.max,n.max,a);
            vec3.max(n.max,n.max,b);
            vec3.max(n.max,n.max,c);

            


        }
    }

    private subdivide(idx:number) {

        const n = this.nodes[idx];
        if (n.prim_count <= 2) {
            return;
        }

        const dim : vec3 = vec3.sub([0,0,0],n.max,n.min);
        let axis : number = 0;
        if (dim[1] > dim[0]) axis = 1
        if (dim[2] > dim[axis]) axis = 3
        const splitPos = n.min[axis] + dim[axis] * 0.5;

        let i = n.first_pc;
        let j = i + n.prim_count - 1;

        while (i <= j) {
            if (this.tris[i].center[axis] < splitPos) {
                i++;
            } else {
                const tmp = this.tris[i];
                this.tris[i] = this.tris[j];
                this.tris[j] = tmp;
                j--;
            }
        }

        const leftCount = i - n.first_pc;
        if (leftCount == 0 || leftCount == n.prim_count) {
            return;
        }

        const leftIndex = this.nodes_used++;
        const rightIndex = this.nodes_used++;

        this.nodes[leftIndex].first_pc = n.first_pc;
        this.nodes[leftIndex].prim_count = leftCount;
        this.nodes[rightIndex].first_pc = i;
        this.nodes[rightIndex].prim_count = n.prim_count - leftCount;
        n.first_pc = leftIndex;
        n.prim_count = 0;

        this.update_bounds(leftIndex);
        this.update_bounds(rightIndex);

        this.subdivide(leftIndex);
        this.subdivide(rightIndex);

    }

}