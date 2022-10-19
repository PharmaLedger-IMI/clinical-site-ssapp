import HCOService from '../../services/HCOService.js';
const commonServices = require('common-services');
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class TrialManagementController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "E-Consent Trial Management",
                tag: "econsent-trial-management"
            }
        );

        this.model.trialsDataSource = this._initServices();
        this._initHandlers();

    }

    async _initServices() {
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.model.trials = this.model.hcoDSU.volatile.trial !== undefined ? this.model.hcoDSU.volatile.trial : [];

        const sites = this.model.hcoDSU.volatile.site;
        const trials = this.model.trials;

        let site;
        for (let i = 0; i < trials.length; i++) {
            let trial = trials[i];
            site = await this.HCOService.findTrialSite(sites, trial.uid);
            if(!site){
                throw new Error(`Site not found for trial with id ${trial.uid}`);
            }

            trial.siteStatus = site.status.status;
            trial.siteStage = site.status.stage;
            trial.showViewButton = trial.siteStage !== 'Created';
            trial.siteId = site.id;
        }

        this.model.hasTrials = this.model.trials.length !== 0;
        this.model.trialsDataSource = DataSourceFactory.createDataSource(8, 10, this.model.trials);
        return this.model.trialsDataSource;
    }

    _initHandlers() {
        this._attachHandlerTrialConsents();
        this._attachHandlerViewDataAnalysis();
        this._attachHandlerTrialQuestionnaire();
        this._attachHandlerTrialParticipants();
    }

    _attachHandlerTrialConsents() {
        this.onTagEvent('trials:consents', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-consents',
                {
                    trialUid: model.uid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }
            );
        });
    }

    _attachHandlerTrialParticipants() {
        this.onTagEvent('trials:participants', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-participants',
                {
                    trialUid: model.uid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }
            );
        });
    }


    _attachHandlerViewDataAnalysis() {
        this.onTagEvent('view-data-analysis', 'click', (model, target, event) => {
            let state = {
                trialUid: model.uid,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('prom-prem-graphs', state);
        });
    }

    _attachHandlerTrialQuestionnaire() {
        this.onTagEvent('trials:questionnaire', 'click', (model, target, event) => {
            let state = {
                trialSSI: model.uid,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('questions-list', state);
        });
    }

}
