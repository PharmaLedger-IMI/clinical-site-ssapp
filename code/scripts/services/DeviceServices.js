const commonServices = require('common-services');
const DSUService = commonServices.DSUService;

export default class DeviceServices extends DSUService {

    constructor() {
        super('/device');
    }

    searchDevice(callback) {
        this.getEntities((err, devices) => {
            if (err) {
                return callback(err)
            }
            callback(err, devices)
        })
    }  

    saveDevice(device, callback) {
        this.saveEntity(device, callback);
    }

    updateDevice(device, callback) {
        this.updateEntity(device, callback);
    }

    deleteDevice(uid, callback) {
        this.unmountEntity(uid, callback);
    }
}