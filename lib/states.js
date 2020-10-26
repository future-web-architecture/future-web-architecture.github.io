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
    const getCall = aFunction => (
        'function' == typeof aFunction
            ? aFunction.call.bind(aFunction) : function () {}
    );

    const SYMBOL_HAS_INSTANCE = Symbol.hasInstance;
    const _TypeError = TypeError;
    const _Proxy = Proxy;
    const create = Object.create;
    const defineProperty = Reflect.defineProperty;
    const _WeakMap = WeakMap;
    const WeakSetAdd = getCall(WeakSet.prototype.add);
    const WeakSetHas = getCall(WeakSet.prototype.has);
    const WeakMapSet = getCall(WeakMap.prototype.set);
    const WeakMapHas = getCall(WeakMap.prototype.has);
    const WeakMapGet = getCall(WeakMap.prototype.get);

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
    

    const exportedObjects = {
        Dictionary,
        StateStore,
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
