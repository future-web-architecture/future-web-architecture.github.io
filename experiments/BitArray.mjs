/**
 * Class representing a bit array.
 */
const BitArray = class BitArray {
    /**
     * Create a bit array.
     * @param {ArrayBuffer|number} bufferOrBitLength ArrayBuffer to use or
     * the array length in bits.
     */
    constructor(bufferOrBitLength)
    {
        let buffer;
        let bitLength;

        if (bufferOrBitLength instanceof ArrayBuffer) {
            buffer = bufferOrBitLength;
            bitLength = buffer.byteLength << 3;
        } else {
            bitLength = Math.max(0, 0 | bufferOrBitLength);
            buffer = new ArrayBuffer(Math.ceil(bitLength / 8));
        }
        
        /** @member {Uint8Array} view */
        Reflect.defineProperty(this, 'view', {
            value: new Uint8Array(buffer),
            configurable: false,
            writable: false,
            enumerable: false,
        });

        /** @member {number} bitLength */
        Reflect.defineProperty(this, 'bitLength', {
            value: bitLength,
            configurable: false,
            writable: false,
            enumerable: false,
        });
    }

    getInteger(offset, length)
    {
        offset = Math.max(0, 0 | offset);
        length = Math.max(0, 0 | length);
        if (!length) return 0;

        const end = offset + length - 1;
        const startByte = offset >> 3;
        const startOffset = offset & 7;
        const endByte = end >> 3;
        const endOffset = end & 7;
        const startMask = [255, 127, 63, 31, 15, 7, 3, 1];
        
        let n = 0;
        for (let i = startByte, shift = length - 8 + startOffset; i <= endByte; i++, shift -= 8) {
            let byte = i == startByte ? startMask[startOffset] & this.view[i] : this.view[i];
            n ^= shift < 0 ? byte >> -shift : byte << shift;
        }
        return n;
    }
};

export {
    BitArray,
};
