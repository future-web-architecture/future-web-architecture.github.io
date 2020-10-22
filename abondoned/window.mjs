
import '/uuid.js';

let activeServiceWorker;
const messageQueue = [];
let messagePort;
const broadcastMessage = async (topic, data) => {
    const message = {
        topic,
        data,
    };
    if (activeServiceWorker) {
        activeServiceWorker.postMessage({
            command: 'MESSAGE',
            payload: message,
        });
    } else {
        await new Promise((res, rej) => {
            messageQueue.push({message, callback: res});
        });
    }
};

if ('serviceWorker' in navigator) {
    (async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            console.log('Window: Service worker registered', reg);

            let sw;
            if (reg.installing) {
                sw = reg.installing;
                console.log('Window: Service worker: installing');
            } else if (reg.waiting) {
                sw = reg.waiting;
                console.log('Window: Service worker: waiting');
            } else if (reg.active) {
                sw = reg.active;
                console.log('Window: Service worker: active');
            } else {
                console.warn('Window: Service worker unavailable');
            }

            if (sw) {
                console.log('Window: Service worker state:', sw.state);
                sw.addEventListener('statechange', ev => {
                    console.log('Window: Service worker state changed:', ev.target.state);
                });
            }
        } catch (err) {
            console.warn('Window: Service worker registration failed', err);
        }
    })();
    
    navigator.serviceWorker.ready.then(reg => {
        console.log('Window: Service worker active');
        activeServiceWorker = reg.active;

        const messageChannel = new MessageChannel;
        messagePort = messageChannel.port1;
        messagePort.addEventListener('message', ev => {
            const {command, payload} = ev.data;
            if ('MESSAGE' == command) {
                const {topic, data} = payload;
                window.dispatchEvent(new CustomEvent('menheraBroadcast', {
                    detail: {
                        topic,
                        data,
                    },
                }));
            }
        });
        messagePort.start();
        activeServiceWorker.postMessage({command: 'INITIATE_CHANNEL'}, [messageChannel.port2]);
        for (const {callback, message} of messageQueue) {
            activeServiceWorker.postMessage({
                command: 'MESSAGE',
                payload: message,
            });
            callback(void 0);
        }
        messageQueue.length = 0; // clear queue
    });
} else {
    console.warn('Window: Service worker not supported');
}
