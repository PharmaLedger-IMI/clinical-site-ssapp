import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const PDFService = commonServices.PDFService;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class ConsentPreviewController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Consent Preview",
                tag: "consent-preview"
            }
        );

        this.initServices();
    }

    initServices() {
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.HCOService.getOrCreateAsync().then(async (hcoDsu) => {
            this.model.hcoDSU = hcoDsu;
            const site = await this.HCOService.findTrialSite(hcoDsu.volatile.site, this.model.trialUid);
            this.initSiteConsentModel(site);
        });
    }

    initSiteConsentModel(site) {
        let consent = site.consents.find(consent => consent.uid === this.model.consentUid);
        let version = consent.versions.find(version => version.version === this.model.versionId);

        let path = this.getEconsentFilePath(site.uid, consent.uid, version.version);

        this.PDFService = new PDFService(this.DSUStorage);
        this.PDFService.displayPDF(path, version.attachment);
    }

    getEconsentFilePath(siteUid, consentUid, versionId) {
        return this.HCOService.PATH + '/' + this.HCOService.ssi + '/site/'
            + siteUid + '/consent/' + consentUid + '/versions/' + versionId
    }
}
