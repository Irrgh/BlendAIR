type tm_mesh = {
    vertices: Float32Array,
    faces: Int32Array
}



function create_tm_mesh(buffer:ArrayBuffer):tm_mesh {
    const vertices = new Int32Array(buffer,0,1)[0];
    const faces = new Int32Array(buffer,4,1)[0];

    const mesh : tm_mesh = {
        vertices : new Float32Array(buffer,28,vertices*3),
        faces : new Int32Array(buffer,28+vertices*3*4,faces*3)
    };



    return mesh;
}