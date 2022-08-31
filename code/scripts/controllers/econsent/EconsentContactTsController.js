import HCOService from "../../services/HCOService.js";
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class EconsentContactTsController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.state = this.getState();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Contact TS/",
                tag: "econsent-contact-ts"
            }
        );

        this.model.contactData = {
            emailAddress: '',
            phoneNumber: ''
        }

        this.initServices();
    }

    async initServices() {
        this.HCOService = new HCOService();
        await this.getTpContactInfo();
    }

    async getTpContactInfo() {
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        let tp = this.model.hcoDSU.volatile.tps.find(tp => tp.did === this.state.tpDid);
        this.model.contactData = {
            emailAddress: tp.contactData.emailAddress,
            phoneNumber: tp.contactData.phoneNumber
        };
    }

}
