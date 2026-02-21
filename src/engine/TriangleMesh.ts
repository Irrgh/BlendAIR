import { MeshInstance } from "../entity/MeshInstance";
import { ArrayStorage } from "../util/ArrayStorage";

export class TriangleMesh {

    /** Includes all Vertex Attributes  */
    private vertices: Float32Array
    private normals: Float32Array;
    private uvs: Float32Array;

    /** 3 indicies construct one triangle face */
    private elementBuffer: Uint32Array

    private instancedBy: Set<MeshInstance>

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







    constructor(vertices: Float32Array, normals: Float32Array, uvs :Float32Array, ebo: Uint32Array) {
        this.vertices = vertices;
        this.normals = normals;
        this.uvs = uvs;
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

        const tempPos: ArrayStorage<Float32Array> = new ArrayStorage(Float32Array);
        const tempUv: ArrayStorage<Float32Array> = new ArrayStorage(Float32Array);
        const tempNorm: ArrayStorage<Float32Array> = new ArrayStorage(Float32Array);

        const vertices: ArrayStorage<Float32Array> = new ArrayStorage(Float32Array);
        const normals: ArrayStorage<Float32Array> = new ArrayStorage(Float32Array);
        const uvs: ArrayStorage<Float32Array> = new ArrayStorage(Float32Array);

        const vertexMap = new Map<string, number>()
        const faces: ArrayStorage<Uint32Array> = new ArrayStorage(Uint32Array);

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
                                // Append to separate arrays instead of interleaving
                                vertices.push(
                                    tempPos.get(posIndex * 3),
                                    tempPos.get(posIndex * 3 + 1),
                                    tempPos.get(posIndex * 3 + 2)
                                );

                                normals.push(
                                    tempNorm.get(normIndex * 3),
                                    tempNorm.get(normIndex * 3 + 1),
                                    tempNorm.get(normIndex * 3 + 2)
                                );

                                uvs.push(
                                    tempUv.get(uvIndex * 2),
                                    tempUv.get(uvIndex * 2 + 1)
                                );

                                const index = vertices.size() / 3 - 1; // Each vertex has 3 floats
                                vertexMap.set(key, index);
                                faces.push(index);
                            }
                        }


                    } else {


                    }






                }

            }
        }
        return new TriangleMesh(vertices.getArray(), normals.getArray(), uvs.getArray(), faces.getArray());
    }


    public addMeshInstance(instance: MeshInstance): void {
        this.instancedBy.add(instance);
    }

    public removeMeshInstance(instance: MeshInstance): void {
        this.instancedBy.delete(instance);
    }


    public getVertexBuffer(): Float32Array {
        return this.vertices;
    }

    public getNormalBuffer(): Float32Array {
        return this.normals;
    }

    public getUVBuffer() : Float32Array {
        return this.uvs;
    }

    public getElementBuffer(): Uint32Array {
        return this.elementBuffer;
    }

}