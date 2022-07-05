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
        this._attachHandlerPreview();
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
                    version.consentName = consent.name;
                    version.consentType = consent.type;
                    version.versionDate = new Date(version.versionDate).toLocaleDateString();
                    version.consentUid = consent.uid;
                    version.isEmpty = false;
                    return version;
                });

                let emptyObj = {
                    consentName : '',
                    consentType : '',
                    versionDate : '',
                    version: '',
                    isEmpty: true,
                }

                dataSourceVersions.push(...consentVersion, emptyObj);
            });
            this.model.dataSourceVersions = DataSourceFactory.createDataSource(5, 10, dataSourceVersions);
            this.model.dataSourceInitialized = true;
        })
    }


    _attachHandlerPreview() {
        this.onTagEvent('preview', 'click', (model, target, event) => {
            console.log('What we send ', model);
            this.navigateToPageTag('consent-preview', {
                breadcrumb: this.model.toObject('breadcrumb'),
                trialUid: this.model.trialUid,
                versionId: model.version,
                consentUid: model.consentUid
            });
        });
    }

}
