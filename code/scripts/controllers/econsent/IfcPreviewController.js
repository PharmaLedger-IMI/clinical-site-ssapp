import TrialService from '../../services/TrialService.js';
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const PDFService = commonServices.PDFService;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DateTimeService = commonServices.DateTimeService;

export default class IfcPreviewController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.state = this.getState();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "IFC Preview",
                tag: "ifc-preview"
            }
        );

        this.initServices();
    }


     initServices() {
        this.TrialService = new TrialService();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.HCOService.getOrCreateAsync().then(async (hcoDsu) => {
            this.model.hcoDSU = hcoDsu;
            await this.initTrialParticipant();
            this.initConsent();
        });
    }

    async initTrialParticipant() {
        const tps = await this.TrialParticipantRepository.filterAsync(`did == ${this.state.tpDid}`, 'ascending', 30)
        if (tps.length > 0) {
            this.trialParticipant = tps[0];
        }
    }

    initConsent() {
        let econsent = this.model.hcoDSU.volatile.ifcs.find(ifc => ifc.uid === this.state.consentUid && ifc.tpUid === this.trialParticipant.pk);
        if (econsent === undefined) {
            return console.log('Error while loading econsent.');
        }
        this.econsent = {
            ...econsent,
            versionDateAsString: DateTimeService.convertStringToLocaleDate(econsent.versions[0].versionDate)
        };
        let currentVersion = '';
        if (this.state.version) {
            currentVersion = econsent.versions.find(eco => eco.version === this.state.version);
        } else {
            currentVersion = econsent.versions[econsent.versions.length - 1];
            this.state.version = currentVersion.version;
        }

        let econsentFilePath = this.getEconsentFilePath(econsent, currentVersion);
        this.displayConsentFile(econsentFilePath, currentVersion.attachment);
    }

    displayConsentFile(consentFilePath, version) {
        this.model.consentPathAndVersion = {
            path: consentFilePath,
            version: version
        };
        this.PDFService = new PDFService(this.DSUStorage);
        this.PDFService.displayPDF(consentFilePath, version);
        this.PDFService.onFileReadComplete();
    }

    getEconsentFilePath(econsent, currentVersion) {
        return this.HCOService.PATH + '/' + this.HCOService.ssi + '/ifcs/' + this.trialParticipant.pk + "/"
            + econsent.uid + '/versions/' + currentVersion.version
    }
}
