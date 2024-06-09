import { MeshInstance } from "../entity/MeshInstance";
import { Util } from "../util/Util";

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

        const tempPos: number[] = [];
        const tempUv: number[] = [];
        const tempNorm: number[] = [];

        /**
         * We be converted to vbo
         */
        const vertices: Vertex[] = [];


        const vertexMap = new Map<Vertex, number>()
        const faces: TriangleFace[] = [];

        const all = new RegExp("f [0-9]+\/[0-9]+\/[0-9]+ [0-9]+\/[0-9]+\/[0-9]+ [0-9]+\/[0-9]+\/[0-9]+");
        const posAndUv = new RegExp("f\s\d+\/\d+\s\d+\/\d+\s\d+\/\d+");
        const posAndNorm = new RegExp("f\s\d+\/\/\d+\s\d+\/\/\d+\s\d+\/\/\d+");



        for (let i = 0; i < lines.length; i++) {

            const currentLine = lines[i];

            if (currentLine.startsWith("v ")) {
                const segments = currentLine.split(new RegExp("[ ]+"));
                tempPos.push(parseFloat(segments[1]));
                tempPos.push(parseFloat(segments[2]));
                tempPos.push(parseFloat(segments[3]));

            } else if (currentLine.startsWith("vt ")) {
                const segments = currentLine.split(new RegExp("[ ]+"));
                tempUv.push(parseFloat(segments[1]));
                tempUv.push(parseFloat(segments[2]));

            } else if (currentLine.startsWith("vn ")) {
                const segments = currentLine.split(new RegExp("[ ]+"));
                tempNorm.push(parseFloat(segments[1]));
                tempNorm.push(parseFloat(segments[2]));
                tempNorm.push(parseFloat(segments[3]));

            } else if (currentLine.startsWith("f ")) {

                let parsedVertices: Vertex[]


                if (currentLine.includes("/")) {


                    if (currentLine.match(all)) {

                        const segments = currentLine.split(" ");

                        const verts = segments.slice(1).map((segment: string) => {
                            return segment.split("/").map((value: string) => {
                                return parseInt(value)
                            });
                        });


                        i == 34 ? console.log(verts): {};

                        parsedVertices = verts.map((indices) => {

                            // indices [0] ^= pos
                            // indices [1] ^= uv
                            // indices [2] ^= norm

                            return {
                                xPos: tempPos[(indices[0]-1) * 3],
                                yPos: tempPos[(indices[0]-1) * 3 + 1],
                                zPos: tempPos[(indices[0]-1) * 3 + 2],
                                xNorm: tempNorm[(indices[2]-1) * 3],
                                yNorm: tempNorm[(indices[2]-1) * 3 + 1],
                                zNorm: tempNorm[(indices[2]-1) * 3 + 2],
                                u: tempUv[(indices[1]-1) * 2],
                                v: tempUv[(indices[1]-1) * 2 + 1]
                            }





                        })

                    //} else if (currentLine.match(posAndUv)) {

                    //} else if (currentLine.match(posAndNorm)) {

                    //}

                } else {

                    const segments = currentLine.split(" ");

                    const vert1 = parseInt(segments[1]);
                    const vert2 = parseInt(segments[2]);
                    const vert3 = parseInt(segments[3]);

                    parsedVertices = [vert1, vert2, vert3].map((pointIndex) => {

                        pointIndex--;   // indexing starts with 1 in .obj ;)))))))

                        return {
                            xPos: tempPos[pointIndex * 3],
                            yPos: tempPos[pointIndex * 3 + 1],
                            zPos: tempPos[pointIndex * 3 + 2],
                            xNorm: 0,
                            yNorm: 0,
                            zNorm: 0,
                            u: 0,
                            v: 0
                        }
                    });
                }


                const vertexIndicies: number[] = parsedVertices.map((vert) => {
                    let k;
                    for (k = 0; k < vertices.length; k++) {
                        if (Util.deepEqual(vert, vertices[k])) {
                            return k;
                        }
                    }
                    vertices.push(vert);
                    return k++;
                });

                //console.log("tempNorm: ",tempNorm);



                faces.push({ v1: vertexIndicies[0], v2: vertexIndicies[1], v3: vertexIndicies[2] });


            }





        }

    }
    

        return new TriangleMesh(TriangleMesh.createVbo(vertices), TriangleMesh.creatEbo(faces));
    }

    /**
     * Creates a {@link Float32Array} to store vertex data
     * @param vertices 
     */
    private static createVbo(vertices: Vertex[]):Float32Array {
    const arr: number[] = [];

    for (let i = 0; i < vertices.length; i++) {
        arr.push(...Object.values(vertices[i]));
    }

    return new Float32Array(arr);
}


    private static creatEbo(faces: TriangleFace[]):Uint32Array {
    const arr: number[] = [];

    for (let i = 0; i < faces.length; i++) {

        arr.push(...Object.values(faces[i]));
    }
    return new Uint32Array(arr);
}

    public addMeshInstance(instance : MeshInstance): void {
    this.instancedBy.add(instance);
}

    public removeMeshInstance(instance: MeshInstance): void {
    this.instancedBy.delete(instance);
}




}