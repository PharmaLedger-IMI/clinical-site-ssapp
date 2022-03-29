import HCOService from '../../services/HCOService.js';
const {WebcController} = WebCardinal.controllers;
const { DataSource } = WebCardinal.dataSources;

class StudiesDataSource extends DataSource {
    constructor(...props) {
        super(...props);
        this.model.trials = props[0];
        this.model.elements = 10;
        this.setPageSize(this.model.elements);
        this.model.noOfColumns = 4;
    }

    updateData(updatedStudy) {
        let toBeUpdatedIndex = this.model.trials.findIndex(study => updatedStudy.uid === study.uid);
        this.model.studies[toBeUpdatedIndex] = updatedStudy;
        this.forceUpdate(true);
    }

    async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
        console.log({startOffset, dataLengthForCurrentPage});
        if (this.model.trials.length <= dataLengthForCurrentPage ){
            this.setPageSize(this.model.trials.length);
        }
        else{
            this.setPageSize(this.model.elements);
        }
        let slicedData = [];
        this.setRecordsNumber(this.model.trials.length);
        if (dataLengthForCurrentPage > 0) {
            slicedData = Object.entries(this.model.trials).slice(startOffset, startOffset + dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        } else {
            slicedData = Object.entries(this.model.trials).slice(0, startOffset - dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        }
        return slicedData;
    }
}

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

    _attachHandlerTrialQuestionnaire() {
        this.onTagEvent('trials:questionnaire', 'click', (model, target, event) => {
            console.log("questionnaire")
            let state = {
                trialSSI: model.keySSI,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('questions-list', state);
        });
    }

}
