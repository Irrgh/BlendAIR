const initialLength = 1024; // 2^10
const doublingThreshold = 33554432; // 2^25 (~134 MB for a Float32Array)
const fixedExpansionLength = 33554432; // 2^25 (~134 MB for a Float32Array)


/**
 * Union of all TypedArrays since the actual interface is hidden.
 */
type TypedArray = 
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

    public push(...values: (number|bigint)[]):number {
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