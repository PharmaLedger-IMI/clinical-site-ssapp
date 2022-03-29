import HCOService from '../../services/HCOService.js';
const { WebcController } = WebCardinal.controllers;

const commonServices = require('common-services');
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class TrialManagementController extends WebcController {
    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        const { breadcrumb, ...state } = prevState;

        this.model = prevState;
        this.model.breadcrumb.push({
            label: "E-Consent Trial Management",
            tag: "econsent-trial-management",
            state: state
        });


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
                keySSI: model.keySSI,
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
}
