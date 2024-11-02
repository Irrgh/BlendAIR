import { describe, expect, it } from '@jest/globals';
import { ArrayStorage } from '../../src/util/ArrayStorage';


describe("ArrayStorage class", () => {

    it("correct types", () => {

        const i8 = new ArrayStorage(Int8Array);
        const u8 = new ArrayStorage(Uint8Array);

        const i16 = new ArrayStorage(Int16Array);
        const u16 = new ArrayStorage(Uint16Array);
        
        const i32 = new ArrayStorage(Int32Array);
        const u32 = new ArrayStorage(Uint32Array);
        const f32 = new ArrayStorage(Float32Array);

        const i64 = new ArrayStorage(BigInt64Array);
        const u64 = new ArrayStorage(BigUint64Array);
        const f64 = new ArrayStorage(Float64Array);

        expect(i8.type).toBe(Int8Array.name);
        expect(u8.type).toBe(Uint8Array.name);

        expect(i16.type).toBe(Int16Array.name);
        expect(u16.type).toBe(Uint16Array.name);

        expect(i32.type).toBe(Int32Array.name);
        expect(u32.type).toBe(Uint32Array.name);
        expect(f32.type).toBe(Float32Array.name);

        expect(i64.type).toBe(BigInt64Array.name);
        expect(u64.type).toBe(BigUint64Array.name);
        expect(f64.type).toBe(Float64Array.name);
    });

    it("array growing dynamically", () => {
        const size = 1_000_000;

        const f64 = new ArrayStorage(Float64Array);

        for (let i = 0; i < size; i++) {
            f64.push(Math.random());
        }

        expect(f64.size()).toBe(size);
        expect(f64.getArray().byteLength).toBe(size * Float64Array.BYTES_PER_ELEMENT);
    });







})
