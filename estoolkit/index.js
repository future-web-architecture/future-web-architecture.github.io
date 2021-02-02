
{
    // BEGIN PRELUDE
    const prelude = globalThis.prelude = Object.create(null);
    // END PRELUDE


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
