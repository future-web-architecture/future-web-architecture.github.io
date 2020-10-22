
const messagePorts = new Set;
const eventTarget = new EventTarget;
const broadcastMessage = (topic, data) => {
    for (const port of messagePorts) {
        try {
            port.postMessage({
                command: 'MESSAGE',
                payload: {
                    topic,
                    data,
                },
            });
        } catch (err) {
            messagePorts.delete(port);
            console.warn('ServiceWorker: port.postMessage() failed');
        }

        eventTarget.dispatchEvent(new CustomEvent('broadcast', {
            detail: {
                topic,
                data,
            },
        }));
    }
};


self.addEventListener('install', ev => {
    console.log('ServiceWorker: install');
});

self.addEventListener('activate', ev => {
    console.log('ServiceWorker: activate');
});

self.addEventListener('message', ev => {
    console.log('ServiceWorker: message');
    const {command, payload} = ev.data;
    switch (command) {
        case 'INITIATE_CHANNEL':
            console.log('ServiceWorker: INITIATE_CHANNEL');
            messagePorts.add(ev.ports[0]);
            break;

        case 'MESSAGE':
            console.log('ServiceWorker: MESSAGE');
            {
                const {topic, data} = payload;
                broadcastMessage(topic, data);
            }
            break;

        default:
            console.warn('ServiceWorker: Unknown command received');
    }
});
