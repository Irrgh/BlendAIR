import { TriangleMesh } from "../engine/TriangleMesh";
import { Entity } from "./Entity";

export class MeshInstance extends Entity {

    mesh : TriangleMesh

    constructor (mesh : TriangleMesh) {
        super();
        this.mesh = mesh;
    }







}