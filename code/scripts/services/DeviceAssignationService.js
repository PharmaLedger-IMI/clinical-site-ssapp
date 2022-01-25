const commonServices = require("common-services");
const DSUService = commonServices.DSUService;

export default class DeviceAssignationService extends DSUService {

    constructor() {
        super('/assigned-devices');
    }

    mount = (keySSI, callback) => this.mountEntity(keySSI, callback);

    getAssignedDevices = (callback) => this.getEntities(callback);

    assignDevice = (data, callback) => this.saveEntity(data, callback);

}
