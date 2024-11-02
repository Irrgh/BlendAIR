/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { Bvh } from '../../src/engine/Bvh';
import { TriangleMesh } from "../../src/engine/TriangleMesh";
import { Ray } from '../../src/engine/Ray';




describe("Bvh Class", () => {

    const cubeStr = fs.readFileSync(path.resolve(__dirname,"../../assets/models/cube.obj")).toString();


    
    it("Correct Construction", () => {

        
        const mesh = TriangleMesh.parseFromObj(cubeStr);

        const bvh = new Bvh(mesh);
        const ray = new Ray();

        const value = bvh.intersectionBvh(ray);

        expect(value).toBeInstanceOf(Object);
        expect(value).toHaveProperty(["t","u","v","w"]);



    })




})

