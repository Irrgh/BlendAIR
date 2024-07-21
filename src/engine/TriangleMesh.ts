import { MeshInstance } from "../entity/MeshInstance";
import { Util } from "../util/Util";
import { Float32ArrayStorage, Uint32ArrayStorage } from "./ArrayStorage";

export class TriangleMesh {

    /** Includes all Vertex Attributes  */
    public vertexBuffer: Float32Array

    /** 3 indicies construct one triangle face */
    public elementBuffer: Uint32Array

    public instancedBy: Set<MeshInstance>

    public static attributes: GPUVertexAttribute[] = [
        {
            shaderLocation: 0,      // position
            offset: 0,
            format: "float32x3",
        },
        {
            shaderLocation: 1,      // normal
            offset: 12,
            format: "float32x3",
        },
        {
            shaderLocation: 2,      // uv
            offset: 24,
            format: "float32x2",
        }
    ]







    private constructor(vbo: Float32Array, ebo: Uint32Array) {
        this.vertexBuffer = vbo;
        this.elementBuffer = ebo;
        this.instancedBy = new Set<MeshInstance>;
    }

    /**
     * Parses a string of .obj into a TriangleMesh
     * @param string 
     * @returns {@link TriangleMesh}
     */
    public static parseFromObj(string: string): TriangleMesh {

        const lines = string.split("\n");

        const tempPos: Float32ArrayStorage = new Float32ArrayStorage();
        const tempUv: Float32ArrayStorage = new Float32ArrayStorage();
        const tempNorm: Float32ArrayStorage = new Float32ArrayStorage();

        /**
         * We be converted to vbo
         */
        const vertices: Float32ArrayStorage = new Float32ArrayStorage;


        const vertexMap = new Map<string, number>()
        const faces: Uint32ArrayStorage = new Uint32ArrayStorage;

        const all = /f\s+(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)\/(\d+)/;
        const posAndUv = /f\s+(\d+)\/(\d+)\s+(\d+)\/(\d+)\s+(\d+)\/(\d+)/;
        const posAndNorm = /f\s+(\d+)\/\/(\d+)\s+(\d+)\/\/(\d+)\s+(\d+)\/\/(\d+)/;

        for (let i = 0; i < lines.length; i++) {

            const currentLine = lines[i];

            if (currentLine.startsWith("v ")) {
                const [, x, y, z] = currentLine.split(/\s+/).map(parseFloat);
                tempPos.push(x, y, z);

            } else if (currentLine.startsWith("vt ")) {
                const [, u, v] = currentLine.split(/\s+/).map(parseFloat);
                tempUv.push(u, v);

            } else if (currentLine.startsWith("vn ")) {
                const [, x, y, z] = currentLine.split(/\s+/).map(parseFloat);
                tempNorm.push(x, y, z);

            } else if (currentLine.startsWith("f ")) {

                if (currentLine.includes("/")) {

                    let match = currentLine.match(all);

                    if (match) {

                        const indices = match.slice(1).map(Number);

                        for (let i = 0; i < indices.length; i += 3) {
                            const posIndex = indices[i] - 1;
                            const uvIndex = indices[i + 1] - 1;
                            const normIndex = indices[i + 2] - 1;

                            const key = `${posIndex}_${uvIndex}_${normIndex}`;
                            if (vertexMap.has(key)) {
                                faces.push(vertexMap.get(key)!);
                            } else {
                                const vertex = [
                                    tempPos.get(posIndex * 3),
                                    tempPos.get(posIndex * 3 + 1),
                                    tempPos.get(posIndex * 3 + 2),
                                    tempNorm.get(normIndex * 3),
                                    tempNorm.get(normIndex * 3 + 1),
                                    tempNorm.get(normIndex * 3 + 2),
                                    tempUv.get(uvIndex * 2),
                                    tempUv.get(uvIndex * 2 + 1)
                                ];
                                const index = vertices.size() / 8;
                                vertexMap.set(key, index);
                                vertices.push(...vertex);
                                faces.push(index)
                            }

                            
                        }
                        
                    } else {

                        
                    }


                    



                }

            }
        }
        return new TriangleMesh(vertices.getArray(), faces.getArray());
    }


    public addMeshInstance(instance: MeshInstance): void {
        this.instancedBy.add(instance);
    }

    public removeMeshInstance(instance: MeshInstance): void {
        this.instancedBy.delete(instance);
    }




}