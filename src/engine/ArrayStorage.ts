const initialLength = 1024; // 2^10
const doublingThreshold = 33554432; // 2^25 (~134 MB for a Float32Array)
const fixedExpansionLength = 33554432; // 2^25 (~134 MB for a Float32Array)




export class Float32ArrayStorage {
    private length: number;
    private array: Float32Array;


    constructor() {
        this.length = 0;
        this.array = new Float32Array();
    }

    private resize(length: number) {
        const newArray = new Float32Array(length);
        newArray.set(this.array);
        this.array = newArray;
    }

    public push(...values: number[]) {
        values.forEach(value => {
            const length = this.length;
            const typedArrayLength = this.array.length;
            if (length === 0) {
                this.resize(initialLength);
            } else if (length === typedArrayLength) {
                if (length < doublingThreshold) {
                    this.resize(typedArrayLength * 2);
                } else {
                    this.resize(typedArrayLength + fixedExpansionLength);
                }
            }
            this.array[this.length++] = value;
        });
    }

    public get(index: number) {
        return this.array[index];
    }

    public size(): number {
        return this.length;
    }

    public getArray(): Float32Array {
        return this.array.slice(0,this.length);
    }


}

export class Uint32ArrayStorage {
    private length: number;
    private array: Uint32Array;


    constructor() {
        this.length = 0;
        this.array = new Uint32Array();
    }

    private resize(length: number) {
        const newArray = new Uint32Array(length);
        newArray.set(this.array);
        this.array = newArray;
    }

    public push(...values: number[]) {
        values.forEach(value => {
            const length = this.length;
            const typedArrayLength = this.array.length;
            if (length === 0) {
                this.resize(initialLength);
            } else if (length === typedArrayLength) {
                if (length < doublingThreshold) {
                    this.resize(typedArrayLength * 2);
                } else {
                    this.resize(typedArrayLength + fixedExpansionLength);
                }
            }
            this.array[this.length++] = value;
        });
    }

    public get(index: number) {
        return this.array[index];
    }

    public size(): number {
        return this.length;
    }

    public getArray(): Uint32Array {
        return this.array.slice(0,this.length);
    }


}