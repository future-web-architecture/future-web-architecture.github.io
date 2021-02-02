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

    const _Function = Function;
    // (function(){}).bind(thisArg, ... args)
    // Function.prototype.bind.call(function(){}, thisArg, ... args)
    // Function.prototype.bind.call.bind(Function.prototype.bind.call)(thisArg, ... args)
    const _Bind = Function.prototype.call.bind(Function.prototype.bind);
    const _Call = Function.prototype.call.bind(Function.prototype.call);

    const getCall = aFunction => (
        'function' == typeof aFunction
            ? ((... args) => _Call(aFunction, ... args)) : function () {}
    );

    const SYMBOL_HAS_INSTANCE = Symbol.hasInstance;
    const _TypeError = TypeError;
    const _Proxy = Proxy;
    const create = Object.create;
    const defineProperty = Reflect.defineProperty;
    const _setPrototypeOf = Reflect.setPrototypeOf;
    const _WeakMap = WeakMap;
    const WeakSetAdd = getCall(WeakSet.prototype.add);
    const WeakSetHas = getCall(WeakSet.prototype.has);
    const WeakMapSet = getCall(WeakMap.prototype.set);
    const WeakMapHas = getCall(WeakMap.prototype.has);
    const WeakMapGet = getCall(WeakMap.prototype.get);

    const isConstructor = f => {
        try {
            Reflect.construct(String, [], f);
            return true;
        } catch (e) {
            return false;
        }
    };

    const dictionaries = new WeakSet;

    /**
     * Dictionary class. No enumeration, no 'in' operator, no freeze, etc.
     */
    class Dictionary
    {
        /**
         * Creates a Dictionary.
         */
        constructor()
        {
            // Empty object with no prototype
            const target = create(null);
            const _this = new _Proxy(target, {
                defineProperty: (target, property, descriptor) => {
                    if (!descriptor.configurable) return false;
                    if (!descriptor.writable && undefined !== descriptor.writable) return false;
                    if (descriptor.get || descriptor.set) return false;
                    return defineProperty(target, property, descriptor);
                },
                getOwnPropertyDescriptor: () => void 0,
                getPrototypeOf: () => null,
                has: () => false,
                ownKeys: () => [],
                preventExtensions: () => false,
                setPrototypeOf: () => false,
            });
            WeakSetAdd(dictionaries, _this);
            return _this;
        }

        /**
         * Returns true if the given object is a Dictionary.
         * @param {*} aObj An object to test.
         */
        static [SYMBOL_HAS_INSTANCE](aObj)
        {
            return 'object' == typeof aObj && aObj && WeakSetHas(dictionaries, aObj);
        }
    }

    const stores = new WeakSet;

    /**
     * Function which returns the same Dictionary for the same object.
     */
    class StateStore extends Function
    {
        constructor()
        {
            const statesByOwners = new _WeakMap;
            const _this = function (aObj)
            {
                // Type check
                if ('object' != typeof aObj && 'function' != typeof aObj || null === aObj) {
                    throw new _TypeError('Not an object');
                }

                const obj = aObj;
                if (WeakMapHas(statesByOwners, obj)) {
                    return WeakMapGet(statesByOwners, obj);
                }

                const state = new Dictionary;
                WeakMapSet(statesByOwners, obj, state);
                return state;
            };
            WeakSetAdd(stores, _this);
            return _this;
        }

        /**
         * Returns true if the given function is a StateStore.
         * @param {*} aObj The function to test.
         */
        static [SYMBOL_HAS_INSTANCE](aObj)
        {
            return 'function' == typeof aObj && WeakSetHas(stores, aObj);
        }
    }
    
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


    const SYMBOL_CALL = Symbol('[[Call]]');
    const SYMBOL_CONSTRUCT = Symbol('[[Construct]]');

    const ExtensibleFunction = class ExtensibleFunction extends Function
    {
        static get CALL() {return SYMBOL_CALL}
        static get CONSTRUCT() {return SYMBOL_CONSTRUCT}

        constructor()
        {
            const _this = function (...argumentsList) {
                return 'undefined' == typeof new.target
                    ? _this[SYMBOL_CALL](this, argumentsList)
                    : _this[SYMBOL_CONSTRUCT](argumentsList, new.target);
            };
            Reflect.setPrototypeOf(_this, new.target.prototype);
            return _this;
        }

        [_Call](thisArgument, argumentsList) {}
        [_Construct](argumentsList, newTarget) {
            return Object.create(newTarget.prototype);
        }

        toString()
        {
            return "function anonymous() {\n    [native code]\n}";
        }
    };

    const Synthesizer = class Synthesizer extends ExtensibleFunction
    {
        constructor(isFunction)
        {
            super();
            Reflect.defineProperty(this, 'isFunction', {value: !!isFunction});
            Reflect.defineProperty(this, 'instances', {value: new WeakMap});
        }

        [ExtensibleFunction.CALL]()
        {
            throw new TypeError("Constructor called without 'new'");
        }

        [ExtensibleFunction.CONSTRUCT](argumentsList, newTarget)
        {
            const state = Object.create(null);
            let revoked = false;
            Reflect.defineProperty(state, 'revoked', {get: () => revoked});
            Reflect.defineProperty(state, 'revoke', {value: () => {
                if (revoked) return;
                revoke();
                revoked = true;
            }});
            state.locked = false;

            const target = this.isFunction ? function(){} : Object.create(null);
            const {proxy, revoke} = Proxy.revocable(target, {
                apply: (target, thisArgument, argumentsList) =>
                    this.apply(proxy, thisArgument, argumentsList),

                construct: (target, argumentsList, newTarget) =>
                    this.construct(proxy, argumentsList, newTarget),

                defineProperty: (target, property, descriptor) =>
                {
                    if (!descriptor.configurable) {
                        return false;
                    }
                    if (state.locked) {
                        return false;
                    }
                    if (descriptor.get || descriptor.set) {
                        return !!this.defineProperty(proxy, property, descriptor);
                    } else {
                        return !!this.set(proxy, property, descriptor.value, proxy);
                    }
                },

                deleteProperty: (target, property) =>
                {
                    if (state.locked) {
                        return false;
                    }

                    return !!this.deleteProperty(proxy, property);
                },
                
                get: (target, property, receiver) =>
                    this.get(proxy, property, receiver),

                getOwnPropertyDescriptor: (target, property) =>
                {
                    const descriptor = this.getOwnPropertyDescriptor(proxy, property);
                    if (!descriptor || 'object' != typeof descriptor || !descriptor.configurable) {
                        return void 0;
                    }
                    try {
                        Reflect.defineProperty({}, property, descriptor);
                    } catch (e) {
                        return void 0;
                    }
                    return descriptor;
                },

                getPrototypeOf: (target) =>
                {
                    const prototype = this.getPrototypeOf(proxy);
                    return 'object' == typeof prototype || 'function' == typeof prototype
                        ? prototype
                        : null;
                },

                has: (target, property) => !!this.has(proxy, prototype),

                isExtensible: (target) => true,

                ownKeys: (target) => [... this.ownKeys(proxy)].filter(
                    property => 'string' == typeof property || 'symbol' == typeof property
                ),

                preventExtensions: (target) => false,

                set: (target, property, value, receiver) => {
                    if (state.locked) {
                        return false;
                    }
                    return !!this.set(proxy, property, value, receiver);
                },

                setPrototypeOf: (target, value) =>
                {
                    if (state.locked) {
                        return false;
                    }
                    if (!value || 'object' == typeof value || 'function' == typeof value) {
                        return !!this.setPrototypeOf(proxy, value || null);
                    } else {
                        return false;
                    }
                }
            });

            Reflect.defineProperty(state, 'proxy', {value: proxy});
            
            Reflect.defineProperty(state, 'values', {value: new Map});

            this.instances.set(proxy, state);
            return proxy;
        }

        [Symbol.hasInstance](aObj)
        {
            return this.instances.has(aObj);
        }

        getState(proxy)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            return this.instances.get(proxy);
        }

        lock(proxy)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            state.locked = true;
        }

        unlock(proxy)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            state.locked = false;
        }

        revoke(proxy)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            state.revoke();
        }

        isRevoked(proxy)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            return state.revoked;
        }

        apply(target, thisArgument, argumentsList)
        {
            throw new TypeError('Not callable');
        }

        construct(target, argumentsList, newTarget)
        {
            throw new TypeError('Not a constructor');
        }

        defineProperty(target, property, descriptor)
        {
            return false;
        }

        deleteProperty(target, property)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            state.values.delete(property);
            return true;
        }

        get(target, property, receiver)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            return state.values.get(property);
        }

        getOwnPropertyDescriptor(target, property)
        {
            return void 0;
        }

        getPrototypeOf(target)
        {
            return null;
        }

        has(target, property)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            return state.values.has(property);
        }

        ownKeys(target)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            return [... state.values.keys()];
        }

        set(target, property, value, receiver)
        {
            if (!(proxy instanceof this)) {
                throw new TypeError('Not an instance');
            }

            const state = this.getState(proxy);
            if ('undefined' == typeof value) {
                state.values.delete(property);
            } else {
                state.values.set(property, value);
            }
            return true;
        }

        setPrototypeOf(target, value)
        {
            return false;
        }
    };

    const exportedObjects = {
        Dictionary,
        StateStore,
        getRandomBytes,
        UUID,
    };

    const exportedScopes = new WeakSet;
    let exported = false;
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
            return exported = true;
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
    
    if (!exported) {
        try {
            'object' == typeof console
                && console
                && 'function' == typeof console.log
                && console.log('NOTICE: Could not export objects');
        } catch (e) {
            // revoked proxy or exotic environments still can throw
        }
    }
}
