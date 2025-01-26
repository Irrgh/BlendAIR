import { TriangleMesh } from "../engine/TriangleMesh";

const initialLength = 1024; // 2^10
const doublingThreshold = 33554432; // 2^25 (~134 MB for a Float32Array)
const fixedExpansionLength = 33554432; // 2^25 (~134 MB for a Float32Array)


/**
 * Union of all TypedArrays since the actual interface is hidden.
 */
export type TypedArray = 
    | Uint8Array
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | Uint8ClampedArray
    | BigInt64Array
    | BigUint64Array;


/**
 * Automatically growing version of {@link TypedArray}
 */
export class ArrayStorage<T extends TypedArray> {
    private length: number;
    private array: T;
    type: String;
    private BYTES_PER_ELEMENT: number;
    private cons : {new (length: number):T} ;


    constructor (arrayType: {new (length: number):T}, capacity: number = 1)  {
        this.length = 0;
        this.BYTES_PER_ELEMENT = arrayType.prototype.BYTES_PER_ELEMENT;
        this.array = new arrayType(this.BYTES_PER_ELEMENT * capacity);
        this.type = arrayType.name;
        this.cons = arrayType;
    }

    private resize(length: number) {
        const newArray = new this.cons(length);

        if (newArray instanceof BigInt64Array || newArray instanceof BigUint64Array) {
            newArray.set(this.array as ArrayLike<bigint>);
        } else {
            newArray.set(this.array as ArrayLike<number>);
        }
        this.array = newArray;
    }

    public push(...values: (number| bigint)[]):number {
        values.forEach(value => {
            const bufferSize = this.array.length;
            if (this.length === 0) {
                this.resize(initialLength);
            } else if (this.length === bufferSize) {
                if (this.length < doublingThreshold) {
                    this.resize(bufferSize * 2);
                } else {
                    this.resize(bufferSize + fixedExpansionLength);
                }
            }
            this.array[this.length++] = value;
        });
        return this.length;
    }

    public pushArray (array:T) {
        
        const requiredCapacity = this.array.length + array.length;

        let length = this.length;

        while (length < requiredCapacity) {
            if (length === 0){
                length = 1024;
            } else if (length < doublingThreshold) {
                length * 2;
            } else {
                length + fixedExpansionLength;
            }
        }

        this.resize(length);

        if (this.array instanceof BigInt64Array || this.array instanceof BigUint64Array) {
            this.array.set(array as ArrayLike<bigint>,length);
        } else {
            this.array.set(array as ArrayLike<number>,length);
        }
        this.length += array.length
        return this.length
    }

    public reset() {
        this.length = 0;
        this.array = new this.cons(0);
    }




    public get(index: number): number | bigint {
        return this.array[index];
    }

    public set(index: number, value:number | bigint):void {
        this.array[index] = value;
    }

    /** only use for read ops */
    [index: number] : number | bigint

    public size(): number {
        return this.length;
    }

    public getArray(): T {
        return this.array.slice(0,this.length) as T;
    }

    public bytesPerElement(): number {
        return this.BYTES_PER_ELEMENT;
    }


}