export class TriangleMesh {

    /** Includes all Vertex Attributes  */
    public vertexBuffer: Float32Array

    /** Includes indecies for construct */
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







    private constructor(vbo: Float32Array, ebo: Int32Array, attr: GPUVertexAttribute[]) {
        this.vertexBuffer = vbo;
        this.elementBuffer = ebo;
        this.attributes = attr;
    }


    public static parseFromObj(string: string) {

        const lines = string.split("\n");

        const tempPos = [];
        const tempUv = [];
        const tempNorm = [];

        const vertices = new Set();
        const faces = [];

        const attributes: GPUVertexAttribute[] = [];

        const all = new RegExp("f\s\d+\/\d+\/\d+\s\d+\/\d+\/\d+\s\d+\/\d+\/\d+");
        const posAndUv = new RegExp("f\s\d+\/\d+\s\d+\/\d+\s\d+\/\d+");
        const posAndNorm = new RegExp("f\s\d+\/\/\d+\s\d+\/\/\d+\s\d+\/\/\d+");




        let i;  // also serves as a indicator for start of face declaration

        for (i = 0; i < lines.length; i++) {

            const currentLine = lines[i];

            if (currentLine.startsWith("# ")) {
                continue;
            } else if (currentLine.startsWith("v ")) {
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

                    for (let j = 1; j < 4; j++) {

                        const vertindex = parseInt(segments[0]);

                        vertices.add({
                            xPos: tempPos[vertindex],
                            yPos: tempPos[vertindex + 1],
                            zPos: tempPos[vertindex + 2],
                            xNorm: 0,
                            yNorm: 0,
                            zNorm: 0,
                            u: 0,
                            v: 0
                        })

                    }

                    






                }











            } else {
                console.log(currentLine);
            }
        }





















    }












}