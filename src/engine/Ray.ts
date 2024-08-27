import { vec3 } from "gl-matrix";

export class Ray {

    public dir : vec3;
    public origin : vec3;
    private static epsilon = 1e-8;

    constructor (dir?:vec3,origin?:vec3) {
        this.dir = dir || vec3.create();
        this.origin = origin || vec3.create();
    }


    /**
     * Checks intersection with the triangle constructed from ``v0, v1, v2``
     * @param v0 first vertex
     * @param v1 second vertex
     * @param v2 third vertex
     * @returns distance and barycentric coordinates of intersection 
     */
    public intersectTriangle(v0:vec3,v1:vec3,v2:vec3) {

        const ab = vec3.sub(vec3.create(),v1,v0);
        const ac = vec3.sub(vec3.create(),v2,v0);
        const p = vec3.cross(vec3.create(),this.dir,ac);
        const det = vec3.dot(ab,p);                       // parallel test

        if (Math.abs(det) < Ray.epsilon) {
            return {t:-1.0,u:-1.0,v:-1.0,w:-1.0};
        }

        const invDet = 1.0 / det;
        const t = vec3.sub(vec3.create(),this.origin,v0);
        const u = vec3.dot(t,p) * invDet;

        if (u < 0.0 || u > 1.0) {   // is u outside triangle
            return {t:-1.0,u:-1.0,v:-1.0,w:-1.0};
        }

        const q = vec3.cross(vec3.create(),t,ab);
        const v = vec3.dot(this.dir, q) * invDet;

        if (v < 0.0 || u + v > 1.0) {   // is v outside triangle
            return {t:-1.0,u:-1.0,v:-1.0,w:-1.0};
        }

        const distance = vec3.dot(ac,q) * invDet;
        if (distance < 0.0) {
            return {t:-1.0,u:-1.0,v:-1.0,w:-1.0};
        }

        const w = 1.0 - u - v;

        return {t:distance,u:u,v:v,w:w};

    }


    public intersectionAABB(aabbMin: vec3, aabbMax: vec3) {

        const invDir = vec3.inverse(vec3.create(),this.dir);

        const tx1 = (aabbMin[0] - this.origin[0]) * invDir[0];
        const tx2 = (aabbMax[0] - this.origin[0]) * invDir[0];

        let tmin = Math.min(tx1,tx2);
        let tmax = Math.max(tx1,tx2);

        const ty1 = (aabbMin[1] - this.origin[1]) * invDir[1];
        const ty2 = (aabbMax[1] - this.origin[1]) * invDir[1];

        tmin = Math.max(tmin,Math.min(ty1,ty2));
        tmax = Math.min(tmax,Math.max(ty1,ty2));

        const tz1 = (aabbMin[2] - this.origin[2]) * invDir[2];
        const tz2 = (aabbMax[2] - this.origin[2]) * invDir[2];

        tmin = Math.max(tmin,Math.min(tz1,tz2));
        tmax = Math.min(tmax,Math.max(tz1,tz2));

        if (tmax < 0 || tmin > tmax) {
            return;         // no intersection
        }

        return {entry:tmin,exit:tmax};



    }





}