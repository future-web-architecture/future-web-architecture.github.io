
/**
 * @file
 * Can be imported as an ES module or CommonJS module.
 * 
 * Copyright (C) 2020  Menhera.org developers.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

{
    const TypedArray = Reflect.getPrototypeOf(Uint8Array);
    
    /**
     * Not-for-cryptography random bytes.
     * @param {number|ArrayBuffer|TypedArray} bufferOrByteLength Number of bytes to return,
     * or the buffer to fill with random bytes.
     * @returns {ArrayBuffer} The entire buffer.
     */
    const getRandomBytes = (bufferOrByteLength) => {
        const bytes = (
            bufferOrByteLength instanceof ArrayBuffer
                ? new Uint8Array(bufferOrByteLength)
                : (
                    bufferOrByteLength instanceof TypedArray
                        ? new Uint8Array(bufferOrByteLength.buffer, bufferOrByteLength.byteOffset, bufferOrByteLength.byteLength)
                        : new Uint8Array(0 | bufferOrByteLength)
                )
        );
        const floatBuffer = new ArrayBuffer(8);
        const floatView = new DataView(floatBuffer);
        for (let i = 0; i < bytes.length; i++) {
            floatView.setFloat64(0, Math.random(), false);
            const e = ((floatView.getUint16(0, false) >> 4) & 2047) - 1023;
            bytes[i] = (((floatView.getUint16(1, false) >> 4) & 255 | 256) >> -e) & 255;
        }
        return bytes.buffer;
    };

    /**
     * Generate a version 4 UUID string.
     * @param {boolean} [isUppercase=false] If true, returns UUID in uppercase letters;
     * otherwise, the result is in lowercase.
     * @param {boolean} [secure=false] If true, throws an Error when no secure randomness source
     * is available; otherwise, this function uses Math.random() in that case.
     * @returns {string} Hexadecimal string representation of UUID v4. Always 36 characters.
     * @throws {Error}
     */
    const UUID = (isUppercase, secure) => {
        const bytes = new Uint8Array(16);
        try {
            if ('object' == typeof crypto && 'function' == typeof crypto.getRandomValues) {
                crypto.getRandomValues(bytes);
            } else if ('function' == typeof require) {
                const {randomFillSync} = require('crypto');
                randomFillSync(bytes);
            } else {
                // No Web API nor Node.JS
                throw void 0;
            }
        } catch (err) {
            if (secure) {
                throw new Error('No secure randomness source available');
            }
            
            getRandomBytes(bytes);
        }
        bytes[6] = bytes[6] & 0x0f ^ 0x40;
        bytes[8] = bytes[8] & 0x3f ^ 0x80;
        const hex = Array.prototype.map.call(
            bytes,
            byte => ('0' + byte.toString(0x10)).slice(-2)
        ).join('');
        const uuid = [
            hex.substr(0, 8),
            hex.substr(8, 4),
            hex.substr(12, 4),
            hex.substr(16, 4),
            hex.substr(20, 12),
        ].join('-');
        return isUppercase ? uuid.toUpperCase() : uuid.toLowerCase();
    };

    const exportedObjects = {
        UUID,
        getRandomBytes,
    };

    const exportedScopes = new Set;
    const exportInScope = scope => {
        try {
            // export
            if ('object' != typeof scope || !scope) {
                throw void 0; // not a regular object
            }

            // detect revoked proxy
            Symbol() in scope;

            if (exportedScopes.has(scope)) {
                return true;
            }

            for (const key of Reflect.ownKeys(exportedObjects)) {
                const obj = exportedObjects[key];
                scope[key] = obj;
                if (scope[key] != obj) {
                    throw void 0; // failed to write correctly in scope
                }
            }

            // remember succeeded scopes
            exportedScopes.add(scope);
            return true;
        } catch (e) {
            return false;
        }
    };

    try {
        // try globalThis
        'object' == typeof globalThis && exportInScope(globalThis);

        // try CommonJS module exports
        'object' == typeof exports && exportInScope(exports);

        // try 'self'
        'object' == typeof self && exportInScope(self);

        // try 'window'
        'object' == typeof window && exportInScope(window);

        // try 'global'
        'object' == typeof global && exportInScope(global);

        // try 'this' ('this' is always a valid identifier)
        exportInScope(this);
    } catch (e) {}
    
    if (!exportedScopes.size) {
        try {
            'object' == typeof console
                && console
                && 'function' == typeof console.log
                && console.log('NOTICE: Could not export objects');
        } catch (e) {
            // revoked proxy or exotic environments still can throw
        }
    }
    exportedScopes.clear(); // Not a WeakSet, so...
}
