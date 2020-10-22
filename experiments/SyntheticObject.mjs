
/* BEGIN PRIVATE SYMBOLS */

/**
 * @private
 * @returns {object} New empty object with no [[Prototype]].
 */
const _voidObject = () => Object.create(null);

/**
 * @private
 * @returns {() => void} New empty function with no action.
 */
const _voidFunction = () => (function(){}); // removed spaces for the minimal length

/**
 * @private
 * @template T
 * @param {T} constantValue The constant value the function should always return.
 * @returns {() => T} New constant function which returns the value
 * passed at the creation time.
 */
const _constFunction = _ => (
    'undefined' == typeof _
        ? _voidFunction()
        : (function(){return _}) // removed spaces for the minimal length
);

/**
 * @private
 * @returns {() => object} New function which returns a new empty object
 * every time it is called.
 */
const _voidObjectFunction = () => (
    (_ => (function(){return _()}))(_voidObject)
);

/**
 * @private
 * Internal slot of SyntheticObject where the internal state is saved.
 * @type {symbol}
 */
const _INTERNAL_STATE = Symbol('[[SyntheticObjectState]]');
const _createProxy = (isFunction, handler) => {
    const state = _voidObject();
    const target = isFunction ? _voidFunction() : _voidObject();
    const internalHandler = _voidObject();

    if (isFunction) {
        const apply = handler.apply || _voidFunction();
        internalHandler.apply = (target, thisArgument, argumentsList) => {
            // [[Call]]
            return apply(thisArgument, argumentsList);
        };
        
        const construct = handler.construct || _voidObjectFunction();
        internalHandler.construct = (target, argumentsList, newTarget) => {
            // [[Construct]]
            const obj = construct(argumentsList, newTarget);
            if (!obj || 'object' != typeof obj && 'function' != typeof obj) {
                return _voidObject();
            }
            return obj;
        };
    }

    const defineProperty = handler.defineProperty || _constFunction(false);
    internalHandler.defineProperty = (target, property, descriptor) => {
        // [[DefineOwnProperty]]
        if (property == _INTERNAL_STATE) {
            return false;
        }
        if (!descriptor.configurable) {
            return false;
        }
        return !!defineProperty(property, descriptor);
    };

    const deleteProperty = handler.deleteProperty || _constFunction(false);
    internalHandler.deleteProperty = (target, property) => {
        // [[Delete]]
        if (property == _INTERNAL_STATE) {
            return false;
        }
        return !!deleteProperty(property);
    };

    const get = handler.get || _voidFunction();
    internalHandler.get = (target, property, receiver) => {
        // [[Get]]
        if (property == _INTERNAL_STATE) {
            return state;
        }
        return get(property, receiver);
    };

    const getOwnPropertyDescriptor = handler.getOwnPropertyDescriptor || _voidFunction();
    internalHandler.getOwnPropertyDescriptor = (target, property) => {
        // [[GetOwnProperty]]
        if (property == _INTERNAL_STATE) {
            return void 0;
        }

        const descriptor = getOwnPropertyDescriptor(property);
        if (!descriptor || 'object' != typeof descriptor || !descriptor.configurable) {
            return void 0;
        }
        try {
            Reflect.defineProperty({}, property, descriptor);
        } catch (e) {
            return void 0;
        }
        return descriptor;
    };

    const getPrototypeOf = handler.getPrototypeOf || _constFunction(null);
    internalHandler.getPrototypeOf = target => {
        // [[GetPrototypeOf]]
        const prototype = getPrototypeOf();
        return 'object' == typeof prototype ? prototype : null;
    };

    const has = handler.has || _constFunction(false);
    internalHandler.has = (target, property) => {
        // [[HasProperty]]
        if (property == _INTERNAL_STATE) {
            return false;
        }
        return !!has(property);
    };

    // [[IsExtensible]]
    internalHandler.isExtensible = _constFunction(true);
    
    const ownKeys = handler.ownKeys || _constFunction([]);
    internalHandler.ownKeys = target => {
        // [[OwnPropertyKeys]]
        return [... ownKeys()].filter(
            key => ['string', 'symbol'].includes(typeof key) && key != _INTERNAL_STATE
        );
    };

    // [[PreventExtensions]]
    internalHandler.preventExtensions = _constFunction(false);

    const set = handler.set || _constFunction(false);
    internalHandler.set = (target, property, value, receiver) => {
        // [[Set]]
        if (property == _INTERNAL_STATE) {
            return false;
        }
        return !!set(property, value, receiver);
    };

    const setPrototypeOf = handler.setPrototypeOf || _constFunction(false);
    internalHandler.setPrototypeOf = (target, prototype) => {
        // [[SetPrototypeOf]]
        return !!setPrototypeOf(prototype);
    };

    const {proxy, revoke} = Proxy.revocable(target, internalHandler);
    Reflect.defineProperty(state, 'revoke', {value: revoke});
    Reflect.defineProperty(state, 'data', {value: new Map});
    return proxy;
};

const _synthesizedObjects = new WeakSet;
/* END PRIVATE SYMBOLS */

/**
 * Fully synthesizes an object's behavior with Proxy. Each produced object can only
 * be configured with its SyntheticObject object.
 * @param {boolean} [isFunction=false] Whether to create a function object.
 */
const SyntheticObject = class SyntheticObject {
    constructor(isFunction)
    {
        const proxy = _createProxy(isFunction, {

        });
        Reflect.defineProperty(this, 'object', {
            value: proxy,
            configurable: false,
            enumerable: false,
            writable: false,
        });
        _synthesizedObjects.add(proxy);
    }

    setSkelton(skelton)
    {

    }

    freeze()
    {
        //
    }

    unfreeze()
    {
        //
    }

    get isFunction()
    {
        return 'function' == typeof this.object;
    }
    
    get isRevoked()
    {
        return SyntheticObject.isRevoked(this.object);
    }

    static isInstance(object)
    {
        return ['function', 'object'].includes(typeof object)
            && object
            && _synthesizedObjects.has(object);
    }

    static isRevoked(object)
    {
        if (!SyntheticObject.isInstance(object)) {
            throw new TypeError('Not a synthesized object');
        }
        try {
            return 'object' != typeof object[_INTERNAL_STATE];
        } catch (err) {
            return true;
        }
    }
};

const createSyntheticObject = (isFunction) => {
    // 
};
