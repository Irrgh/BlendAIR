(() => {
    "use strict";
    var __webpack_require__ = {
        d: (exports, definition) => {
            for (var key in definition) __webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key) && Object.defineProperty(exports, key, {
                enumerable: !0,
                get: definition[key]
            });
        },
        o: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
    };
    __webpack_require__.d({}, {
        q: () => App
    });
    class WebGPU {
        querySet;
        resolveBuffer;
        resultBuffer;
        timeStamps;
        constructor() {}
        adapter;
        device;
        static minBuffersize=32;
        static async initializeInstance() {
            const webgpu = new WebGPU;
            return await webgpu.init(), webgpu;
        }
        async init() {
            if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");
            try {
                if (this.adapter = await navigator.gpu.requestAdapter(), !this.adapter) throw new Error("No appropriate GPUAdapter found.");
                const canTimestamp = this.adapter.features.has("timestamp-query");
                if (this.device = await this.adapter.requestDevice({
                    requiredFeatures: canTimestamp ? [ "timestamp-query" ] : []
                }), !this.device) throw new Error("No appropriate GPUDevice found.");
                canTimestamp && (this.timeStamps = new Map);
            } catch (error) {
                console.error("Error initializing WebGPU:", error);
            }
        }
        getAdapter() {
            return this.adapter;
        }
        getDevice() {
            return this.device;
        }
        canTimestamp() {
            return !!this.timeStamps;
        }
        attachTimestamps(passDescriptor) {
            if (this.canTimestamp()) {
                const data = {
                    querySet: this.device.createQuerySet({
                        type: "timestamp",
                        count: 2,
                        label: `${passDescriptor.label}-timestamp-queryset`
                    }),
                    resolveBuffer: this.device.createBuffer({
                        size: 16,
                        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
                        label: `${passDescriptor}-timestamp-resolve`
                    }),
                    resultBuffer: this.device.createBuffer({
                        size: 16,
                        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                        label: `${passDescriptor.label}-timestamp-result`
                    })
                };
                this.timeStamps?.set(passDescriptor, data);
                const timestampWrites = {
                    querySet: data.querySet,
                    beginningOfPassWriteIndex: 0,
                    endOfPassWriteIndex: 1
                };
                passDescriptor.timestampWrites = timestampWrites;
            } else console.warn("This webGPU instance does not support 'timestamp-query'. Trying enabling 'WebGPU Developer Features' under chrome://flags.");
        }
        prepareTimestampsResolution(passDescriptor, encoder) {
            if (this.canTimestamp()) {
                const data = this.timeStamps?.get(passDescriptor);
                if (null == data) throw new Error(`There are no timestamps attached for the pass: ${passDescriptor}`);
                encoder.resolveQuerySet(data.querySet, 0, 2, data.resolveBuffer, 0), "unmapped" === data.resultBuffer.mapState && encoder.copyBufferToBuffer(data.resolveBuffer, 0, data.resultBuffer, 0, data.resultBuffer.size);
            }
        }
        resolveTimestamp(passDescriptor) {
            return new Promise(((resolve, reject) => {
                if (this.canTimestamp()) {
                    const data = this.timeStamps?.get(passDescriptor);
                    if (null == data) return void reject(`There are no timestamps attached for the pass: ${passDescriptor}`);
                    if ("unmapped" === data.resultBuffer.mapState) {
                        this.resultBuffer;
                        data.resultBuffer.mapAsync(GPUMapMode.READ).then((() => {
                            const mappedRange = data.resultBuffer.getMappedRange(0, data.resultBuffer.size), times = new BigInt64Array(mappedRange), diff = times[1] - times[0];
                            data.resultBuffer.unmap(), resolve(Number(diff));
                        })).catch((err => {
                            console.error("Failed to map result buffer:", err), resolve(0);
                        }));
                    } else resolve(0);
                } else console.warn("This webGPU instance does not support 'timestamp-query'. Trying enabling 'WebGPU Developer Features' under chrome://flags."), 
                resolve(0);
            }));
        }
        async printBufferContent(buffer) {
            const stagingBuffer = this.device.createBuffer({
                size: buffer.size,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: `reading-${buffer.label}`
            }), commandEncoder = this.device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, buffer.size);
            const commands = commandEncoder.finish();
            this.device.queue.submit([ commands ]), await stagingBuffer.mapAsync(GPUMapMode.READ);
            const copiedBuffer = stagingBuffer.getMappedRange(0, buffer.size).slice(0);
            console.log(`${buffer.label} buffer data:`, copiedBuffer), stagingBuffer.unmap(), 
            stagingBuffer.destroy();
        }
    }
    class Timeline {
        current=0;
        fps=24;
        first=0;
        last=250;
        constructor() {}
        getFirst() {
            return this.first;
        }
        getLast() {
            return this.last;
        }
        getCurrent() {
            return this.current;
        }
        setCurrent(frame) {
            this.current = frame;
        }
        getFps() {
            return this.fps;
        }
    }
    class Scene {
        entities;
        entityIndecies=new Map;
        viewports;
        primarySelection;
        selections;
        timeline;
        constructor() {
            this.entities = new Map, this.viewports = new Set, this.selections = new Set, this.timeline = new Timeline;
        }
        onUpdate() {
            this.viewports.forEach((viewport => {}));
        }
        getId(entity) {
            const id = this.entityIndecies.get(entity);
            if (null != id) return id;
            throw new Error(`Entity ${entity} does not exist.`);
        }
        addEntity(entity) {
            this.entities.set(entity.name, entity), this.entityIndecies.set(entity, this.entityIndecies.size);
        }
        getIds() {
            return this.entityIndecies;
        }
    }
    class Float32ArrayStorage {
        length;
        array;
        constructor() {
            this.length = 0, this.array = new Float32Array;
        }
        resize(length) {
            const newArray = new Float32Array(length);
            newArray.set(this.array), this.array = newArray;
        }
        push(...values) {
            values.forEach((value => {
                const length = this.length, typedArrayLength = this.array.length;
                0 === length ? this.resize(1024) : length === typedArrayLength && (length < 33554432 ? this.resize(2 * typedArrayLength) : this.resize(typedArrayLength + 33554432)), 
                this.array[this.length++] = value;
            }));
        }
        get(index) {
            return this.array[index];
        }
        size() {
            return this.length;
        }
        getArray() {
            return this.array.slice(0, this.length);
        }
    }
    class Uint32ArrayStorage {
        length;
        array;
        constructor() {
            this.length = 0, this.array = new Uint32Array;
        }
        resize(length) {
            const newArray = new Uint32Array(length);
            newArray.set(this.array), this.array = newArray;
        }
        push(...values) {
            values.forEach((value => {
                const length = this.length, typedArrayLength = this.array.length;
                0 === length ? this.resize(1024) : length === typedArrayLength && (length < 33554432 ? this.resize(2 * typedArrayLength) : this.resize(typedArrayLength + 33554432)), 
                this.array[this.length++] = value;
            }));
        }
        get(index) {
            return this.array[index];
        }
        size() {
            return this.length;
        }
        getArray() {
            return this.array.slice(0, this.length);
        }
    }
    class TriangleMesh {
        vertexBuffer;
        elementBuffer;
        instancedBy;
        static attributes=[ {
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        }, {
            shaderLocation: 1,
            offset: 12,
            format: "float32x3"
        }, {
            shaderLocation: 2,
            offset: 24,
            format: "float32x2"
        } ];
        constructor(vbo, ebo) {
            this.vertexBuffer = vbo, this.elementBuffer = ebo, this.instancedBy = new Set;
        }
        static parseFromObj(string) {
            const lines = string.split("\n"), tempPos = new Float32ArrayStorage, tempUv = new Float32ArrayStorage, tempNorm = new Float32ArrayStorage, vertices = new Float32ArrayStorage, vertexMap = new Map, faces = new Uint32ArrayStorage, all = /f\s+(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)\/(\d+)/;
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
                } else if (currentLine.startsWith("f ") && currentLine.includes("/")) {
                    let match = currentLine.match(all);
                    if (match) {
                        const indices = match.slice(1).map(Number);
                        for (let i = 0; i < indices.length; i += 3) {
                            const posIndex = indices[i] - 1, uvIndex = indices[i + 1] - 1, normIndex = indices[i + 2] - 1, key = `${posIndex}_${uvIndex}_${normIndex}`;
                            if (vertexMap.has(key)) faces.push(vertexMap.get(key)); else {
                                const vertex = [ tempPos.get(3 * posIndex), tempPos.get(3 * posIndex + 1), tempPos.get(3 * posIndex + 2), tempNorm.get(3 * normIndex), tempNorm.get(3 * normIndex + 1), tempNorm.get(3 * normIndex + 2), tempUv.get(2 * uvIndex), tempUv.get(2 * uvIndex + 1) ], index = vertices.size() / 8;
                                vertexMap.set(key, index), vertices.push(...vertex), faces.push(index);
                            }
                        }
                    }
                }
            }
            return new TriangleMesh(vertices.getArray(), faces.getArray());
        }
        addMeshInstance(instance) {
            this.instancedBy.add(instance);
        }
        removeMeshInstance(instance) {
            this.instancedBy.delete(instance);
        }
    }
    var ARRAY_TYPE = "undefined" != typeof Float32Array ? Float32Array : Array, RANDOM = Math.random;
    Math.PI;
    function create() {
        var out = new ARRAY_TYPE(3);
        return ARRAY_TYPE != Float32Array && (out[0] = 0, out[1] = 0, out[2] = 0), out;
    }
    function clone(a) {
        var out = new ARRAY_TYPE(3);
        return out[0] = a[0], out[1] = a[1], out[2] = a[2], out;
    }
    function fromValues(x, y, z) {
        var out = new ARRAY_TYPE(3);
        return out[0] = x, out[1] = y, out[2] = z, out;
    }
    function add(out, a, b) {
        return out[0] = a[0] + b[0], out[1] = a[1] + b[1], out[2] = a[2] + b[2], out;
    }
    function vec3_scale(out, a, b) {
        return out[0] = a[0] * b, out[1] = a[1] * b, out[2] = a[2] * b, out;
    }
    function normalize(out, a) {
        var x = a[0], y = a[1], z = a[2], len = x * x + y * y + z * z;
        return len > 0 && (len = 1 / Math.sqrt(len)), out[0] = a[0] * len, out[1] = a[1] * len, 
        out[2] = a[2] * len, out;
    }
    function vec3_dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
    function cross(out, a, b) {
        var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
        return out[0] = ay * bz - az * by, out[1] = az * bx - ax * bz, out[2] = ax * by - ay * bx, 
        out;
    }
    function random(out, scale) {
        scale = scale || 1;
        var r = 2 * RANDOM() * Math.PI, z = 2 * RANDOM() - 1, zScale = Math.sqrt(1 - z * z) * scale;
        return out[0] = Math.cos(r) * zScale, out[1] = Math.sin(r) * zScale, out[2] = z * scale, 
        out;
    }
    function transformQuat(out, a, q) {
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3], x = a[0], y = a[1], z = a[2], uvx = qy * z - qz * y, uvy = qz * x - qx * z, uvz = qx * y - qy * x, uuvx = qy * uvz - qz * uvy, uuvy = qz * uvx - qx * uvz, uuvz = qx * uvy - qy * uvx, w2 = 2 * qw;
        return uvx *= w2, uvy *= w2, uvz *= w2, uuvx *= 2, uuvy *= 2, uuvz *= 2, out[0] = x + uvx + uuvx, 
        out[1] = y + uvy + uuvy, out[2] = z + uvz + uuvz, out;
    }
    Math.hypot || (Math.hypot = function() {
        for (var y = 0, i = arguments.length; i--; ) y += arguments[i] * arguments[i];
        return Math.sqrt(y);
    });
    var vec, sub = function subtract(out, a, b) {
        return out[0] = a[0] - b[0], out[1] = a[1] - b[1], out[2] = a[2] - b[2], out;
    }, len = function vec3_length(a) {
        var x = a[0], y = a[1], z = a[2];
        return Math.hypot(x, y, z);
    };
    vec = create();
    function vec4_create() {
        var out = new ARRAY_TYPE(4);
        return ARRAY_TYPE != Float32Array && (out[0] = 0, out[1] = 0, out[2] = 0, out[3] = 0), 
        out;
    }
    function vec4_fromValues(x, y, z, w) {
        var out = new ARRAY_TYPE(4);
        return out[0] = x, out[1] = y, out[2] = z, out[3] = w, out;
    }
    function vec4_scale(out, a, b) {
        return out[0] = a[0] * b, out[1] = a[1] * b, out[2] = a[2] * b, out[3] = a[3] * b, 
        out;
    }
    function vec4_transformMat4(out, a, m) {
        var x = a[0], y = a[1], z = a[2], w = a[3];
        return out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w, out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w, 
        out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w, out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w, 
        out;
    }
    !function() {
        var vec = vec4_create();
    }();
    function quat_create() {
        var out = new ARRAY_TYPE(4);
        return ARRAY_TYPE != Float32Array && (out[0] = 0, out[1] = 0, out[2] = 0), out[3] = 1, 
        out;
    }
    function setAxisAngle(out, axis, rad) {
        rad *= .5;
        var s = Math.sin(rad);
        return out[0] = s * axis[0], out[1] = s * axis[1], out[2] = s * axis[2], out[3] = Math.cos(rad), 
        out;
    }
    function slerp(out, a, b, t) {
        var omega, cosom, sinom, scale0, scale1, ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3];
        return (cosom = ax * bx + ay * by + az * bz + aw * bw) < 0 && (cosom = -cosom, bx = -bx, 
        by = -by, bz = -bz, bw = -bw), 1 - cosom > 1e-6 ? (omega = Math.acos(cosom), sinom = Math.sin(omega), 
        scale0 = Math.sin((1 - t) * omega) / sinom, scale1 = Math.sin(t * omega) / sinom) : (scale0 = 1 - t, 
        scale1 = t), out[0] = scale0 * ax + scale1 * bx, out[1] = scale0 * ay + scale1 * by, 
        out[2] = scale0 * az + scale1 * bz, out[3] = scale0 * aw + scale1 * bw, out;
    }
    var tmpvec3, xUnitVec3, yUnitVec3, temp1, temp2, matr, quat_mul = function quat_multiply(out, a, b) {
        var ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3];
        return out[0] = ax * bw + aw * bx + ay * bz - az * by, out[1] = ay * bw + aw * by + az * bx - ax * bz, 
        out[2] = az * bw + aw * bz + ax * by - ay * bx, out[3] = aw * bw - ax * bx - ay * by - az * bz, 
        out;
    }, quat_normalize = function vec4_normalize(out, a) {
        var x = a[0], y = a[1], z = a[2], w = a[3], len = x * x + y * y + z * z + w * w;
        return len > 0 && (len = 1 / Math.sqrt(len)), out[0] = x * len, out[1] = y * len, 
        out[2] = z * len, out[3] = w * len, out;
    };
    tmpvec3 = create(), xUnitVec3 = fromValues(1, 0, 0), yUnitVec3 = fromValues(0, 1, 0), 
    temp1 = quat_create(), temp2 = quat_create(), matr = function mat3_create() {
        var out = new ARRAY_TYPE(9);
        return ARRAY_TYPE != Float32Array && (out[1] = 0, out[2] = 0, out[3] = 0, out[5] = 0, 
        out[6] = 0, out[7] = 0), out[0] = 1, out[4] = 1, out[8] = 1, out;
    }();
    function mat4_create() {
        var out = new ARRAY_TYPE(16);
        return ARRAY_TYPE != Float32Array && (out[1] = 0, out[2] = 0, out[3] = 0, out[4] = 0, 
        out[6] = 0, out[7] = 0, out[8] = 0, out[9] = 0, out[11] = 0, out[12] = 0, out[13] = 0, 
        out[14] = 0), out[0] = 1, out[5] = 1, out[10] = 1, out[15] = 1, out;
    }
    function mat4_identity(out) {
        return out[0] = 1, out[1] = 0, out[2] = 0, out[3] = 0, out[4] = 0, out[5] = 1, out[6] = 0, 
        out[7] = 0, out[8] = 0, out[9] = 0, out[10] = 1, out[11] = 0, out[12] = 0, out[13] = 0, 
        out[14] = 0, out[15] = 1, out;
    }
    function mat4_invert(out, a) {
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        return det ? (det = 1 / det, out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det, 
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det, out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det, 
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det, out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det, 
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det, out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det, 
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det, out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det, 
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det, out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det, 
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det, out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det, 
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det, out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det, 
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det, out) : null;
    }
    var perspective = function perspectiveNO(out, fovy, aspect, near, far) {
        var nf, f = 1 / Math.tan(fovy / 2);
        return out[0] = f / aspect, out[1] = 0, out[2] = 0, out[3] = 0, out[4] = 0, out[5] = f, 
        out[6] = 0, out[7] = 0, out[8] = 0, out[9] = 0, out[11] = -1, out[12] = 0, out[13] = 0, 
        out[15] = 0, null != far && far !== 1 / 0 ? (nf = 1 / (near - far), out[10] = (far + near) * nf, 
        out[14] = 2 * far * near * nf) : (out[10] = -1, out[14] = -2 * near), out;
    };
    var ortho = function orthoNO(out, left, right, bottom, top, near, far) {
        var lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
        return out[0] = -2 * lr, out[1] = 0, out[2] = 0, out[3] = 0, out[4] = 0, out[5] = -2 * bt, 
        out[6] = 0, out[7] = 0, out[8] = 0, out[9] = 0, out[10] = 2 * nf, out[11] = 0, out[12] = (left + right) * lr, 
        out[13] = (top + bottom) * bt, out[14] = (far + near) * nf, out[15] = 1, out;
    };
    class AnimationSheet {
        keyFrames;
        interpolType="linear";
        constructor(keyframes) {
            0 == keyframes.length ? this.keyFrames = [ {
                frame: 0,
                value: create()
            } ] : this.keyFrames = keyframes;
        }
        setInterpolation(type) {
            this.interpolType = type;
        }
        setKeyframe(value) {
            this.keyFrames.push({
                frame: App.getInstance().currentScene.timeline.getCurrent(),
                value
            }), this.keyFrames.sort(((a, b) => a.frame - b.frame));
        }
        getValue() {
            return this.getValueAt(App.getInstance().currentScene.timeline.getCurrent());
        }
        getValueAt(frame) {
            let index = 0, bigger = this.keyFrames[0];
            for (let i = 0; i < this.keyFrames.length; i++) if (bigger = this.keyFrames[i], 
            frame <= this.keyFrames[i].frame) {
                index = i;
                break;
            }
            if (!(index > 0)) return bigger.value;
            {
                const smaller = this.keyFrames[index - 1], diff = Math.abs(bigger.frame - smaller.frame), t = (frame - smaller.frame) / diff;
                switch (this.interpolType) {
                  case "linear":
                    return function lerp(out, a, b, t) {
                        var ax = a[0], ay = a[1], az = a[2];
                        return out[0] = ax + t * (b[0] - ax), out[1] = ay + t * (b[1] - ay), out[2] = az + t * (b[2] - az), 
                        out;
                    }(create(), smaller.value, bigger.value, t);

                  case "bezier":
                    const vector = sub(create(), bigger.value, smaller.value), c1 = add(create(), smaller.value, vec3_scale(create(), vector, .1)), c2 = add(create(), smaller.value, vec3_scale(create(), vector, .9));
                    return function bezier(out, a, b, c, d, t) {
                        var inverseFactor = 1 - t, inverseFactorTimesTwo = inverseFactor * inverseFactor, factorTimes2 = t * t, factor1 = inverseFactorTimesTwo * inverseFactor, factor2 = 3 * t * inverseFactorTimesTwo, factor3 = 3 * factorTimes2 * inverseFactor, factor4 = factorTimes2 * t;
                        return out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4, 
                        out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4, out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4, 
                        out;
                    }(create(), smaller.value, c1, c2, bigger.value, t);
                }
            }
        }
    }
    class Entity {
        constructor(position, rotation, scale) {
            this.position = position || create(), this.rotation = rotation || quat_create(), 
            this.scale = scale || fromValues(1, 1, 1), this.name = window.crypto.randomUUID();
        }
        name;
        position;
        rotation;
        scale;
        forward=[ 0, 1, 0 ];
        up=[ 0, 0, 1 ];
        right=[ 1, 0, 0 ];
        getPosition() {
            return this.position instanceof AnimationSheet ? this.position.getValue() : this.position;
        }
        getRotation() {
            return this.rotation;
        }
        getWorldTransform() {
            return function fromRotationTranslationScale(out, q, v, s) {
                var x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2, sx = s[0], sy = s[1], sz = s[2];
                return out[0] = (1 - (yy + zz)) * sx, out[1] = (xy + wz) * sx, out[2] = (xz - wy) * sx, 
                out[3] = 0, out[4] = (xy - wz) * sy, out[5] = (1 - (xx + zz)) * sy, out[6] = (yz + wx) * sy, 
                out[7] = 0, out[8] = (xz + wy) * sz, out[9] = (yz - wx) * sz, out[10] = (1 - (xx + yy)) * sz, 
                out[11] = 0, out[12] = v[0], out[13] = v[1], out[14] = v[2], out[15] = 1, out;
            }(mat4_create(), this.rotation, this.getPosition(), this.scale);
        }
        getScale() {
            return this.scale;
        }
        setPosition(x, y, z) {
            !function set(out, x, y, z) {
                return out[0] = x, out[1] = y, out[2] = z, out;
            }(this.getPosition(), x, y, z);
        }
        setPositionAsAnimation(anim) {
            this.position = anim;
        }
        setXRotation(radians) {
            setAxisAngle(this.rotation, fromValues(1, 0, 0), radians);
        }
        setYRotation(radians) {
            setAxisAngle(this.rotation, fromValues(0, 1, 0), radians);
        }
        setZRotation(radians) {
            setAxisAngle(this.rotation, fromValues(0, 0, 1), radians);
        }
        getRight() {
            const vec = [ 0, 0, 0 ];
            return transformQuat(vec, this.right, this.rotation), vec;
        }
        getUp() {
            const vec = [ 0, 0, 0 ];
            return transformQuat(vec, this.up, this.rotation), vec;
        }
        getForward() {
            const vec = [ 0, 0, 0 ];
            return transformQuat(vec, this.forward, this.rotation), vec;
        }
        setFacing(dir) {
            const targetDirection = normalize(create(), dir), dot = vec3_dot(this.getForward(), targetDirection);
            if (dot < -.999999) setAxisAngle(this.rotation, [ 0, 0, 1 ], Math.PI); else if (dot > .999999) !function quat_identity(out) {
                return out[0] = 0, out[1] = 0, out[2] = 0, out[3] = 1, out;
            }(this.rotation); else {
                const rotationAxis = cross(create(), this.getForward(), targetDirection), rotationAngle = Math.acos(dot);
                setAxisAngle(this.rotation, rotationAxis, rotationAngle);
            }
        }
    }
    class MeshInstance extends Entity {
        mesh;
        constructor(mesh) {
            super(), this.mesh = mesh, this.mesh.addMeshInstance(this);
        }
    }
    class ContentWindow {
        parent;
        headerElement;
        contentElement;
        constructor(content) {
            this.headerElement = document.createElement("div"), this.headerElement.style.height = `${ResizableWindow.MINIMUM_DIMENSIONS}px`, 
            this.headerElement.classList.add("window-header"), this.contentElement = content;
        }
        setParent(parent) {
            this.parent = parent;
            const div = this.parent?.getDiv();
            div.append(this.headerElement), div.append(this.contentElement), this.resize(parent.width, parent.height);
        }
    }
    class ResizableWindow {
        static MINIMUM_DIMENSIONS=25;
        static RESIZER_THICKNESS=3;
        activeResizerIndex;
        constructor(width, height, parent, layout) {
            this.width = width, this.height = height, this.parent = parent, this.layout = layout || "horizontal", 
            this.div = document.createElement("div"), this.div.style.setProperty("width", `${this.width}px`), 
            this.div.style.setProperty("height", `${this.height}px`), this.div.classList.add("app-window"), 
            this.children = [], this.resizers = [];
        }
        parent;
        children;
        resizers;
        div;
        layout;
        width;
        height;
        static initializeRootWindow(childLayout) {
            const root = new ResizableWindow(window.innerWidth, window.innerHeight);
            return document.body.appendChild(root.div), root.div.classList.remove("app-window"), 
            root.div.classList.add("app-window-root"), window.addEventListener("resize", (event => {
                root.setBottomTo(window.innerHeight), root.setRightTo(window.innerWidth);
            })), root;
        }
        setBounds(width, height, left, top) {
            this.setWidth(width), this.setHeight(height), this.setLeft(left), this.setTop(top);
        }
        setWidth(width) {
            this.width = width, this.div.style.width = `${width}px`;
        }
        setHeight(height) {
            this.height = height, this.div.style.height = `${height}px`;
        }
        setLeft(left) {
            this.div.style.left = `${left}px`;
        }
        setTop(top) {
            this.div.style.top = `${top}px`;
        }
        getBounds() {
            return this.div.getBoundingClientRect();
        }
        setContent(content) {
            if (!(this.children instanceof ContentWindow || this.children.length <= 1)) throw new Error("Cant set content since there are more than 1 children");
            this.children = content, content.setParent(this);
        }
        getDiv() {
            return this.div;
        }
        addChild(index, layout, size) {
            if (this.children instanceof ContentWindow) throw new Error("Child is already content");
            let child;
            if (index = Math.max(0, index), size = size || ResizableWindow.MINIMUM_DIMENSIONS, 
            0 === this.children.length) child = new ResizableWindow(this.width, this.height, this, layout), 
            this.div.append(child.div), this.children.push(child); else {
                const childrenBefore = this.children.slice(0, index), childrenAfter = this.children.slice(index), childBefore = this.children[index];
                child = new ResizableWindow(0, 0, this, layout), this.children = childrenBefore.concat([ child ], childrenAfter), 
                console.log(childBefore.div), childBefore.div ? this.div.insertBefore(child.div, childBefore.div) : this.div.appendChild(child.div);
                const resizer = document.createElement("div");
                switch (this.layout) {
                  case "horizontal":
                    child.setWidth(size), child.setHeight(this.height), child.setLeft(childBefore.getBounds().left), 
                    child.setTop(this.getBounds().top), childBefore.setLeft(childBefore.getBounds().left + child.width + ResizableWindow.RESIZER_THICKNESS), 
                    childBefore.setWidth(childBefore.getBounds().width - child.width - ResizableWindow.RESIZER_THICKNESS), 
                    resizer.classList.add("verticalResizer"), resizer.style.setProperty("left", childBefore.div.getBoundingClientRect().left - ResizableWindow.RESIZER_THICKNESS + "px"), 
                    resizer.style.setProperty("width", `${ResizableWindow.RESIZER_THICKNESS}px`);
                    break;

                  case "vertical":
                    child.setWidth(this.width), child.setHeight(size), child.setLeft(this.getBounds().left), 
                    child.setTop(childBefore.getBounds().top), childBefore.setTop(childBefore.div.getBoundingClientRect().top + child.height + ResizableWindow.RESIZER_THICKNESS), 
                    childBefore.setHeight(childBefore.div.getBoundingClientRect().height - child.height - ResizableWindow.RESIZER_THICKNESS), 
                    resizer.classList.add("horizontalResizer"), resizer.style.setProperty("top", childBefore.div.getBoundingClientRect().top - ResizableWindow.RESIZER_THICKNESS + "px"), 
                    resizer.style.setProperty("height", `${ResizableWindow.RESIZER_THICKNESS}px`);
                }
                resizer.addEventListener("mousedown", (event => {
                    event.preventDefault(), event.stopPropagation(), this.activeResizerIndex = this.getResizerIndex(resizer);
                    const startPos = {
                        x: event.clientX,
                        y: event.clientY
                    };
                    console.log(this), console.log(startPos);
                    const dragStart = event => {
                        this.moveResizer(event.clientX, event.clientY);
                    }, dragFinish = event => {
                        console.log("finish"), this.activeResizerIndex = void 0, window.removeEventListener("mousemove", dragStart), 
                        window.removeEventListener("mouseup", dragFinish);
                    }, dragCancel = event => {
                        "Escape" === event.key && (console.log("cancel"), this.activeResizerIndex = void 0, 
                        window.removeEventListener("mousemove", dragStart), window.removeEventListener("mouseup", dragFinish), 
                        window.removeEventListener("keydown", dragCancel));
                    };
                    window.addEventListener("mousemove", dragStart), window.addEventListener("keydown", dragCancel), 
                    window.addEventListener("mouseup", dragFinish);
                })), this.div.insertBefore(resizer, childBefore.div), this.resizers.push(resizer);
            }
            return child;
        }
        getResizerIndex(resizer) {
            for (let i = 0; i < this.resizers.length; i++) if (this.resizers[i] === resizer) return i;
            throw console.log(this.resizers), new Error("Resizer does not exist in list 🤔");
        }
        calculateLeftClearance() {
            return this.children instanceof ContentWindow || 0 == this.children.length ? this.getBounds().left + ResizableWindow.MINIMUM_DIMENSIONS : "horizontal" === this.layout ? this.children[this.children.length - 1].calculateLeftClearance() : Math.max(...this.children.map((el => el.calculateLeftClearance())));
        }
        calculateRightClearance() {
            return this.children instanceof ContentWindow || 0 == this.children.length ? (console.log(this.getBounds().left, this.width, ResizableWindow.MINIMUM_DIMENSIONS, ResizableWindow.RESIZER_THICKNESS), 
            this.getBounds().left + this.width - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS) : "horizontal" === this.layout ? this.children[0].calculateRightClearance() : Math.min(...this.children.map((el => el.calculateRightClearance())));
        }
        calculateTopClearance() {
            return this.children instanceof ContentWindow || 0 == this.children.length ? this.div.getBoundingClientRect().top + ResizableWindow.MINIMUM_DIMENSIONS : "vertical" === this.layout ? this.children[this.children.length - 1].calculateTopClearance() : Math.max(...this.children.map((el => el.calculateTopClearance())));
        }
        calculateBottomClearance() {
            return this.children instanceof ContentWindow || 0 == this.children.length ? (console.log("Window: ", this), 
            console.log("Parameters: ", this.div.getBoundingClientRect().top, this.height, ResizableWindow.MINIMUM_DIMENSIONS, ResizableWindow.RESIZER_THICKNESS), 
            this.div.getBoundingClientRect().top + this.height - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS) : "vertical" === this.layout ? this.children[0].calculateBottomClearance() : Math.min(...this.children.map((el => el.calculateBottomClearance())));
        }
        moveResizer(x, y) {
            if (this.children instanceof ContentWindow) throw new Error("There should be no resizer in content");
            if (null == this.activeResizerIndex) throw new Error("There is no resizer to move");
            console.log(x, y);
            const child1 = this.children[this.activeResizerIndex], child2 = this.children[this.activeResizerIndex + 1];
            switch (this.layout) {
              case "horizontal":
                const leftmost = child1.calculateLeftClearance(), rightmost = child2.calculateRightClearance(), resizerLeft = (child1.width, 
                child2.width, Math.max(Math.min(x, rightmost), leftmost));
                this.resizers[this.activeResizerIndex].style.setProperty("left", `${resizerLeft}px`), 
                child1.setRightTo(resizerLeft), child2.setLeftTo(resizerLeft + ResizableWindow.RESIZER_THICKNESS), 
                console.log("Horizontal: ", leftmost, rightmost, resizerLeft);
                break;

              case "vertical":
                const topmost = child1.calculateTopClearance(), bottommost = child2.calculateBottomClearance(), resizerTop = (child1.height, 
                child2.height, Math.max(Math.min(y, bottommost), topmost));
                this.resizers[this.activeResizerIndex].style.setProperty("top", `${resizerTop}px`), 
                child1.setBottomTo(resizerTop), child2.setTopTo(resizerTop + ResizableWindow.RESIZER_THICKNESS), 
                console.log("Vertical: ", topmost, bottommost, resizerTop);
            }
        }
        setTopTo(top) {
            if (top < 0) throw new Error(`top is smaller than 0: ${top}`);
            const originalLayout = this.getBounds();
            if (this.setHeight(this.height - top + originalLayout.top), this.setTop(top), !(this.children instanceof ContentWindow) && this.children.length > 0) switch (this.layout) {
              case "horizontal":
                this.children.forEach((child => {
                    child.setTopTo(top);
                }));
                break;

              case "vertical":
                this.children[0].setTopTo(top);
            }
        }
        setBottomTo(bottom) {
            if (bottom > window.innerHeight) throw new Error(`bottom is greater than window.innerHeight: ${bottom}`);
            const originalLayout = this.getBounds();
            if (bottom <= originalLayout.top) throw new Error("no negative height allowed");
            if (this.setHeight(bottom - originalLayout.top), this.children instanceof ContentWindow && this.children.resize(this.width, this.height), 
            !(this.children instanceof ContentWindow) && this.children.length > 0) switch (this.layout) {
              case "horizontal":
                this.children.forEach((child => {
                    child.setBottomTo(bottom);
                }));
                break;

              case "vertical":
                this.children[this.children.length - 1].setBottomTo(bottom);
            }
        }
        setLeftTo(left) {
            if (left < 0) throw new Error(`left is smaller than 0: ${left}`);
            const originalLayout = this.getBounds();
            if (left >= originalLayout.right) throw new Error("no negative width allowed");
            if (this.setWidth(this.width + originalLayout.left - left), this.setLeft(left), 
            this.children instanceof ContentWindow && this.children.resize(this.width, this.height), 
            !(this.children instanceof ContentWindow) && this.children.length > 0) switch (this.layout) {
              case "vertical":
                this.children.forEach((child => {
                    child.setLeftTo(left);
                }));
                break;

              case "horizontal":
                this.children[0].setLeftTo(left);
            }
        }
        setRightTo(right) {
            if (right > window.innerWidth) throw new Error(`right is greater than window.innerWidth: ${right}`);
            const originalLayout = this.getBounds();
            if (right <= originalLayout.left) throw new Error("no negative width allowed");
            if (this.setWidth(right - originalLayout.left), this.children instanceof ContentWindow && this.children.resize(this.width, this.height), 
            !(this.children instanceof ContentWindow) && this.children.length > 0) switch (this.layout) {
              case "vertical":
                this.children.forEach((child => {
                    child.setRightTo(right);
                }));
                break;

              case "horizontal":
                this.children[this.children.length - 1].setRightTo(right);
            }
        }
    }
    class Camera extends Entity {
        constructor() {
            super(), this.projectionMatrix = mat4_create(), this.viewMatrix = mat4_create(), 
            this.projection = "perspective", this.setPerspectiveProjection(1.5708, 16 / 9, .1, 100);
        }
        projectionMatrix;
        viewMatrix;
        projection;
        setOrthographicProjection(cx, cy, near, far) {
            this.projection = "orthographic", mat4_identity(this.projectionMatrix), ortho(this.projectionMatrix, -cx / 2, cx / 2, -cy / 2, cy / 2, near, far);
        }
        setPerspectiveProjection(fovy, aspect, near, far) {
            this.projection = "perspective", mat4_identity(this.projectionMatrix), perspective(this.projectionMatrix, fovy, aspect, near, far);
        }
        getProjectionMatrix() {
            return this.projectionMatrix;
        }
        getViewMatrix() {
            const direction = clone(this.getForward());
            return mat4_identity(this.viewMatrix), function lookAt(out, eye, center, up) {
                var x0, x1, x2, y0, y1, y2, z0, z1, z2, len, eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2], centerx = center[0], centery = center[1], centerz = center[2];
                return Math.abs(eyex - centerx) < 1e-6 && Math.abs(eyey - centery) < 1e-6 && Math.abs(eyez - centerz) < 1e-6 ? mat4_identity(out) : (z0 = eyex - centerx, 
                z1 = eyey - centery, z2 = eyez - centerz, x0 = upy * (z2 *= len = 1 / Math.hypot(z0, z1, z2)) - upz * (z1 *= len), 
                x1 = upz * (z0 *= len) - upx * z2, x2 = upx * z1 - upy * z0, (len = Math.hypot(x0, x1, x2)) ? (x0 *= len = 1 / len, 
                x1 *= len, x2 *= len) : (x0 = 0, x1 = 0, x2 = 0), y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, 
                y2 = z0 * x1 - z1 * x0, (len = Math.hypot(y0, y1, y2)) ? (y0 *= len = 1 / len, y1 *= len, 
                y2 *= len) : (y0 = 0, y1 = 0, y2 = 0), out[0] = x0, out[1] = y0, out[2] = z0, out[3] = 0, 
                out[4] = x1, out[5] = y1, out[6] = z1, out[7] = 0, out[8] = x2, out[9] = y2, out[10] = z2, 
                out[11] = 0, out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez), out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez), 
                out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez), out[15] = 1, out);
            }(this.viewMatrix, this.getPosition(), add(create(), direction, this.getPosition()), this.getUp()), 
            this.viewMatrix;
        }
        getProjectionType() {
            return this.projection;
        }
        getNdcCoords(pos) {
            const proj = this.getProjectionMatrix(), view = this.getViewMatrix(), posVector = vec4_fromValues(pos[0], pos[1], pos[2], 1), viewTransform = vec4_transformMat4(vec4_create(), posVector, view), projTransform = vec4_transformMat4(vec4_create(), viewTransform, proj);
            return vec4_scale(projTransform, projTransform, 1 / projTransform[3]), projTransform;
        }
        getWorldCoordsFromNdc(ndc) {
            const invProj = mat4_invert(mat4_create(), this.getProjectionMatrix()), invView = mat4_invert(mat4_create(), this.getViewMatrix()), eyeCoords = vec4_create();
            vec4_transformMat4(eyeCoords, ndc, invProj);
            const worldCoords = vec4_create();
            return vec4_transformMat4(worldCoords, eyeCoords, invView), vec4_scale(worldCoords, worldCoords, 1 / worldCoords[3]), 
            worldCoords;
        }
    }
    class Util {
        static randomColor(alpha) {
            return {
                r: Math.random(),
                g: Math.random(),
                b: Math.random(),
                a: alpha
            };
        }
        static deepEqual(obj1, obj2) {
            if ("object" != typeof obj1 || "object" != typeof obj2 || null === obj1 || null === obj2) return obj1 === obj2;
            const keys1 = Object.keys(obj1), keys2 = Object.keys(obj2);
            if (keys1.length !== keys2.length) return !1;
            for (const key of keys1) if (!obj2.hasOwnProperty(key) || !Util.deepEqual(obj1[key], obj2[key])) return !1;
            return !0;
        }
        static degreeToRadians(deg) {
            return deg * (Math.PI / 180);
        }
        static radiansToDegree(radians) {
            return radians * (180 / Math.PI);
        }
        static cartesianToSpherical(vec) {
            let azimuth = Math.atan2(vec[1], vec[0]), r = len(vec);
            return {
                r,
                phi: Math.asin(vec[2] / r),
                theta: azimuth
            };
        }
        static sphericalToCartesian(vec) {
            return [ vec.r * Math.sin(vec.phi) * Math.cos(vec.theta), vec.r * Math.sin(vec.phi) * Math.sin(vec.theta), vec.r * Math.cos(vec.phi) ];
        }
    }
    class Renderer {
        webgpu=App.getInstance().webgpu;
        viewport;
        constructor(name, viewport) {
            this.name = name, this.viewport = viewport;
        }
        buffers=new Map;
        bufferModifiers=new Map;
        textures=new Map;
        textureModifiers=new Map;
        name;
        passes=[];
        createBuffer(descriptor, label, modifier) {
            descriptor.label = label;
            const buffer = this.webgpu.getDevice().createBuffer(descriptor);
            return this.buffers.get(label)?.destroy(), this.buffers.set(label, buffer), modifier && this.bufferModifiers.set(label, modifier), 
            buffer;
        }
        destroyBuffer(label) {
            this.buffers.get(label)?.destroy(), this.buffers.delete(label), this.bufferModifiers.delete(label);
        }
        getBuffer(label) {
            const buffer = this.buffers.get(label);
            if (buffer) return buffer;
            throw new Error(`There is no buffer with the label: ${label}`);
        }
        getBufferUpdated(label) {
            const buffer = this.getBuffer(label), modifier = this.bufferModifiers.get(label);
            return modifier && modifier.modified && (modifier.update(this.viewport), modifier.modified = !1), 
            buffer;
        }
        getBuffers() {
            return this.buffers;
        }
        createTexture(descriptor, label, modifier) {
            descriptor.label = label;
            const texture = this.webgpu.getDevice().createTexture(descriptor);
            return this.textures.get(label)?.destroy(), this.textures.set(label, texture), modifier && this.textureModifiers.set(label, modifier), 
            texture;
        }
        destroyTexture(label) {
            this.textures.get(label)?.destroy(), this.textures.delete(label), this.textureModifiers.delete(label);
        }
        getTexture(label) {
            const texture = this.textures.get(label);
            if (texture) {
                const modifier = this.textureModifiers.get(label);
                return modifier && modifier.modified && (modifier.update(this.viewport), modifier.modified = !1), 
                texture;
            }
            throw new Error(`There is no texture with the label: ${label}`);
        }
        getTextures() {
            return this.textures;
        }
        async loadTextureFromFile(file) {
            if (!file.type.includes("image")) throw new Error(`Type: ${file.type} is not a image type.`);
            const blob = await file.arrayBuffer(), imageBitmap = await createImageBitmap(new Blob([ blob ])), descriptor = {
                size: {
                    width: imageBitmap.width,
                    height: imageBitmap.height
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                label: file.name
            }, texture = this.createTexture(descriptor, file.name);
            this.webgpu.getDevice().queue.copyExternalImageToTexture({
                source: imageBitmap
            }, {
                texture
            }, [ imageBitmap.width, imageBitmap.height, 1 ]);
        }
        updateCameraData=viewport => {
            const renderer = viewport.getRenderer(), cameraValues = new ArrayBuffer(144), cameraViews = {
                view: new Float32Array(cameraValues, 0, 16),
                proj: new Float32Array(cameraValues, 64, 16),
                width: new Uint32Array(cameraValues, 128, 1),
                height: new Uint32Array(cameraValues, 132, 1)
            };
            viewport.camera.getViewMatrix();
            cameraViews.view.set(viewport.camera.getViewMatrix()), cameraViews.proj.set(viewport.camera.getProjectionMatrix()), 
            cameraViews.width.set([ viewport.width ]), cameraViews.height.set([ viewport.height ]);
            const cameraBuffer = renderer.createBuffer({
                size: cameraValues.byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC,
                label: "camera"
            }, "camera");
            App.getRenderDevice().queue.writeBuffer(cameraBuffer, 0, cameraValues);
        };
    }
    class RenderPass {
        constructor(renderer, input, output) {
            this.renderer = renderer, this.inputResources = input, this.outputResources = output;
        }
        inputResources;
        renderer;
        outputResources;
        getInputResources() {
            return this.inputResources;
        }
        getOutputResources() {
            return this.outputResources;
        }
    }
    class TrianglePass extends RenderPass {
        drawParameters=new Uint32Array;
        vertexBufferLayout={
            arrayStride: 32,
            attributes: TriangleMesh.attributes,
            stepMode: "vertex"
        };
        depthStencilState={
            format: "depth32float",
            depthWriteEnabled: !0,
            depthCompare: "less"
        };
        constructor(renderer) {
            super(renderer, [ {
                label: "camera",
                resource: "buffer"
            }, {
                label: "vertex",
                resource: "buffer"
            }, {
                label: "index",
                resource: "buffer"
            }, {
                label: "transform",
                resource: "buffer"
            }, {
                label: "color",
                resource: "texture"
            }, {
                label: "render-depth",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "buffer"
            } ], [ {
                label: "color",
                resource: "texture"
            }, {
                label: "render-depth",
                resource: "texture"
            }, {
                label: "normal",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "texture"
            } ]), this.renderer.createBuffer({
                size: 32,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
            }, "vertex", {
                modified: !0,
                update: this.createMeshBuffer
            }), this.renderer.createBuffer({
                size: 32,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
            }, "index", {
                modified: !0,
                update: this.createMeshBuffer
            }), this.renderer.createBuffer({
                size: 32,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
            }, "transform", {
                modified: !0,
                update: this.createMeshBuffer
            });
        }
        createMeshBuffer(viewport) {
            const scene = viewport.scene;
            let vertexSize = 0, indexSize = 0;
            const transformArray = new Float32Array(16 * scene.entities.size), instances = new Map;
            scene.entities.forEach(((object, name) => {
                if (!(object instanceof MeshInstance)) return;
                const mesh = object.mesh, instance = instances.get(mesh), id = scene.getId(object);
                if (transformArray.set(object.getWorldTransform(), 16 * id), !instance) return vertexSize += mesh.vertexBuffer.length, 
                indexSize += mesh.elementBuffer.length, void instances.set(mesh, {
                    count: 1,
                    ids: [ id ]
                });
                instance.count++, instance.ids.push(id);
            }));
            const vertexArray = new Float32Array(vertexSize), indexArray = new Uint32Array(indexSize), idArray = new Uint32Array(scene.entities.size), drawParameters = new Uint32Array(5 * instances.size);
            let vertexOffset = 0, indexOffset = 0, objectOffset = 0, index = 0;
            instances.forEach(((value, mesh) => {
                vertexArray.set(mesh.vertexBuffer, vertexOffset), indexArray.set(mesh.elementBuffer.map((index => index + vertexOffset / 8)), indexOffset), 
                idArray.set(value.ids, objectOffset), drawParameters.set([ mesh.elementBuffer.length, value.count, indexOffset, 0, objectOffset ], 5 * index), 
                vertexOffset += mesh.vertexBuffer.length, indexOffset += mesh.elementBuffer.length, 
                objectOffset += value.count, index++;
            }));
            const min = WebGPU.minBuffersize, vertexBuffer = this.renderer.createBuffer({
                size: Math.max(vertexArray.byteLength, min),
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
            }, "vertex"), indexBuffer = this.renderer.createBuffer({
                size: Math.max(indexArray.byteLength, min),
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
            }, "index"), transformBuffer = this.renderer.createBuffer({
                size: Math.max(transformArray.byteLength, min),
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
            }, "transform"), objectIndexBuffer = this.renderer.createBuffer({
                size: Math.max(idArray.byteLength, min),
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
            }, "object-index"), device = App.getRenderDevice();
            device.queue.writeBuffer(vertexBuffer, 0, vertexArray), device.queue.writeBuffer(indexBuffer, 0, indexArray), 
            device.queue.writeBuffer(transformBuffer, 0, transformArray), device.queue.writeBuffer(objectIndexBuffer, 0, idArray), 
            this.drawParameters = drawParameters;
        }
        render(viewport) {
            this.createMeshBuffer(viewport);
            const device = App.getRenderDevice(), colorTexture = this.renderer.getTexture("color"), depthTexture = this.renderer.getTexture("render-depth"), objectIndexTexture = this.renderer.getTexture("object-index"), normalTexture = this.renderer.getTexture("normal"), objectIndexBuffer = this.renderer.getBuffer("object-index"), cameraUniformBuffer = this.renderer.getBuffer("camera"), vertexBuffer = this.renderer.getBuffer("vertex"), indexBuffer = this.renderer.getBuffer("index"), transformBuffer = this.renderer.getBuffer("transform"), bindgroupLayout = device.createBindGroupLayout({
                entries: [ {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"
                    }
                } ]
            }), bindgroup = device.createBindGroup({
                layout: bindgroupLayout,
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: cameraUniformBuffer
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: transformBuffer
                    }
                }, {
                    binding: 2,
                    resource: {
                        buffer: objectIndexBuffer
                    }
                } ]
            }), renderPassDescriptor = {
                colorAttachments: [ {
                    clearValue: {
                        r: 0,
                        g: 0,
                        b: 0,
                        a: 1
                    },
                    loadOp: "clear",
                    storeOp: "store",
                    view: colorTexture.createView()
                }, {
                    clearValue: {
                        r: 0,
                        g: 0,
                        b: 0,
                        a: 1
                    },
                    loadOp: "clear",
                    storeOp: "store",
                    view: normalTexture.createView()
                }, {
                    loadOp: "clear",
                    storeOp: "store",
                    view: objectIndexTexture.createView()
                } ],
                depthStencilAttachment: {
                    view: depthTexture.createView(),
                    depthLoadOp: "clear",
                    depthStoreOp: "store",
                    depthClearValue: 1
                },
                label: "triangle pass"
            }, shaderModule = device.createShaderModule({
                code: "\r\nstruct Camera {\r\n    view: mat4x4<f32>,\r\n    proj: mat4x4<f32>,\r\n    width: u32,\r\n    height: u32   \r\n}\r\n\r\n\r\nstruct VertexIn {\r\n    @location(0) position: vec3<f32>,\r\n    @location(1) normal: vec3<f32>,\r\n    @location(2) uv: vec2<f32>,\r\n    @builtin(instance_index) instanceId: u32\r\n}\r\n\r\n\r\n\r\nstruct VertexOut {\r\n      @builtin(position) position: vec4<f32>,\r\n      @location(0) fragPosition: vec3<f32>,\r\n      @location(1) normal: vec3<f32>,\r\n      @location(2) uv: vec2<f32>,\r\n      @location(3) @interpolate(flat) objectId: u32,\r\n}\r\n\r\n\r\n@binding(0) @group(0) var<uniform> camera : Camera;\r\n@binding(1) @group(0) var<storage,read> modelTransforms : array<mat4x4<f32>>;\r\n@binding(2) @group(0) var<storage,read> objectIndex: array<u32>;\r\n\r\n    \r\n@vertex\r\nfn vertex_main(input : VertexIn) -> VertexOut {\r\n\r\n    let objectId = objectIndex[input.instanceId];\r\n\r\n\r\n    var modelTransform: mat4x4<f32> = modelTransforms[objectId];\r\n    var output: VertexOut;\r\n    output.position = camera.proj * camera.view * modelTransform * vec4<f32>(input.position, 1.0f);\r\n    output.fragPosition = output.position.xyz;\r\n    output.normal = (modelTransform * vec4<f32>(input.normal, 0.0f)).xyz;\r\n    output.uv = input.uv;\r\n    output.objectId = objectId+1u;\r\n    return output;\r\n}\r\n\r\nstruct FragmentOut {\r\n    @location(0) color : vec4<f32>,\r\n    @location(1) normal: vec4<f32>,\r\n    @location(2) object: u32,\r\n}\r\n\r\n\r\n\r\n\r\n@fragment\r\nfn fragment_object(fragData: VertexOut) -> @location(0) u32 {\r\n\r\n    return fragData.objectId;\r\n}\r\n\r\n\r\n\r\n\r\n    \r\n@fragment\r\nfn fragment_main(fragData: VertexOut) -> FragmentOut {\r\n    let normal = normalize(fragData.normal);\r\n\r\n    let color = vec3<f32>(1.0,1.0,1.0) * ((dot(normal, normalize(vec3<f32>(1.0, 2.0, 3.0))) + 1.0) / 2.0);\r\n\r\n    var output : FragmentOut;\r\n    output.color = vec4<f32>(color,1.0);\r\n    output.normal = vec4<f32>(normal,1.0);\r\n    output.object = fragData.objectId;\r\n\r\n    return output;\r\n}"
            }), pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [ bindgroupLayout ]
            }), renderPipeline = device.createRenderPipeline({
                vertex: {
                    module: shaderModule,
                    entryPoint: "vertex_main",
                    buffers: [ this.vertexBufferLayout ]
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: "fragment_main",
                    targets: [ {
                        format: "rgba8unorm"
                    }, {
                        format: "rgba8unorm"
                    }, {
                        format: "r32uint"
                    } ]
                },
                primitive: {
                    topology: "triangle-list"
                },
                layout: pipelineLayout,
                depthStencil: this.depthStencilState,
                label: "triangle mesh rendering"
            });
            App.getWebGPU().attachTimestamps(renderPassDescriptor);
            const commandEncoder = device.createCommandEncoder({
                label: "trianglePass"
            }), renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
            renderPass.pushDebugGroup("rendering triangles"), renderPass.setPipeline(renderPipeline), 
            renderPass.setBindGroup(0, bindgroup), renderPass.setVertexBuffer(0, vertexBuffer), 
            renderPass.setIndexBuffer(indexBuffer, "uint32");
            for (let i = 0; i < this.drawParameters.length; i += 5) renderPass.drawIndexed(this.drawParameters[i], this.drawParameters[i + 1], this.drawParameters[i + 2], this.drawParameters[i + 3], this.drawParameters[i + 4]);
            renderPass.popDebugGroup(), renderPass.end(), App.getWebGPU().prepareTimestampsResolution(renderPassDescriptor, commandEncoder), 
            device.queue.submit([ commandEncoder.finish() ]), App.getWebGPU().resolveTimestamp(renderPassDescriptor).then((result => {})).catch((error => {
                console.error("Failed to resolve timestamps:", error);
            }));
        }
    }
    const fullQuadShader = "struct VertexOutput {\r\n    @builtin(position)\r\n    position: vec4<f32>,\r\n    @location(0)\r\n    uv: vec2<f32>,\r\n};\r\n\r\n// This vertex shader produces the following, when drawn using indices 0..3:\r\n//\r\n//  1 |  0-----x.....2\r\n//  0 |  |  s  |  . ´\r\n// -1 |  x_____x´\r\n// -2 |  :  .´\r\n// -3 |  1´\r\n//    +---------------\r\n//      -1  0  1  2  3\r\n//\r\n// The axes are clip-space x and y. The region marked s is the visible region.\r\n// The digits in the corners of the right-angled triangle are the vertex\r\n// indices.\r\n//\r\n// The top-left has UV 0,0, the bottom-left has 0,2, and the top-right has 2,0.\r\n// This means that the UV gets interpolated to 1,1 at the bottom-right corner\r\n// of the clip-space rectangle that is at 1,-1 in clip space.\r\n@vertex\r\nfn fullscreen_vertex_shader(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {\r\n    // See the explanation above for how this works\r\n\r\n    var positions = array<vec2<f32>, 6>(\r\n        vec2<f32>(-1.0, -1.0), // Bottom-left\r\n        vec2<f32>( 1.0, -1.0), // Bottom-right\r\n        vec2<f32>(-1.0,  1.0), // Top-left\r\n        vec2<f32>(-1.0,  1.0), // Top-left\r\n        vec2<f32>( 1.0, -1.0), // Bottom-right\r\n        vec2<f32>( 1.0,  1.0)  // Top-right\r\n    );\r\n\r\n    // Define the UV coordinates for the quad\r\n    var uvs = array<vec2<f32>, 6>(\r\n        vec2<f32>(0.0, 1.0), // Top-left\r\n        vec2<f32>(1.0, 1.0), // Top-right\r\n        vec2<f32>(0.0, 0.0), // Bottom-left\r\n        vec2<f32>(0.0, 0.0), // Bottom-left\r\n        vec2<f32>(1.0, 1.0), // Top-right\r\n        vec2<f32>(1.0, 0.0)  // Bottom-right\r\n    );\r\n\r\n\r\n    var output: VertexOutput;\r\n    output.position = vec4<f32>(positions[vertex_index],0.0,1.0);\r\n    output.uv = vec2<f32>(uvs[vertex_index]);\r\n\r\n\r\n    return output;\r\n}";
    class SelectionOutlinePass extends RenderPass {
        constructor(renderer, primaryColor, secondaryColor) {
            super(renderer, [ {
                label: "color",
                resource: "texture"
            }, {
                label: "render-depth",
                resource: "texture"
            }, {
                label: "object-index",
                resource: "texture"
            } ], [ {
                label: "combined",
                resource: "texture"
            }, {
                label: "selection",
                resource: "texture"
            } ]), this.primaryColor = primaryColor, this.secondaryColor = secondaryColor;
        }
        primaryColor;
        secondaryColor;
        shader=`\n        ${fullQuadShader}\n\n        struct Camera {\n            view:mat4x4<f32>,\n            proj:mat4x4<f32>,\n            width:u32,\n            height:u32,\n        }\n\n        struct Selections {\n            primaryColor: vec4<f32>,\n            secondaryColor: vec4<f32>,\n            count: u32,                  // all selections including primary\n            primary: u32,                // index of primary in indecies\n            indecies: array<u32>         // all selections including primary\n        }\n\n        struct FragmentOut {\n            @location(0) color: vec4<f32>,\n            @location(1) selection: vec4<f32>\n        }\n\n        // i feel like inverting it is unintuitive\n        fn fresnel(normal:vec3<f32>, view:vec3<f32>, exponent:f32) -> f32 {\n            return (1.0 - pow(dot(view,normal), exponent));\n        }\n\n        fn linearizeDepth(depth: f32, near: f32, far: f32) -> f32 {\n            return (2.0 * near * far) / (far + near - depth * (far - near));\n        }\n\n        fn chooseObjectIndex(r : u32,uv:vec2<f32>, delta: vec2<f32>) -> u32 {\n            let x = u32(uv.x * f32(camera.width));\n            let y = u32(uv.y * f32(camera.height));\n\n            if (abs(delta.x) >= abs(delta.y)) {\n                if (delta.x <= 0) { \n                    return textureLoad(objectTexture,vec2<u32>(x,y),0).r;\n                } else {\n                    return textureLoad(objectTexture,vec2<u32>(x+r,y+r),0).r;\n                }\n            } else {\n                if (delta.y <= 0) {\n                    return textureLoad(objectTexture,vec2<u32>(x+r,y),0).r;\n                } else {\n                    return textureLoad(objectTexture,vec2<u32>(x,y+r),0).r;\n                }\n            }\n        }\n\n\n        fn robertsCross(radius : f32, texture : texture_depth_2d, coords : vec2<f32>) -> vec2<f32> {\n\n            let m10 = camera.proj[2][2];\n            let m14 = camera.proj[2][3];\n\n            let near = m14 / (m10 - 1);\n            let far = m14 / (m10 + 1);\n\n            let x : f32 = radius / (f32(camera.width));\n            let y : f32 = radius / (f32(camera.height));\n\n            var samples = array<f32,4>(\n                linearizeDepth(textureSample(texture,textureSampler,coords),near,far),\n                linearizeDepth(textureSample(texture,textureSampler,coords + vec2<f32>(0,y)),near,far),\n                linearizeDepth(textureSample(texture,textureSampler,coords + vec2<f32>(x,0)),near,far),\n                linearizeDepth(textureSample(texture,textureSampler,coords + vec2<f32>(x,y)),near,far),\n            );\n\n            return vec2<f32>((samples[0] - samples[3]), (samples[2] - samples[1]));\n        }\n\n        fn sumDerivatives (delta : vec2<f32>) -> f32 {\n            return abs(delta.x) + abs(delta.y);\n        }\n\n        fn isSelected(id:u32) -> bool {\n            for (var i : u32 = 0; i < selections.count; i++) {\n                if (id == selections.indecies[i]) {\n                    return true;\n                }\n            }\n            return false;\n        }\n\n        \n        @binding(0) @group(0) var depthTexture : texture_depth_2d;\n        @binding(1) @group(0) var objectTexture : texture_2d<u32>;\n        @binding(2) @group(0) var normalTexture : texture_2d<f32>;\n        @binding(3) @group(0) var colorTexture : texture_2d<f32>;  \n        @binding(4) @group(0) var<storage,read> selections : Selections;\n        @binding(5) @group(0) var<uniform> camera : Camera;\n        @binding(6) @group(0) var textureSampler : sampler;\n\n        @fragment\n        fn selection_main(input : VertexOutput) -> FragmentOut {\n\n            let view = vec3<f32>(-camera.view[0][2],-camera.view[1][2],-camera.view[2][2]);\n            let normal = textureSample(normalTexture,textureSampler,input.uv);\n            let color = textureSample(colorTexture,textureSampler,input.uv);\n\n\n\n\n            var out : FragmentOut;\n            let delta : vec2<f32> = robertsCross(1.5,depthTexture,input.uv);\n            let gradient : f32 = sumDerivatives(delta) / sqrt(2.0);\n            let objectId : u32 = chooseObjectIndex(u32(1.5),input.uv,delta);\n            let selected = isSelected(objectId);\n\n            let fresnel = fresnel(normal.xyz,view,1);\n            var outline = gradient * fresnel;\n\n\n            if (gradient < 0.80 || !selected) { \n                out.color = color;\n            } else {\n                if (objectId == selections.primary) {\n                    if (selections.primary != 0) {\n                        out.color = selections.primaryColor;\n                    } \n                } else {\n                    out.color = selections.secondaryColor;\n                }\n            }\n\n            out.selection = vec4<f32>(outline,outline,outline,1.0);\n        \n            return out;\n         \n        }\n    `;
        createSelectionBuffer(viewport) {
            const scene = viewport.scene, selections = Array.from(scene.selections), selectionsValues = new ArrayBuffer(48 + 4 * selections.length), selectionsViews = {
                primaryColor: new Float32Array(selectionsValues, 0, 4),
                secondaryColor: new Float32Array(selectionsValues, 16, 4),
                count: new Uint32Array(selectionsValues, 32, 1),
                primary: new Uint32Array(selectionsValues, 36, 1),
                indecies: new Uint32Array(selectionsValues, 40, selections.length + 2)
            };
            selectionsViews.primaryColor.set(Object.values(this.primaryColor)), selectionsViews.secondaryColor.set(Object.values(this.secondaryColor)), 
            selectionsViews.count.set([ selections.length ]), selectionsViews.primary.set([ scene.primarySelection ? scene.getId(scene.primarySelection) + 1 : 0 ]), 
            selectionsViews.indecies.set(selections.map((entity => scene.getId(entity) + 1)));
            const selectionBuffer = this.renderer.createBuffer({
                size: selectionsValues.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            }, "selection");
            App.getRenderDevice().queue.writeBuffer(selectionBuffer, 0, selectionsValues);
        }
        render(viewport) {
            this.createSelectionBuffer(viewport);
            const device = App.getRenderDevice(), colorTexture = (viewport.scene, this.renderer.getTexture("color")), colorInputTexture = device.createTexture({
                size: {
                    width: viewport.width,
                    height: viewport.height
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
            }), depthTexture = this.renderer.getTexture("render-depth"), normalTexture = this.renderer.getTexture("normal"), objectIndexTexture = this.renderer.getTexture("object-index"), selectionTexture = this.renderer.createTexture({
                size: {
                    width: viewport.width,
                    height: viewport.height
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            }, "selection"), selectionBuffer = this.renderer.getBuffer("selection"), cameraUniformBuffer = this.renderer.getBuffer("camera"), sampler = device.createSampler({
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge",
                magFilter: "linear",
                minFilter: "linear"
            }), bindGroupLayout = device.createBindGroupLayout({
                entries: [ {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "depth"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "uint"
                    }
                }, {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }, {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }, {
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage"
                    }
                }, {
                    binding: 5,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }, {
                    binding: 6,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                } ]
            }), bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [ {
                    binding: 0,
                    resource: depthTexture.createView({
                        aspect: "depth-only"
                    })
                }, {
                    binding: 1,
                    resource: objectIndexTexture.createView()
                }, {
                    binding: 2,
                    resource: normalTexture.createView()
                }, {
                    binding: 3,
                    resource: colorInputTexture.createView()
                }, {
                    binding: 4,
                    resource: {
                        buffer: selectionBuffer
                    }
                }, {
                    binding: 5,
                    resource: {
                        buffer: cameraUniformBuffer
                    }
                }, {
                    binding: 6,
                    resource: sampler
                } ]
            }), pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [ bindGroupLayout ]
            }), shaderModule = device.createShaderModule({
                code: this.shader
            }), renderPassDescriptor = {
                colorAttachments: [ {
                    view: colorTexture.createView(),
                    storeOp: "store",
                    loadOp: "clear"
                }, {
                    view: selectionTexture.createView(),
                    storeOp: "store",
                    loadOp: "clear"
                } ]
            }, pipeline = device.createRenderPipeline({
                vertex: {
                    module: shaderModule,
                    entryPoint: "fullscreen_vertex_shader"
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: "selection_main",
                    targets: [ {
                        format: "rgba8unorm"
                    }, {
                        format: "rgba8unorm"
                    } ]
                },
                layout: pipelineLayout
            }), commandEncoder = device.createCommandEncoder();
            commandEncoder.copyTextureToTexture({
                texture: colorTexture
            }, {
                texture: colorInputTexture
            }, {
                width: viewport.width,
                height: viewport.height
            });
            const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
            pass.setBindGroup(0, bindGroup), pass.setPipeline(pipeline), pass.draw(6, 1, 0, 0), 
            pass.end(), device.queue.submit([ commandEncoder.finish() ]);
        }
    }
    class CoordinatePlanePass extends RenderPass {
        constructor(renderer) {
            super(renderer, [ {
                label: "camera",
                resource: "buffer"
            }, {
                label: "render-depth",
                resource: "texture"
            } ], [ {
                label: "color",
                resource: "texture"
            } ]);
        }
        shader="\n    \n    struct VertexOutput {\n        @builtin(position)\n        position: vec4<f32>,\n        @location(0)\n        uv: vec2<f32>,\n    };\n    \n\n    @binding(0) @group(0) var<uniform> camera : Camera;\n    @binding(1) @group(0) var<uniform> dist : f32;\n    \n    @vertex\n    fn plane_vertex(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {\n        // See the explanation above for how this works\n    \n        var positions = array<vec2<f32>, 6>(\n            vec2<f32>(-1.0, -1.0), // \n            vec2<f32>( 1.0, -1.0), // \n            vec2<f32>(-1.0,  1.0), // \n            vec2<f32>(-1.0,  1.0), // \n            vec2<f32>( 1.0, -1.0), // \n            vec2<f32>( 1.0,  1.0)  // \n        );\n    \n        // Define the UV coordinates for the quad\n        var uvs = array<vec2<f32>, 6>(\n            vec2<f32>(0.0, 0.0), // Bottom-left\n            vec2<f32>(1.0, 0.0), // Bottom-right\n            vec2<f32>(0.0, 1.0), // Top-left\n            vec2<f32>(0.0, 1.0), // Top-left\n            vec2<f32>(1.0, 0.0), // Bottom-right\n            vec2<f32>(1.0, 1.0)  // Top-right\n        );\n    \n        \n\n\n        let scale = mat4x4<f32>(\n            vec4<f32>(dist, 0.0, 0.0, 0.0),\n            vec4<f32>(0.0, dist, 0.0, 0.0),\n            vec4<f32>(0.0, 0.0, dist, 0.0),\n            vec4<f32>(0.0, 0.0, 0.0, 1.0)\n        );\n\n\n        var output: VertexOutput;\n        output.position = camera.proj * camera.view * scale * vec4<f32>(positions[vertex_index],0.0,1.0);\n        output.uv = vec2<f32>(uvs[vertex_index]);\n    \n        return output;\n    }\n\n\n\n\n    struct Camera {\n        view:mat4x4<f32>,\n        proj:mat4x4<f32>,\n        width:u32,\n        height:u32,\n    }\n    \n    fn PristineGrid(uv: vec2f, lineWidth: vec2f) -> f32 {\n        let uvDDXY = vec4f(dpdx(uv), dpdy(uv));\n        let uvDeriv = vec2f(length(uvDDXY.xz), length(uvDDXY.yw));\n        let invertLine: vec2<bool> = lineWidth > vec2f(0.5);\n        let targetWidth: vec2f = select(lineWidth, 1 - lineWidth, invertLine);\n        let drawWidth: vec2f = clamp(targetWidth, uvDeriv, vec2f(0.5));\n        let lineAA: vec2f = uvDeriv * 1.5;\n        var gridUV: vec2f = abs(fract(uv) * 2.0 - 1.0);\n        gridUV = select(1 - gridUV, gridUV, invertLine);\n        var grid2: vec2f = smoothstep(drawWidth + lineAA, drawWidth - lineAA, gridUV);\n        grid2 *= saturate(targetWidth / drawWidth);\n        grid2 = mix(grid2, targetWidth, saturate(uvDeriv * 2.0 - 1.0));\n        grid2 = select(grid2, 1.0 - grid2, invertLine);\n        return mix(grid2.x, 1.0, grid2.y);\n    }\n    \n\n    @fragment\n    fn plane_fragment(input : VertexOutput) -> @location(0) vec4<f32> {\n        \n        let coords : vec2<f32> = (input.uv * dist) - dist / 2.0;\n        \n        let grid = PristineGrid(input.uv * 200, vec2f(0.03,0.03));\n        let grid2 = PristineGrid(input.uv * 20, vec2f(0.003,0.003));\n\n        let dx = saturate(distance(input.uv.x, 0.5)*1000);\n        let dy = saturate(distance(input.uv.y, 0.5)*1000);\n\n        let linecolor : vec4f = saturate(vec4<f32>(dx,dy,min(dx,dy),1.0));\n\n        return mix(vec4f(0.0,0.0,0.0,0.0),vec4<f32>(1.0,1.0,1.0,1.0),saturate(grid+grid2) * linecolor);\n    }\n\n\n    ";
        render(viewport) {
            const device = App.getRenderDevice();
            this.renderer.updateCameraData(viewport);
            const colorTexture = this.renderer.getTexture("color"), cameraBuffer = this.renderer.getBuffer("camera"), depthTexture = this.renderer.getTexture("render-depth"), orbitBuffer = device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
                label: "orbit-center"
            });
            device.queue.writeBuffer(orbitBuffer, 0, new Float32Array([ 100 ]));
            const bindgroupLayout = device.createBindGroupLayout({
                entries: [ {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                } ]
            }), bindgroup = device.createBindGroup({
                layout: bindgroupLayout,
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: cameraBuffer
                    }
                }, {
                    binding: 1,
                    resource: {
                        buffer: orbitBuffer
                    }
                } ]
            }), pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [ bindgroupLayout ]
            }), shaderModule = device.createShaderModule({
                code: this.shader
            }), pipeline = device.createRenderPipeline({
                vertex: {
                    module: shaderModule,
                    entryPoint: "plane_vertex"
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: "plane_fragment",
                    targets: [ {
                        format: "rgba8unorm",
                        blend: {
                            color: {
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add"
                            },
                            alpha: {
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add"
                            }
                        }
                    } ]
                },
                layout: pipelineLayout,
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: !0,
                    depthCompare: "less"
                }
            }), passDescriptor = {
                colorAttachments: [ {
                    storeOp: "store",
                    loadOp: "load",
                    view: colorTexture.createView()
                } ],
                depthStencilAttachment: {
                    view: depthTexture.createView(),
                    depthLoadOp: "load",
                    depthStoreOp: "store",
                    depthClearValue: 1
                },
                label: "plane pass"
            }, commandEncoder = device.createCommandEncoder(), pass = commandEncoder.beginRenderPass(passDescriptor);
            pass.setBindGroup(0, bindgroup), pass.setPipeline(pipeline), pass.draw(6, 1, 0, 0), 
            pass.end(), device.queue.submit([ commandEncoder.finish() ]);
        }
    }
    class BasicRenderer extends Renderer {
        constructor(viewport) {
            super("basic", viewport), this.passes = [ new TrianglePass(this), new SelectionOutlinePass(this, [ 1, 1, 0, 1 ], [ 0, 1, 0, 1 ]), new CoordinatePlanePass(this) ];
        }
        render() {
            this.createTexture({
                size: {
                    width: this.viewport.width,
                    height: this.viewport.height
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            }, "color"), this.createTexture({
                size: {
                    width: this.viewport.width,
                    height: this.viewport.height
                },
                format: "depth32float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            }, "render-depth"), this.createTexture({
                size: {
                    width: this.viewport.width,
                    height: this.viewport.height
                },
                format: "r32uint",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            }, "object-index"), this.createTexture({
                size: {
                    width: this.viewport.width,
                    height: this.viewport.height
                },
                format: "rgba8unorm",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
            }, "normal"), this.updateCameraData(this.viewport), this.passes.forEach((pass => {
                pass.render(this.viewport);
            }));
            this.viewport.drawTexture(this.getTexture("color"), "rgba8unorm", "\n        let coords : vec2<i32> = vec2<i32>(i32(input.uv.x * f32(res.x)),i32(input.uv.y * f32(res.y)));\n        let color = textureLoad(texture,coords);\n        return color;\n        ");
        }
    }
    function vec2_create() {
        var out = new ARRAY_TYPE(2);
        return ARRAY_TYPE != Float32Array && (out[0] = 0, out[1] = 0), out;
    }
    function vec2_fromValues(x, y) {
        var out = new ARRAY_TYPE(2);
        return out[0] = x, out[1] = y, out;
    }
    function vec2_add(out, a, b) {
        return out[0] = a[0] + b[0], out[1] = a[1] + b[1], out;
    }
    var vec2_sub = function vec2_subtract(out, a, b) {
        return out[0] = a[0] - b[0], out[1] = a[1] - b[1], out;
    }, vec2_dist = function vec2_distance(a, b) {
        var x = b[0] - a[0], y = b[1] - a[1];
        return Math.hypot(x, y);
    };
    !function() {
        var vec = vec2_create();
    }();
    class State {}
    class ObjectMove extends State {
        cursorMovement;
        viewport;
        refEntity;
        depth;
        startPos;
        currentPos;
        name="object-move";
        constructor(viewport) {
            super(), this.refEntity = Array.from(App.getInstance().currentScene.selections)[0], 
            this.viewport = viewport, this.cursorMovement = vec2_create(), this.depth = this.viewport.camera.getNdcCoords(this.refEntity.getPosition())[2];
            const worldCursor = this.cursorToWorldSpace();
            this.startPos = [ worldCursor[0], worldCursor[1], worldCursor[2] ], this.currentPos = clone(this.startPos), 
            this.viewport.canvas.requestPointerLock();
        }
        abort() {
            const diff = sub(create(), this.startPos, this.currentPos);
            App.getInstance().currentScene.selections.forEach((entity => {
                add(entity.getPosition(), entity.getPosition(), diff);
            })), requestAnimationFrame(this.viewport.render), document.exitPointerLock();
        }
        finalize() {
            document.exitPointerLock();
        }
        handlePointerMove(event) {
            vec2_add(this.cursorMovement, this.cursorMovement, vec2_fromValues(event.movementX, event.movementY));
            const scene = App.getInstance().currentScene, oldDiff = sub(create(), this.currentPos, this.startPos), cursorWorld = this.cursorToWorldSpace();
            this.currentPos = [ cursorWorld[0], cursorWorld[1], cursorWorld[2] ];
            const newDiff = sub(create(), this.currentPos, this.startPos);
            sub(newDiff, newDiff, oldDiff), scene.selections.forEach((entity => {
                add(entity.getPosition(), entity.getPosition(), newDiff);
            })), requestAnimationFrame(this.viewport.render);
        }
        cursorToWorldSpace() {
            const cursorNdc = [ this.cursorMovement[0] / this.viewport.canvas.width * 2 - 1, -this.cursorMovement[1] / this.viewport.canvas.height * 2 + 1, this.depth, 1 ];
            return this.viewport.camera.getWorldCoordsFromNdc(cursorNdc);
        }
    }
    class ObjectRotate extends State {
        name="object-rotate";
        axis;
        angle=0;
        angleInit;
        viewport;
        cursorPos;
        centroidNdc;
        constructor(viewport, cursorPos) {
            super(), this.viewport = viewport, this.axis = this.viewport.camera.getForward(), 
            this.angle = 0;
            const ndc = this.viewport.camera.getNdcCoords(this.getAverage());
            this.centroidNdc = [ ndc[0], ndc[1] ], this.cursorPos = cursorPos;
            const centerToCursor = vec2_sub(vec2_create(), this.toCursorCoords(this.centroidNdc), this.cursorPos);
            this.angleInit = Math.atan2(centerToCursor[1], centerToCursor[0]);
        }
        abort() {
            const scene = this.viewport.scene, invRotation = quat_create();
            setAxisAngle(invRotation, this.axis, -this.angle), scene.selections.forEach((entity => {
                quat_mul(entity.getRotation(), invRotation, entity.getRotation()), quat_normalize(entity.getRotation(), entity.getRotation());
            })), requestAnimationFrame(this.viewport.render), document.exitPointerLock();
        }
        finalize() {
            document.exitPointerLock();
        }
        handlePointerMove(event) {
            vec2_add(this.cursorPos, this.cursorPos, vec2_fromValues(event.movementX, event.movementY));
            const centerToCursor = vec2_sub(vec2_create(), this.toCursorCoords(this.centroidNdc), this.cursorPos), newAngle = Math.atan2(centerToCursor[1], centerToCursor[0]) - this.angleInit, diff = newAngle - this.angle;
            this.angle = newAngle;
            const scene = this.viewport.scene, rotation = quat_create();
            setAxisAngle(rotation, this.axis, diff), scene.selections.forEach((entity => {
                quat_mul(entity.getRotation(), rotation, entity.getRotation()), quat_normalize(entity.getRotation(), entity.getRotation());
            })), requestAnimationFrame(this.viewport.render);
        }
        getAverage() {
            const sum = create();
            return this.viewport.scene.selections.forEach((entity => {
                add(sum, sum, entity.getPosition());
            })), vec3_scale(sum, sum, 1 / this.viewport.scene.selections.size), sum;
        }
        toCursorCoords(ndc) {
            return [ (ndc[0] + 1) / 2 * this.viewport.canvas.width, (ndc[0] - 1) / -2 * this.viewport.canvas.height ];
        }
    }
    class ObjectScale extends State {
        name="object-scale";
        viewport;
        cursorPosition;
        scale=1;
        oneUnitLength;
        centroidNdc;
        constructor(viewport, cursorPos) {
            super(), this.viewport = viewport, this.cursorPosition = function vec2_clone(a) {
                var out = new ARRAY_TYPE(2);
                return out[0] = a[0], out[1] = a[1], out;
            }(cursorPos);
            const averageNdc = this.viewport.camera.getNdcCoords(this.getAverage());
            this.centroidNdc = [ averageNdc[0], averageNdc[1] ], this.oneUnitLength = vec2_dist(this.cursorPosition, this.toCursorCoords(this.centroidNdc)), 
            this.viewport.canvas.requestPointerLock();
        }
        abort() {
            this.viewport.scene.selections.forEach((entity => {
                vec3_scale(entity.getScale(), entity.getScale(), 1 / this.scale);
            })), document.exitPointerLock(), requestAnimationFrame(this.viewport.render);
        }
        finalize() {
            document.exitPointerLock();
        }
        handlePointerMove(event) {
            vec2_add(this.cursorPosition, this.cursorPosition, vec2_fromValues(event.movementX, event.movementY));
            const scale = vec2_dist(this.cursorPosition, this.toCursorCoords(this.centroidNdc)) / this.oneUnitLength, factor = scale / this.scale;
            this.scale = scale;
            this.viewport.scene.selections.forEach((entity => {
                vec3_scale(entity.getScale(), entity.getScale(), factor);
            })), requestAnimationFrame(this.viewport.render);
        }
        getAverage() {
            const sum = create();
            return this.viewport.scene.selections.forEach((entity => {
                add(sum, sum, entity.getPosition());
            })), vec3_scale(sum, sum, 1 / this.viewport.scene.selections.size), sum;
        }
        toCursorCoords(ndc) {
            return [ (ndc[0] + 1) / 2 * this.viewport.canvas.width, (ndc[0] - 1) / -2 * this.viewport.canvas.height ];
        }
    }
    class KeyListener {
        constructor() {
            this.keyboardButtonsPressed = new Set, document.addEventListener("keydown", this.keyPressed), 
            document.addEventListener("keyup", this.keyReleased), document.addEventListener("visibilitychange", this.visibility);
        }
        static instance;
        keyboardButtonsPressed;
        static getInstance() {
            return KeyListener.instance || (KeyListener.instance = new KeyListener), KeyListener.instance;
        }
        keyPressed=event => {
            this.keyboardButtonsPressed.add(event.code);
        };
        keyReleased=event => {
            this.keyboardButtonsPressed.delete(event.code);
        };
        visibility=event => {
            this.keyboardButtonsPressed.clear();
        };
        static combinationPressed(...keys) {
            const instance = KeyListener.getInstance();
            return keys.reduce(((acc, curr) => acc && instance.keyboardButtonsPressed.has(curr)), !0);
        }
    }
    class CameraPan extends State {
        name="camera-pan";
        viewport;
        orbitCenter;
        cameraPos;
        sensitivity=.001;
        constructor(viewport, orbitCenter, cameraPos) {
            super(), this.viewport = viewport, this.orbitCenter = orbitCenter, this.cameraPos = cameraPos, 
            this.viewport.canvas.requestPointerLock();
        }
        abort() {
            document.exitPointerLock();
        }
        finalize() {
            document.exitPointerLock();
        }
        handlePointerMove(event) {
            const camera = this.viewport.camera, up = camera.getUp(), right = camera.getRight();
            vec3_scale(up, up, event.movementY * this.cameraPos.r), vec3_scale(right, right, event.movementX * this.cameraPos.r);
            const uv = add(create(), up, right);
            vec3_scale(uv, uv, -this.sensitivity), add(camera.getPosition(), camera.getPosition(), uv), 
            add(this.orbitCenter, this.orbitCenter, uv), requestAnimationFrame(this.viewport.render);
        }
    }
    class CameraOrbit extends State {
        name="camera-orbit";
        viewport;
        orbitCenter;
        cameraPos;
        sensitivity=.001 * Math.PI * 2;
        horizontalRotationSign;
        constructor(viewport, orbitCenter, cameraPos) {
            super(), this.viewport = viewport, this.orbitCenter = orbitCenter, this.cameraPos = cameraPos, 
            this.horizontalRotationSign = vec3_dot([ 0, 0, 1 ], this.viewport.camera.getUp()) > 0 ? 1 : -1, 
            this.viewport.canvas.requestPointerLock();
        }
        abort() {
            document.exitPointerLock();
        }
        finalize() {
            document.exitPointerLock();
        }
        handlePointerMove(event) {
            const camera = this.viewport.camera, right = camera.getRight();
            this.cameraPos.theta += event.movementX * this.sensitivity * this.horizontalRotationSign, 
            this.cameraPos.phi += event.movementY * this.sensitivity;
            const pos = Util.sphericalToCartesian(this.cameraPos);
            add(this.viewport.camera.getPosition(), pos, this.orbitCenter);
            const horizontalQuat = setAxisAngle(quat_create(), [ 0, 0, 1 ], event.movementX * this.sensitivity * this.horizontalRotationSign), verticalQuat = setAxisAngle(quat_create(), right, -event.movementY * this.sensitivity), rotation = camera.getRotation();
            quat_mul(rotation, verticalQuat, rotation), quat_mul(rotation, horizontalQuat, rotation), 
            quat_normalize(rotation, rotation), requestAnimationFrame(this.viewport.render);
        }
    }
    class InputStateMachine {
        viewport;
        constructor(viewport) {
            this.viewport = viewport, this.cursorPos = vec2_create(), this.viewport.canvas.addEventListener("pointerenter", (() => {
                this.viewport.canvas.focus();
            })), this.viewport.canvas.addEventListener("keydown", this.keyDown), this.viewport.canvas.addEventListener("keyup", this.keyUp), 
            this.viewport.canvas.addEventListener("wheel", this.cameraZoom), this.viewport.canvas.addEventListener("pointermove", this.pointerMove), 
            this.viewport.canvas.addEventListener("pointerdown", this.pointerDown), this.viewport.canvas.addEventListener("pointerup", this.pointerUp), 
            document.addEventListener("pointerlockchange", (event => {
                if (!document.pointerLockElement) {
                    const state = this.stateStack.pop();
                    state?.abort();
                }
            })), this.cameraCentroid = create(), this.cameraPosition = Util.cartesianToSpherical(this.viewport.camera.getForward()), 
            this.cameraPosition.phi -= Math.PI / 2;
        }
        cursorPos;
        cameraCentroid;
        cameraPosition;
        stateStack=[];
        keyDown=event => {
            event.preventDefault();
            const state = this.stateStack.pop();
            if (state) {
                if (this.stateStack.push(state), "Escape" === event.code) state.abort(), this.stateStack.pop();
            } else if (0 !== this.viewport.scene.selections.size) switch (event.code) {
              case "KeyG":
                this.stateStack.push(new ObjectMove(this.viewport));
                break;

              case "KeyR":
                this.stateStack.push(new ObjectRotate(this.viewport, this.cursorPos));
                break;

              case "KeyS":
                this.stateStack.push(new ObjectScale(this.viewport, this.cursorPos));
            }
        };
        keyUp=event => {};
        pointerDown=event => {
            const state = this.stateStack.pop();
            if (state) switch (this.stateStack.push(state), state.name) {
              case "object-move":
              case "object-scale":
              case "object-rotate":
                0 === event.button && (state.finalize(), this.stateStack.pop());
            } else KeyListener.combinationPressed("AltLeft") && 0 === event.button || 1 === event.button ? KeyListener.combinationPressed("ShiftLeft") ? this.stateStack.push(new CameraPan(this.viewport, this.cameraCentroid, this.cameraPosition)) : this.stateStack.push(new CameraOrbit(this.viewport, this.cameraCentroid, this.cameraPosition)) : 0 === event.button && this.select(event);
        };
        pointerMove=event => {
            event.preventDefault();
            const rect = this.viewport.canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
            !function vec2_set(out, x, y) {
                return out[0] = x, out[1] = y, out;
            }(this.cursorPos, x, y);
            const state = this.stateStack.pop();
            state && (this.stateStack.push(state), state.handlePointerMove(event));
        };
        pointerUp=event => {
            const state = this.stateStack.pop();
            if (state) switch (this.stateStack.push(state), state.name) {
              case "camera-orbit":
              case "camera-pan":
                state.finalize(), this.stateStack.pop();
            }
        };
        cameraZoom=event => {
            this.cameraPosition.r += Math.max(Math.log(this.cameraPosition.r), .1) * event.deltaY * .001 * (KeyListener.combinationPressed("ShiftLeft") ? .1 : 1);
            const camera = this.viewport.camera, offset = vec3_scale([ 0, 0, 0 ], camera.getForward(), -this.cameraPosition.r);
            add(camera.getPosition(), this.cameraCentroid, offset), requestAnimationFrame(this.viewport.render);
        };
        select(event) {
            const objectIndexTexture = this.viewport.getRenderer().getTexture("object-index"), device = App.getRenderDevice(), bytesPerRow = 256 * Math.ceil(4 * objectIndexTexture.width / 256), readableBuffer = device.createBuffer({
                size: bytesPerRow * objectIndexTexture.height,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            }), commandEncoder = device.createCommandEncoder();
            commandEncoder.copyTextureToBuffer({
                texture: objectIndexTexture,
                origin: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            }, {
                buffer: readableBuffer,
                bytesPerRow,
                rowsPerImage: objectIndexTexture.height
            }, {
                width: objectIndexTexture.width,
                height: objectIndexTexture.height
            }), device.queue.submit([ commandEncoder.finish() ]), readableBuffer.mapAsync(GPUMapMode.READ).then((() => {
                const data = new Uint32Array(readableBuffer.getMappedRange()), rect = this.viewport.canvas.getBoundingClientRect(), x = Math.floor(event.clientX - rect.left), index = Math.floor(event.clientY - rect.top) * (bytesPerRow / 4) + x;
                const objectIndex = data[index], scene = App.getInstance().currentScene;
                if (KeyListener.combinationPressed("ShiftLeft") || (scene.selections.clear(), scene.primarySelection = void 0), 
                0 !== objectIndex) {
                    const entity = Array.from(scene.entities)[objectIndex - 1][1];
                    scene.primarySelection = entity, scene.selections.add(entity);
                }
                readableBuffer.destroy(), requestAnimationFrame(this.viewport.render);
            }));
        }
    }
    class Viewport {
        webgpu;
        canvas;
        canvasFormat;
        context;
        scene;
        camera;
        renderResults;
        renderer;
        width;
        height;
        navigator;
        constructor(webgpu, canvas, scene) {
            this.webgpu = webgpu, this.canvas = canvas, this.scene = scene, this.scene.viewports.add(this), 
            this.canvasFormat = "rgba8unorm", this.context = canvas.getContext("webgpu"), this.context.configure({
                device: this.webgpu.getDevice(),
                format: this.canvasFormat,
                alphaMode: "premultiplied"
            }), this.width = canvas.width, this.height = canvas.height;
            const aspect = this.width / this.height;
            this.camera = new Camera, this.camera.setPerspectiveProjection(Util.degreeToRadians(90), aspect, .1, 100), 
            this.camera.setPosition(0, 0, 0), this.navigator = new InputStateMachine(this), 
            this.renderer = new BasicRenderer(this), this.renderer.render();
        }
        getRenderer() {
            return this.renderer;
        }
        resize(width, height) {
            if (width != this.width || height != this.height) {
                this.canvas.width = width, this.canvas.height = height, this.width = width, this.height = height;
                const aspect = width / height;
                this.camera.setPerspectiveProjection(Math.PI / 2, aspect, .1, 100), this.renderer.render();
            }
        }
        createTextureConversionShader(fragment, texelFormat) {
            const frag = `\n\n            ${fullQuadShader}\n\n            @binding(0) @group(0) var<uniform> res : vec2<u32>;\n            @binding(1) @group(0) var texture : texture_storage_2d<${texelFormat},read>;\n\n\n            @fragment\n            fn fragment_main (input : VertexOutput) -> @location(0) vec4<f32> {\n                ${fragment}\n            }\n        `;
            return App.getRenderDevice().createShaderModule({
                code: frag
            });
        }
        drawTexture(texture, sampleType, fragment) {
            const device = App.getRenderDevice(), shaderModule = this.createTextureConversionShader(fragment, sampleType), bindgroupLayout = device.createBindGroupLayout({
                entries: [ {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    storageTexture: {
                        access: "read-only",
                        format: sampleType
                    }
                } ]
            }), resolutionBuffer = device.createBuffer({
                size: 8,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC
            });
            device.queue.writeBuffer(resolutionBuffer, 0, new Uint32Array([ this.width, this.height ]));
            const bindgroup = device.createBindGroup({
                layout: bindgroupLayout,
                entries: [ {
                    binding: 0,
                    resource: {
                        buffer: resolutionBuffer
                    }
                }, {
                    binding: 1,
                    resource: texture.createView()
                } ]
            }), pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [ bindgroupLayout ]
            }), renderPipeline = device.createRenderPipeline({
                vertex: {
                    module: shaderModule,
                    entryPoint: "fullscreen_vertex_shader"
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: "fragment_main",
                    targets: [ {
                        format: this.canvasFormat
                    } ]
                },
                primitive: {
                    topology: "triangle-list"
                },
                layout: pipelineLayout,
                label: "viewport pipeline"
            }), passDescriptor = {
                colorAttachments: [ {
                    view: this.context.getCurrentTexture().createView(),
                    storeOp: "store",
                    loadOp: "clear"
                } ],
                label: "render texture to viewport"
            };
            App.getInstance().webgpu.attachTimestamps(passDescriptor);
            const commandEncoder = device.createCommandEncoder(), renderPassEncoder = commandEncoder.beginRenderPass(passDescriptor);
            renderPassEncoder.pushDebugGroup("render to canvas"), renderPassEncoder.setPipeline(renderPipeline), 
            renderPassEncoder.setBindGroup(0, bindgroup), renderPassEncoder.draw(6, 1, 0, 0), 
            renderPassEncoder.popDebugGroup(), renderPassEncoder.end(), App.getWebGPU().prepareTimestampsResolution(passDescriptor, commandEncoder), 
            device.queue.submit([ commandEncoder.finish() ]), App.getWebGPU().resolveTimestamp(passDescriptor).then((result => {}));
        }
        render=() => {
            this.renderer.render();
        };
    }
    class ViewportWindow extends ContentWindow {
        constructor() {
            const canvas = document.createElement("canvas"), app = App.getInstance(), viewport = new Viewport(App.getWebGPU(), canvas, app.currentScene);
            super(canvas), this.viewport = viewport, this.canvas = canvas, this.canvas.tabIndex = 0;
            const importButton = document.createElement("button");
            importButton.innerText = "Import .obj", importButton.classList.add("window-header-element"), 
            importButton.addEventListener("click", (async () => {
                const fileHandle = (await window.showOpenFilePicker())[0], file = await fileHandle.getFile(), model = await file.text();
                console.log("parsing starts now"), console.time("import parsing");
                const mesh = TriangleMesh.parseFromObj(model);
                console.timeEnd("import parsing");
                const scene = App.getInstance().currentScene, entity = new MeshInstance(mesh);
                scene.addEntity(entity), requestAnimationFrame(this.viewport.render);
            })), this.headerElement.append(importButton);
            const button = document.createElement("button");
            button.innerText = "Check shader", button.classList.add("window-header-element"), 
            button.addEventListener("click", (async () => {
                const fileHandle = (await window.showOpenFilePicker())[0], file = await fileHandle.getFile(), shader = await file.text(), shaderModule = app.webgpu.getDevice().createShaderModule({
                    code: shader
                });
                0 == (await shaderModule.getCompilationInfo()).messages.length && console.warn(`${file.name} compiled without errors!`);
            })), this.headerElement.append(button), canvas.addEventListener("drop", (ev => {
                ev.preventDefault(), console.log(ev);
            })), canvas.ondragover = ev => {
                ev.preventDefault();
            };
        }
        canvas;
        viewport;
        resize(width, height) {
            this.viewport.resize(width, height - ResizableWindow.MINIMUM_DIMENSIONS);
        }
    }
    class TimelineWindow extends ContentWindow {
        current;
        range;
        constructor() {
            const div = document.createElement("div");
            super(div);
            const timeline = App.getInstance().currentScene.timeline;
            this.current = document.createElement("span"), this.current.innerText = `${timeline.getCurrent()}`, 
            this.current.classList.add("window-header-element"), this.range = document.createElement("input"), 
            this.range.type = "range", this.range.min = `${timeline.getFirst()}`, this.range.max = `${timeline.getLast()}`, 
            this.range.value = `${timeline.getCurrent()}`, this.range.step = "1", this.range.classList.add("timeline"), 
            this.range.addEventListener("input", (event => {
                timeline.setCurrent(parseInt(this.range.value)), this.current.innerText = this.range.value, 
                requestAnimationFrame((() => {
                    App.getInstance().currentScene.viewports.forEach((viewport => {
                        viewport.render();
                    }));
                }));
            })), div.append(this.range), this.headerElement.append(this.current);
        }
        resize(width, height) {}
    }
    class App {
        static instance;
        constructor() {
            this.loadedScenes = new Array, this.currentScene = new Scene;
        }
        static getInstance() {
            return App.instance || (App.instance = new App), App.instance;
        }
        static getRenderDevice() {
            return App.getInstance().webgpu.getDevice();
        }
        static getWebGPU() {
            return App.getInstance().webgpu;
        }
        loadedScenes;
        currentScene;
        webgpu;
        initialize=async () => {
            this.webgpu = await WebGPU.initializeInstance(), this.currentScene = new Scene;
            const root = ResizableWindow.initializeRootWindow("horizontal"), left = (root.addChild(0, "horizontal"), 
            root.addChild(0, "vertical", 1200)), child1 = left.addChild(0, "horizontal"), child2 = left.addChild(0, "horizontal", 700);
            child1.setContent(new TimelineWindow), child2.setContent(new ViewportWindow);
            const model = await (await fetch("https://raw.githubusercontent.com/Irrgh/BlendAIR/main/assets/models/suzanne_smooth.obj")).text(), model1 = await (await fetch("https://raw.githubusercontent.com/Irrgh/BlendAIR/main/assets/models/cube.obj")).text(), model2 = await (await fetch("https://raw.githubusercontent.com/Irrgh/BlendAIR/main/assets/models/donut.obj")).text(), model3 = await (await fetch("https://raw.githubusercontent.com/Irrgh/BlendAIR/main/assets/models/shard.obj")).text(), mesh = TriangleMesh.parseFromObj(model), plane = (TriangleMesh.parseFromObj(model1), 
            TriangleMesh.parseFromObj(model2)), shard = TriangleMesh.parseFromObj(model3), shardPlease = new MeshInstance(shard), shardAnimation = new AnimationSheet([ {
                frame: 0,
                value: [ 0, 0, 0 ]
            }, {
                frame: 250,
                value: [ 0, 0, 3 ]
            } ]);
            shardAnimation.setInterpolation("bezier"), shardPlease.setPositionAsAnimation(shardAnimation), 
            this.currentScene.addEntity(shardPlease);
            for (let i = 0; i < 5; i++) {
                let entity, anim = new AnimationSheet([ {
                    frame: 0,
                    value: random(create(), 10)
                }, {
                    frame: 125,
                    value: random(create(), 10)
                }, {
                    frame: 250,
                    value: random(create(), 10)
                } ]);
                entity = new MeshInstance(mesh), entity.setPositionAsAnimation(anim), entity.setFacing(random([ 0, 0, 0 ])), 
                this.currentScene.addEntity(entity);
            }
            for (let i = 0; i < 5; i++) {
                let entity;
                entity = new MeshInstance(plane), entity.setPosition(10 * Math.random(), 10 * Math.random(), 10 * Math.random()), 
                entity.setFacing(random([ 0, 0, 0 ])), this.currentScene.addEntity(entity);
            }
            this.currentScene.viewports.forEach((viewport => {
                requestAnimationFrame(viewport.render);
            }));
        };
    }
    App.getInstance().initialize();
})();