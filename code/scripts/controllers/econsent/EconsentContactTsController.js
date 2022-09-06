const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const BaseRepository = commonServices.BaseRepository;

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
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        await this.getTpContactInfo();
    }

    async getTpContactInfo() {
        let tp;
        const tps = await this.TrialParticipantRepository.filterAsync(`did == ${this.state.tpDid}`, 'ascending', 30)
        if (tps.length > 0) {
            tp = tps[0];
            if (tp.hasOwnProperty('contactData')) {
                this.model.hasContactData = true;
                this.model.contactData = {
                    emailAddress: tp.contactData.emailAddress,
                    phoneNumber: tp.contactData.phoneNumber
                }
            }
        }
    }

}
