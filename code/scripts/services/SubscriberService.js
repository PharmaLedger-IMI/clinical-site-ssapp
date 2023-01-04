const commonServices = require('common-services');

class SubscriberService{

    constructor() {
        this.subscribers = {};
    }

    subscribe(channel, callback) {
        if(typeof callback !== 'function') {
            throw new Error(`callback is not a function`);
        }
        if(!this.subscribers[channel]){
            this.subscribers[channel] = [];
        }
        this.subscribers[channel].push(callback);
    }

    unsubscribe(channel, callback) {
        if(!this.subscribers[channel]){
            console.error(`Subscriber type "${channel}" was not found`);
            return;
        }

        const handlerIndex = this.subscribers[channel].findIndex(existingHandler => existingHandler === callback);
        if(handlerIndex === -1){
            console.error(`Provided handler for type "${channel}" was not found`);
            return;
        }
        this.subscribers[channel].splice(handlerIndex,1);
    }

    notifySubscribers(channel, data) {
        if(!this.subscribers[channel]){
            return;
        }
        this.subscribers[channel].forEach(handler=>{
            handler(undefined, data);
        })
    }
}

let instance = null;

export const getSubscriberService = ()=>{
    if (!instance) {
        instance = new SubscriberService()
    }
    return instance
}

export default { getSubscriberService }
