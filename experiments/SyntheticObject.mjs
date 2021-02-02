

const SYMBOL_CALL = Symbol('[[Call]]');
const SYMBOL_CONSTRUCT = Symbol('[[Construct]]');

const ExtensibleFunction = class ExtensibleFunction extends Function
{
    static get CALL() {return SYMBOL_CALL}
    static get CONSTRUCT() {return SYMBOL_CONSTRUCT}

    constructor()
    {
        const _this = function (...argumentsList) {
            if ('undefined' == typeof new.target) {
                if ('function' == typeof _this[SYMBOL_CALL]) {
                    return _this[SYMBOL_CALL](this, argumentsList);
                } else if ('function' == typeof _this[SYMBOL_CONSTRUCT]) {
                    throw new TypeError('Constructor called without \'new\' keyword');
                } else {
                    return void 0;
                }
            } else if ('function' == typeof _this[SYMBOL_CONSTRUCT]) {
                return _this[SYMBOL_CONSTRUCT](argumentsList, new.target);
            } else {
                throw new TypeError('Not a constructor');
            }
        };
        Reflect.setPrototypeOf(_this, new.target.prototype);
        return _this;
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

