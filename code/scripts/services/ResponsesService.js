const commonServices = require("common-services");
const DSUService = commonServices.DSUService;

export default class ResponsesService extends DSUService {

    constructor(DSUStorage) {
        super(DSUStorage, '/responses');
    }

    mount = (keySSI, callback) => this.mountEntity(keySSI, callback);

    saveResponse = (response, callback) => this.saveEntity(response, callback);

    getResponses = (callback) => this.getEntities(callback);
}