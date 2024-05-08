import { Util } from "../util/Util";

export class TriangleMesh {

    /** Includes all Vertex Attributes  */
    public vertexBuffer: Float32Array

    /** 3 indicies construct one triangle face */
    public elementBuffer: Int32Array


    public attributes: GPUVertexAttribute[] = [
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
            format: "float32x3",
        }
    ]







    private constructor(vbo: Float32Array, ebo: Int32Array) {
        this.vertexBuffer = vbo;
        this.elementBuffer = ebo;
    }

    /**
     * Parses a string of .obj into a TriangleMesh
     * @param string 
     * @returns {@link TriangleMesh}
     */
    public static parseFromObj(string: string) {

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

        const attributes: GPUVertexAttribute[] = [];

        const all = new RegExp("f\s\d+\/\d+\/\d+\s\d+\/\d+\/\d+\s\d+\/\d+\/\d+");
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

                if (currentLine.includes("/")) {

                    if (currentLine.match(all)) {


                    } else if (currentLine.match(posAndUv)) {

                    } else if (currentLine.match(posAndNorm)) {

                    }

                } else {

                    const segments = currentLine.split(" ");

                    const vert1 = parseInt(segments[1]);
                    const vert2 = parseInt(segments[2]);
                    const vert3 = parseInt(segments[3]);

                    const parsedVertices: Vertex[] = [vert1,vert2,vert3].map( (pointIndex) => {

                        return {
                            xPos: tempPos[pointIndex],
                            yPos: tempPos[pointIndex + 1],
                            zPos: tempPos[pointIndex + 2],
                            xNorm: 0,
                            yNorm: 0,
                            zNorm: 0,
                            u: 0,
                            v: 0
                        }
                    });

                    const vertexIndicies : number[] = parsedVertices.map((vert) => {
                        let k;
                        for (k = 0; k < vertices.length; k++) {
                            if (Util.deepEqual(vert, vertices[k])) {
                                return k;
                            }
                        }
                        vertices.push(vert);
                        return k++;
                    });

    

                    faces.push({v1:vertexIndicies[0],v2:vertexIndicies[1],v3:vertexIndicies[2]});








                }

            } 
        }

        return new TriangleMesh(TriangleMesh.createVbo(vertices),TriangleMesh.creatEbo(faces));
    }

    /**
     * Creates a {@link Float32Array} to store vertex data
     * @param vertices 
     */
    public static createVbo (vertices:Vertex[]) {
        const arr : number[] = [];

        for (let i = 0; i < vertices.length;i++) {
            arr.push(...Object.values(vertices[i]));
        }

        return new Float32Array(arr);
    }


    public static creatEbo (faces:TriangleFace[]) {
        const arr : number[] = [];

        for (let i = 0; i < faces.length; i++) {
            
            arr.push(...Object.values(faces[i]));
        }
        return new Int32Array(arr);
    }

    





}