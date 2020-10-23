
import '/lib/uuid.js';

const GLOBAL_NAME = 'menhera';
const PLATFORM_UUID = '9001f27a-ff53-4ef9-989f-27446b545b06';
const STORAGE_PREFIX = 'menhera.';
const listenerMap = new WeakMap;

const getBroadcastId = topic => STORAGE_PREFIX + 'broadcast.' + topic;

class Menhera
{
    constructor(ownerWindow)
    {
        const myWindow = ownerWindow instanceof window.constructor
            ? ownerWindow
            : window;
        
        // Since this is singleton per window
        if (myWindow[GLOBAL_NAME] instanceof Menhera) {
            return myWindow[GLOBAL_NAME];
        }
        
        Reflect.defineProperty(this, 'window', {value: myWindow});
        Reflect.defineProperty(this, 'PLATFORM_UUID', {value: PLATFORM_UUID});
        Reflect.defineProperty(this, 'Menhera', {value: Menhera});
        Reflect.defineProperty(this, 'id', {value: UUID()});
        Reflect.defineProperty(this.window, GLOBAL_NAME, {value: this});

        let sessionId;
        try {
            const SESSION_KEY = STORAGE_PREFIX + '.session.id';
            sessionId = this.window.sessionStorage.getItem(SESSION_KEY) || UUID();
            this.window.sessionStorage.setItem(SESSION_KEY, sessionId);
        } catch (error) {
            sessionId = UUID();
        }
        Reflect.defineProperty(this, 'sessionId', {value: sessionId});
    }

    broadcastMessage(topic, data)
    {
        const key = getBroadcastId(topic);
        const value = JSON.stringify(data);
        this.window.localStorage.setItem(key, value);

        // StorageEvent does not fire for the current window, so we fire one
        const ev = this.window.document.createEvent('Event');
        ev.initEvent('storage', true, true);
        ev.key = key;
        ev.newValue = value;
        this.window.dispatchEvent(ev);
    }

    addBroadcastListener(topic, listener)
    {
        if ('function' != typeof listener) {
            throw new TypeError('Not a function');
        }
        const key = getBroadcastId(topic);
        const eventListener = ev => {
            if (ev.key != key) return;
            Promise.resolve(void 0).then(() => void listener(JSON.parse(ev.newValue)));
        }
        this.window.addEventListener('storage', eventListener);
        if (!listenerMap.has(listener)) {
            listenerMap.set(listener, Object.create(null));
        }
        listenerMap.get(listener)[key] = eventListener;
    }

    removeBroadcastListener(topic, listener)
    {
        if (!listenerMap.has(listener)) return;
        const key = getBroadcastId(topic);
        this.window.removeEventListener('storage', listenerMap.get(listener)[key]);
    }

    get [Symbol.toStringTag]()
    {
        return 'Menhera';
    }

    [Symbol.toPrimitive](hint)
    {
        if ('number' == hint) {
            return 57;
        }

        return this.id;
    }

    static [Symbol.hasInstance](obj)
    {
        return 'object' == typeof obj && obj.PLATFORM_UUID === PLATFORM_UUID;
    }
}

new Menhera(window);
