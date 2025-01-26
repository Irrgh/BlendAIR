import { ArrayStorage, TypedArray } from "./ArrayStorage";





export const readFileAsStream = async () => {

    enum State {
        NEXT = 0,
        NOOP = 1,
        V = 2,
        VT = 3,
        VN = 4,
        VERTEX = 5,
        TEXTURE = 6,
        NORMAL = 7,
        FACE = 8,
    }


    const fileHandle = await window.showOpenFilePicker();
    const file = await fileHandle[0].getFile();
    const reader = file.stream().getReader({ mode: "byob" });

    const decoder = new TextDecoder();
    const buf = new ArrayBuffer(64 * 1024);
    let arr = new Uint8Array(buf);

    const tempFloats = new Float32Array(4);
    const tempInts = new Uint32Array(12);

    const positions = new ArrayStorage(Float32Array);
    const normals = new ArrayStorage(Float32Array);
    const uvs = new ArrayStorage(Float32Array);

    let state: number = State.NEXT;

    while (true) {
        const { done, value } = await reader.read(arr);
        if (done) {
            break;
        }
        arr = value;
        const chunk = value.subarray(0, value.byteLength);
        console.log(value.byteLength);



        let start = -1;
        let offset = 0;

        const readFloat = (idx: number) => {
            const str = decoder.decode(chunk.slice(start, idx));
            tempFloats[offset] = parseFloat(str);
            offset++;
            start = -1;
        }

        const readInt = (idx: number) => {
            const str = decoder.decode(chunk.slice(start, idx));
            tempInts[offset] = parseFloat(str);
            offset++
            start = -1;
        }

        const commitFloats = (storage: ArrayStorage<Float32Array>, count: number) => {
            storage.pushArray(tempFloats);
            tempFloats.fill(0);
            offset = 0;
        }

        const commitInts = (storage: ArrayStorage<Uint32Array>, count: number) => {
            storage.pushArray(tempInts);
            tempInts.fill(0);
            offset = 0;
        }


        for (let i = 0; i < chunk.byteLength; i++) {
            const val = chunk[i];
            switch (state) {
                case State.NOOP:
                    if (val === 0x0a) { state = State.NEXT; break; } // \n
                    break;
                case State.NEXT:
                    if (val === 0x0a) { state = State.NEXT; break; } // \n
                    if (val === 0x23) { state = State.NOOP; break; } // 0x23 # 
                    if (val === 0x76) { state = State.V; break; } // 0x76 v
                    if (val === 0x66) { state = State.FACE; break; }// 0x66 f
                    break;
                case State.V:
                    if (val === 0x0a) { state = State.NEXT; break; } // \n
                    if (val === 0x20) { state = State.VERTEX; break; } // 0x20 " "
                    if (val === 0x74) { state = State.VT; break; } // 0x74 t
                    if (val === 0x6e) { state = State.VN; break; } // 0x6e n
                    state = State.NOOP; break;
                case  State.VT:
                    if (val === 0x0a) { state = State.NEXT; break; } // \n
                    if (val === 0x20) {state = State.TEXTURE; break;}
                    break;
                case State.VN:
                    if (val === 0x0a) { state = State.NEXT; break; } // \n
                    if (val === 0x20) {state = State.NORMAL; break;}
                    break;
                case State.VERTEX:
                    if (val === 0x0a && start !== -1) {
                        readFloat(i);
                        commitFloats(positions, 3);
                        state = State.NEXT;
                        break;
                    }
                    if (val === 0x0a) { state = State.NEXT; commitFloats(positions, 3); break; } // \n
                    if (val !== 0x20 && start === -1) { start = i; break; }
                    if (val === 0x20 && start !== -1) { readFloat(i); break; }
                    break;
                case State.TEXTURE:
                    if (val === 0x0a && start !== -1) {
                        readFloat(i);
                        commitFloats(uvs, 2);
                        state = State.NEXT;
                        break;
                    }
                    if (val === 0x0a) { state = State.NEXT; commitFloats(uvs, 2); break; } // \n
                    if (val !== 0x20 && start === -1) { start = i; break; }
                    if (val === 0x20 && start !== -1) { readFloat(i); break; }
                    break;
                case State.NORMAL:
                    if (val === 0x0a && start !== -1) {
                        readFloat(i);
                        commitFloats(normals, 3);
                        state = State.NEXT;
                        break;
                    }
                    if (val === 0x0a) { state = State.NEXT; commitFloats(normals, 3); break; } // \n
                    if (val !== 0x20 && start === -1) { start = i; break; }
                    if (val === 0x20 && start !== -1) { readFloat(i); break; }
                    break;
                case State.FACE:
                    if (val === 0x0a && start !==  -1) {
                        readInt(i);
                    }

            }



        }


    }

}
