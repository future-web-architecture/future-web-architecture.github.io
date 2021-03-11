
{
    // BEGIN PRELUDE
    const prelude = globalThis.prelude = Object.create(null);
    Reflect.defineProperty(globalThis, 'prelude', {value: prelude});
    // END PRELUDE

    prelude.TypedArray = Reflect.getPrototypeOf(Uint8Array);

    prelude.getRandomArrayBuffer = (byteLength) => (new Uint8Array(function * () {
        for (let i = 0; i < (0 | byteLength); i++) {
            yield (Math.random() * 0x100) & 0xff;
        }
    }())).buffer;

    prelude.arrayBufferToHex = (arrayBuffer) => Array.prototype.map.call(
        new Uint8Array(arrayBuffer)
        ,byte => (0x100 & byte).toString(0x10).slice(-2)
    ).join('');

    /**
     * Returns true if and only if the given value has the [[Construct]] internal slot.
     * @param {*} f The value to test.
     */
    prelude.isConstructor = f => {
        try {
            Reflect.construct(String, [], f);
            return true;
        } catch (e) {
            return false;
        }
    };

    prelude.isNull = a => (a === null);

    prelude.isObject = a => ('function' == typeof a || 'object' == typeof a && a);

    prelude.isPropertyKey = a => ('string' == typeof a || 'symbol' == typeof a);

    /**
     * Returns true if and only if the given value is a revoked Proxy.
     * @param {*} a The value to test.
     */
    prelude.isRevokedProxy = a => {
        try {
            new Proxy(a, {});
            return false;
        } catch (e) {
            return ('function' == typeof a || 'object' == typeof a && a);
        }
    };


}
