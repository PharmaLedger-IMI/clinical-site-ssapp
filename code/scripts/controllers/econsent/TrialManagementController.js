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

        this.model.trials.forEach((trial)=>{
            const site = sites.find(site=>this.HCOService.getAnchorId(site.trialSReadSSI) === trial.uid)
            if(!site){
                throw new Error("Site not found");
            }
            trial.siteStatus = site.status.status;
            trial.siteStage = site.status.stage;
            if(trial.siteStage === 'Created') {
                trial.showViewButton = false;
            } else trial.showViewButton = true;
            trial.siteId = site.id;
        })


        this.model.hasTrials = this.model.trials.length !== 0;
        this.model.trialsDataSource = DataSourceFactory.createDataSource(8, 10, this.model.trials);
        return this.model.trialsDataSource;
    }

    _initHandlers() {
        this._attachHandlerTrialConsents();
        this._attachHandlerViewDataAnalysis();
        this._attachHandlerTrialQuestionnaire();
        this._attachHandlerTrialParticipants();
        this._attachHandlerTrialVisits();
        this._attachHandlerBack();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    _attachHandlerTrialConsents() {
        this.onTagEvent('trials:consents', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-consents',
                {
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
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('questions-list', state);
        });
    }

    _attachHandlerBack() {
        this.onTagEvent('back', 'click', () => {
            this.navigateToPageTag('home');
        });
    }

    _attachHandlerTrialVisits(){
        this.onTagEvent('trials:visits', 'click', (model) => {
            let state = {
                breadcrumb: this.model.toObject('breadcrumb'),
                trialUid:model.uid
            }
            this.navigateToPageTag('trial-visits', state);
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
