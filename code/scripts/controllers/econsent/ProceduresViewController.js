import TrialService from "../../services/TrialService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;

const {WebcController} = WebCardinal.controllers;

let getInitModel = () => {
    return {
        procedures: [],
        visit: {}
    };
};

export default class ProceduresViewController extends WebcController {
    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            ...this.history.win.history.state.state,
        });

        this._initServices();
    }

    _initHandlers() {
        this._attachHandlerBack();
        this._attachHandlerDetails();
        this._attachHandlerConfirm();
    }

    async _initServices() {
        this.TrialService = new TrialService();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getInstance(CommunicationService.identities.ECO.HCO_IDENTITY);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this._initHandlers();
        this._initProcedures();
    }

    async _initProcedures() {
        this.model.visit = this.model.hcoDSU.volatile.visit[0].visits.visits.find(v => v.uuid === this.model.visitUuid);
        this.model.tp = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        this.model.procedures = this.model.visit.procedures;
        if (!this.model.tp.visits || this.model.tp.visits.length < 1) {

            this.model.tp.visits = this.model.visits;
            this._updateTrialParticipant();

        } else {

            let visitTp = this.model.tp.visits.filter(v => v.uuid === this.model.visitUuid) [0];
            if (visitTp) {
                this.model.procedures = visitTp.procedures;
            } else {
                this.model.tp.visits.push(this.model.visit);
                this._updateTrialParticipant();
            }
        }

    }


    async _updateTrialParticipant() {
        this.HCOService.updateEntity(this.model.tp, {}, async (err, data) => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        })
    }

    _attachHandlerBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }

    _attachHandlerDetails() {
        this.onTagEvent('viewConsent', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            this.navigateToPageTag('econsent-sign', {
                trialSSI: model.trialSSI,
                econsentSSI: model.consentSSI,
                controlsShouldBeVisible: false
            });
        });
    }


    _updateProcedure(procedure) {

        let objIndex = this.model.procedures.findIndex((obj => obj.id == procedure.id));
        this.model.procedures[objIndex] = procedure;
        let visitTp = this.model.tp.visits.filter(v => v.uuid === this.model.visitUuid) [0];
        visitTp.procedures = this.model.procedures;
        let obj = this.model.tp.visits.findIndex((obj => obj.uuid == visitTp.uuid));
        this.model.tp.visits[obj] = visitTp;
        this._updateTrialParticipant();
    }


    _attachHandlerConfirm() {
        this.onTagEvent('procedure:confirm', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'confirmation-alert',
                (event) => {
                    const response = event.detail;
                    if (response) {
                        model.status = 'Confirmed';
                        this._updateProcedure(model);
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/ConfirmationAlertController',
                    disableExpanding: false,
                    disableBackdropClosing: false,
                    question: 'Are you sure that this procedure is completed for patient ? ',
                    title: 'Complete procedure',
                });
        });
    }

}