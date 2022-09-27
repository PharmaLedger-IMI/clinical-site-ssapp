import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const Constants = commonServices.Constants;

export default class TrialConsentsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        this.model = this.getState();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Consents",
                tag: "econsent-trial-consents"
            }
        );

        this.initServices(this.model.trialUid);
        this._attachHandlerPreview();
        this._attachHandlerViewHistory();
        this._attachHandlerTrialVisits();
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
                let consentVersion = consent.versions[consent.versions.length-1];
                consentVersion.consentName = consent.name;
                consentVersion.consentType = consent.type;
                consentVersion.versionDate = (new Date(consentVersion.versionDate)).toLocaleDateString(Constants.DATE_UTILS.DATE_LOCALE);
                consentVersion.consentUid = consent.uid;
                consentVersion.isEmpty = false;
                consentVersion.trialConsentId = consent.trialConsentId

                let emptyObj = {
                    consentName : '',
                    consentType : '',
                    versionDate : '',
                    version: '',
                    isEmpty: true,
                }

                dataSourceVersions.push(consentVersion, emptyObj);
            });
            this.model.dataSourceVersions = DataSourceFactory.createDataSource(5, 10, dataSourceVersions);
            this.model.dataSourceInitialized = true;
        })
    }

    _attachHandlerPreview() {
        this.onTagEvent('preview', 'click', (model) => {
            this.navigateToPageTag('consent-preview', {
                breadcrumb: this.model.toObject('breadcrumb'),
                trialUid: this.model.trialUid,
                versionId: model.version,
                consentUid: model.consentUid
            });
        });
    }

    _attachHandlerViewHistory() {
        this.onTagEvent('view-history', 'click', (model) => {
            this.navigateToPageTag('econsent-trial-consent-history', {
                breadcrumb: this.model.toObject('breadcrumb'),
                trialUid: this.model.trialUid,
                trialConsentId: model.trialConsentId,
            });
        });
    }

    _attachHandlerTrialVisits() {
        this.onTagEvent('visits', 'click', (model) => {
            const consent = this.model.site.consents.find(c => c.uid === model.consentUid);

            this.navigateToPageTag('trial-visits', {
                trialId: this.model.trial.id,
                trialUid: this.model.trialUid,
                consentId: consent.trialConsentId,
                consentVersion: model.trialConsentVersion,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }
}
