
import '/lib/uuid.js';
import '/lib/states.js';

const GLOBAL_NAME = 'menhera';
const PLATFORM_UUID = '9001f27a-ff53-4ef9-989f-27446b545b06';
const STORAGE_PREFIX = 'menhera.';
const listenerMap = new WeakMap;

const getBroadcastId = topic => STORAGE_PREFIX + 'broadcast.' + topic;
const getState = new StateStore;

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
        
        /** @member {Window} window */
        Reflect.defineProperty(this, 'window', {value: myWindow});

        /**
         * @member {string} PLATFORM_UUID
         * @const
         */
        Reflect.defineProperty(this, 'PLATFORM_UUID', {value: PLATFORM_UUID});

        /** @member {function} Menhera */
        Reflect.defineProperty(this, 'Menhera', {value: Menhera});

        /** @member {string} windowId */
        Reflect.defineProperty(this, 'windowId', {value: UUID()});

        /** @member {number} windowCreatedTime */
        Reflect.defineProperty(this, 'windowCreatedTime', {value: +new Date});

        Reflect.defineProperty(this.window, GLOBAL_NAME, {value: this});

        const state = getState(this);
        state.broadcastListenerMap = new WeakMap;

        let sessionId;
        try {
            const SESSION_KEY = STORAGE_PREFIX + '.session.id';
            sessionId = this.window.sessionStorage.getItem(SESSION_KEY) || UUID();
            this.window.sessionStorage.setItem(SESSION_KEY, sessionId);
        } catch (error) {
            sessionId = UUID();
        }
        Reflect.defineProperty(this, 'sessionId', {value: sessionId});

        let deviceId;
        try {
            const DEVICE_KEY = STORAGE_PREFIX + 'device.id';
            deviceId = this.window.localStorage.getItem(DEVICE_KEY) || UUID();
            this.window.localStorage.setItem(DEVICE_KEY, deviceId);
        } catch (error) {
            deviceId = UUID();
        }
        Reflect.defineProperty(this, 'deviceId', {value: deviceId});

        const sendPing = () => this.broadcastMessage('menhera.ping', null);
        this.window.setInterval(sendPing, 1000);
        sendPing();

        state.seenWindows = new Map;
        state.lastPing = 0;
        this.addBroadcastListener('menhera.ping', ({windowId}) => {
            if (this.windowId == windowId) return;
            const time = this.getTime();
            state.seenWindows.set(windowId, time);
            if (1000 > time - state.lastPing) return;
            state.lastPing = time;
            for (const [id, timestamp] of state.seenWindows) {
                if (2000 < time - timestamp) {
                    state.seenWindows.delete(id);
                }
            }
        });

        this.window.addEventListener('unload', ev => {
            this.broadcastMessage('menhera.unload', null);
        });

        this.addBroadcastListener('menhera.unload', ({windowId}) => {
            state.seenWindows.delete(windowId);
        });
    }

    /**
     * @returns {number} Current timestamp in milliseconds.
     */
    getTime()
    {
        return +new Date;
    }

    broadcastMessage(aTopic, aData)
    {
        const topic = String(aTopic);
        const data = aData;
        const key = getBroadcastId(topic);
        const value = JSON.stringify({
            topic,
            time: this.getTime(),
            windowId: this.windowId,
            windowCreatedTime: this.windowCreatedTime,
            data,
        });
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
        const state = getState(this);
        if (!state.broadcastListenerMap.has(listener)) {
            state.broadcastListenerMap.set(listener, Object.create(null));
        }
        const listeners = state.broadcastListenerMap.get(listener);
        const key = getBroadcastId(topic);
        if (listeners[key]) {
            return;
        }
        const eventListener = ev => {
            if (ev.key != key) return;
            Promise.resolve(void 0)
            .then(() => void listener(JSON.parse(ev.newValue)))
            .catch(e => console.error(e));
        }
        listeners[key] = eventListener;
        this.window.addEventListener('storage', eventListener);
    }

    removeBroadcastListener(topic, listener)
    {
        const state = getState(this);
        if (!state.broadcastListenerMap.has(listener)) return;
        const key = getBroadcastId(topic);
        const listeners = state.broadcastListenerMap.get(listener);
        if (!listeners[key]) return;
        this.window.removeEventListener('storage', listeners[key]);
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

const menhera = new Menhera(window);
