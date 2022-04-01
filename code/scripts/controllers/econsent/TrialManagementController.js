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

        this.model.trialsDataSource = DataSourceFactory.createDataSource(8, 10, this.model.trials);
        return this.model.trialsDataSource;
    }

    _initHandlers() {
        this._attachHandlerTrialQuestionnaire();
        this._attachHandlerTrialDetails();
        this._attachHandlerTrialParticipants();
        this._attachHandlerBack();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    _attachHandlerTrialDetails() {
        this.onTagEvent('trials:details', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-details',
                {
                    keySSI: model.keySSI,
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

    _attachHandlerBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            this.navigateToPageTag('home');
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
