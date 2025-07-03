export type tm_mesh = {
    vertices: Float32Array,
    faces: Uint32Array
}



export function create_tm_mesh(buf: ArrayBuffer): tm_mesh {
    const vertices = new Uint32Array(buf.slice(0, 4))[0];
    const faces = new Uint32Array(buf.slice(4, 8))[0];

    const h_off = 4 * 7
    const v_size = 3 * 4 * vertices
    const f_size = 3 * 4 * faces

    const v_arr = new Float32Array(buf.slice(h_off, h_off + v_size));
    const f_arr = new Uint32Array(buf.slice(h_off + v_size, h_off + v_size + f_size));

    const mesh : tm_mesh = {
        vertices: v_arr,
        faces: f_arr
    }
    return mesh;
}