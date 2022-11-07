const commonServices = require('common-services');
const DSUService = commonServices.DSUService;

class HelperService  extends DSUService {

    constructor() {
        super();
        this.subscribers = [];
    }

    subscribe(callback) {
        if(typeof callback !== 'function') {
            throw new Error(`callback is not a function`);
        }
        this.subscribers.push(callback);
    }

    unsubscribe() {
        if(this.subscribers.length) {
            this.subscribers = [];
        }
    }

    notifySubscribers() {
        this.subscribers.forEach(trigger => {
            trigger();
        })
    }

};

let instance = null;

export const getHelperService = ()=>{
    if (!instance) {
        instance = new HelperService()
    }
    return instance
}

export default { getHelperService }
