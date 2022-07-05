import TrialService from "../../services/TrialService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

let getInitModel = () => {
    return {
            details: {
                name: "details",
                placeholder: "Details",
                value: ''
            },
            toRemember: {
                name: "toRemember",
                placeholder: "To Remember",
                value: ''
            }
        }
};

export default class VisitEditController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            ...this.history.win.history.state.state,
        });
        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Visit Edit",
                tag: "econsent-visit-edit"
            }
        );

        this._initServices();
    }

    _initHandlers() {
        this._attachHandlerBack();
        this._attachHandlerSaveDetails();
    }

    async _initServices() {
        this.TrialService = new TrialService();
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS);
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this._initHandlers();
        await this._initVisit();
    }

    async _initVisit() {
        this.model.visit = this.model.hcoDSU.volatile.site[0].visits.visits[0].data.find(v => v.uuid === this.model.existingVisit.uuid);

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
        this.model.details.value = this._getTextOrDefault(this.model.details.value);
        this.model.toRemember.value = this._getTextOrDefault(this.model.toRemember.value);

        this.onTagEvent('save', 'click', async (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            let visitIndex = model.tp.visits.findIndex(v => v.uuid === this.model.existingVisit.uuid);
            model.tp.visits[visitIndex].details = this.model.details.value;
            model.tp.visits[visitIndex].toRemember = this.model.toRemember.value;
            model.tp.visits[visitIndex].procedures = model.visit.procedures;
            // let tps = await this.TrialParticipantRepository.filterAsync(`did == ${this.model.tp.did}`);
            // let someTp;
            // if (tps && tps.length > 0) {
            //     someTp = tps[0];
            // }
            // await this.TrialParticipantRepository.updateAsync(someTp.pk, model.tp);
            // await this.VisitsAndProceduresRepository.updateAsync(model.tp.visits[visitIndex].uuid, model.tp.visits[visitIndex]);
            this.sendMessageToPatient(model.tp.visits[visitIndex], Constants.MESSAGES.HCO.VISIT_CONFIRMED);
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
                    ...visit,
                    details: visit.details,
                    toRemember: visit.toRemember,
                    procedures: visit.procedures,
                    consentSSI: visit.consentSSI,
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT,
        });
    }

}
