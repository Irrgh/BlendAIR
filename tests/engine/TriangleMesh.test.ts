/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { Bvh } from '../../src/engine/Bvh';
import { TriangleMesh } from "../../src/engine/TriangleMesh";
import { Ray } from '../../src/engine/Ray';


describe("TriangleMesh Class", () => {

    const cubeStr = fs.readFileSync(path.resolve(__dirname,"../../assets/models/cube.obj")).toString();
    const treeStr = fs.readFileSync(path.resolve(__dirname,"../../assets/models/tree.obj")).toString();

    it("Correct cube parsing.", () => {

        const mesh = TriangleMesh.parseFromObj(cubeStr);

        expect(mesh.getElementBuffer().length).toBe(36);
        expect(mesh.getVertexBuffer().length).toBe(192);

    })

    it("Correct vertex buffer size", () => {

        const mesh = TriangleMesh.parseFromObj(treeStr);
        
        const vertexCount = mesh.getElementBuffer().reduce((max,cur) => {return Math.max(cur,max)},-1) +1;

        expect(vertexCount).toBe(mesh.getVertexBuffer().length/8);


    })



})
