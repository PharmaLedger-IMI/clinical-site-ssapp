const commonServices = require("common-services");
const DSUService = commonServices.DSUService;

export default class SiteService extends DSUService {

    constructor() {
        super('/site');
    }

    getSites = (callback) => this.getEntities(callback);

    getSite = (uid, callback) => this.getEntity(uid, callback);

}
