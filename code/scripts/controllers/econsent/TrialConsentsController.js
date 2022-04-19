import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class TrialConsentsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        this.model = this.getState();
        const {breadcrumb, ...state} = this.model;

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Consents",
                tag: "econsent-trial-consents"
            }
        );

        this.initServices(this.model.trialUid);
        this._attachHandlerGoBack();
    }

    initServices(trialUid) {
        this.HCOService = new HCOService();
        this.HCOService.getOrCreateAsync().then((hcoDSU) => {
            this.model.hcoDSU = hcoDSU;
            this.model.trial = this.model.hcoDSU.volatile.trial.find(trial => trial.uid === trialUid);
            const sites = this.model.toObject("hcoDSU.volatile.site");
            const site = sites.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid)
            this.model.site = site;
            const consents = this.model.site.consents;
            let dataSourceVersions = [];

            consents.forEach((consent) => {
                let consentVersion = consent.versions.map(version => {
                    version.consentName = consent.trialConsentName;
                    version.consentType = consent.type;
                    version.versionDate = new Date(version.versionDate).toLocaleDateString();
                    return version;
                });
                dataSourceVersions.push(...consentVersion);
            });
            this.model.dataSourceVersions = DataSourceFactory.createDataSource(5, 10, dataSourceVersions);
            this.model.dataSourceInitialized = true;
        });
    }

    _attachHandlerGoBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            this.navigateToPageTag('econsent-trial-management', {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

}
