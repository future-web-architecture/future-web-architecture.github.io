
import '/lib/uuid.js';

const GLOBAL_NAME = 'menhera';
const PLATFORM_UUID = '9001f27a-ff53-4ef9-989f-27446b545b06';
const STORAGE_PREFIX = 'menhera.';
const listenerMap = new WeakMap;

const getBroadcastId = topic => STORAGE_PREFIX + 'broadcast.' + topic;
const states = new WeakMap;

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

        /** @member {number} createdTimestamp */
        Reflect.defineProperty(this, 'createdTimestamp', {value: +new Date});

        Reflect.defineProperty(this.window, GLOBAL_NAME, {value: this});

        const state = Object.create(null);
        states.set(this, state);

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

        const sendPing = () => this.broadcastMessage('menhera.ping', {
            windowId: this.windowId,
            createdTimestamp: this.createdTimestamp,
        });
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
            const time = +new Date;
            this.broadcastMessage('menhera.unload', {
                windowId: this.windowId,
                age: time - this.createdTimestamp,
            });
        });

        this.addBroadcastListener('menhera.unload', ({windowId}) => {
            state.seenWindows.delete(windowId);
        })
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

const menhera = new Menhera(window);
