import { App } from "../app";
import { Material } from "../engine/Material";
import { TriangleMesh } from "../engine/TriangleMesh";
import { Entity } from "./Entity";

export class MeshInstance extends Entity {

    mesh : TriangleMesh
    material : Material;

    constructor (mesh : TriangleMesh) {
        super();
        this.mesh = mesh;
        this.mesh.addMeshInstance(this);
        this.material = new Material();
    }

}