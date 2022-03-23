import TrialService from "../../services/TrialService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
const {WebcController} = WebCardinal.controllers;

let getInitModel = () => {
    return {
        details: {
            name: "details",
            placeholder: "Details"
        },
        toRemember: {
            name: "toRemember",
            placeholder: "To Remember"
        }
    };
};

export default class VisitEditController extends WebcController {
    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            ...this.history.win.history.state.state,
        });

        const prevState = this.getState();
        this.model = prevState;

        const { breadcrumb,...state } = prevState;

        this.model.breadcrumb.push({
            label: "Visit Edit",
            tag: "econsent-visit-edit",
            state: state
        });

        this._initServices();
    }

    _initHandlers() {
        this._attachHandlerBack();
        this._attachHandlerSaveDetails();
    }

    async _initServices() {
        this.TrialService = new TrialService();
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS, this.DSUStorage);
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS, this.DSUStorage);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this._initHandlers();
        this._initVisit();
    }

    async _initVisit() {
        this.model.visit = this.model.hcoDSU.volatile.visit[0].visits.visits.find(v => v.uuid === this.model.existingVisit.uuid);
        this.model.details.value = this._getTextOrDefault(this.model.visit.details);
        this.model.toRemember.value = this._getTextOrDefault(this.model.visit.toRemember);

        this.model.tp = {
            ...this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid),
            visit: this.model.visit
        };
    }

    _getTextOrDefault(text) {
        if (text === undefined) {
            return 'General details and description of the trial in case it provided by the Sponsor/Site regarding specific particularities of the Trial or general message for Trial Subject';
        }
        return text;
    }

    _attachHandlerBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }

    _attachHandlerSaveDetails() {
        this.onTagEvent('save', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            let visitIndex = model.tp.visits.findIndex(v => v.pk === model.existingVisit.pk);
            model.tp.visits[visitIndex].details = this.model.details.value;
            model.tp.visits[visitIndex].toRemember = this.model.toRemember.value;
            model.tp.visits[visitIndex].procedures = this.model.procedures.value;
            this.TrialParticipantRepository.updateAsync(model.tpUid, model.tp);
            this.VisitsAndProceduresRepository.updateAsync(model.tp.visits[visitIndex].pk, model.tp.visits[visitIndex]);
            this.sendMessageToPatient(model.tp.visits[visitIndex], Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT);
            window.history.back();
        });
    }

    sendMessageToPatient(visit, operation) {
        this.CommunicationService.sendMessage(this.model.tp.did, {
            operation: operation,
            ssi: visit.trialSSI,
            useCaseSpecifics: {
                tpDid: this.model.tp.did,
                trialSSI: visit.trialSSI,
                visit: {
                    details: visit.details,
                    toRemember: visit.toRemember,
                    procedures: visit.procedures,
                    name: visit.name,
                    period: visit.period,
                    consentSSI: visit.consentSSI,
                    date: visit.date,
                    unit: visit.unit,
                    id: visit.id
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.PATIENT.SCHEDULE_VISIT,
        });
    }

}
