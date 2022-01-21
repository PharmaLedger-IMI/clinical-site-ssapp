import TrialService from "../../services/TrialService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;

const {WebcController} = WebCardinal.controllers;

export default class ProceduresViewController extends WebcController {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        this.initServices();
    }

    initHandlers() {
        this.attachHandlerBack();
        this.attachHandlerDetails();
        this.attachHandlerConfirm();
    }

    async initServices() {
        this.TrialService = new TrialService();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initHandlers();
        this.initProcedures();
    }

    initProcedures() {
        this.model.visit = this.model.hcoDSU.volatile.visit[0].visits.visits.find(v => v.uuid === this.model.visitUuid);
        this.model.tp = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        this.model.procedures = this.model.visit.procedures;
        if (!this.model.tp.visits || this.model.tp.visits.length < 1) {
            this.model.tp.visits = this.model.visits;
            this.updateTrialParticipant();
        } else {
            let visitTp = this.model.tp.visits.filter(v => v.uuid === this.model.visitUuid) [0];
            if (visitTp) {
                this.model.procedures = visitTp.procedures;
            } else {
                this.model.tp.visits.push(this.model.visit);
                this.updateTrialParticipant();
            }
        }
    }

    updateTrialParticipant() {
        this.HCOService.updateEntity(this.model.tp, {}, async (err, data) => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        });
    }

    attachHandlerBack() {
        this.onTagClick("navigation:go-back", () => {
            this.history.goBack();
        });
    }

    attachHandlerDetails() {
        this.onTagClick("viewConsent", (model) => {
            this.navigateToPageTag("econsent-sign", {
                trialSSI: model.trialSSI,
                econsentSSI: model.consentSSI,
                controlsShouldBeVisible: false
            });
        });
    }
    
    updateProcedure(procedure) {
        let objIndex = this.model.procedures.findIndex((obj => obj.id == procedure.id));
        this.model.procedures[objIndex] = procedure;
        let visitTp = this.model.tp.visits.filter(v => v.uuid === this.model.visitUuid) [0];
        visitTp.procedures = this.model.procedures;
        let obj = this.model.tp.visits.findIndex((obj => obj.uuid == visitTp.uuid));
        this.model.tp.visits[obj] = visitTp;
        this.updateTrialParticipant();
    }

    attachHandlerConfirm() {
        this.onTagClick("procedure:confirm", (model) => {
            const modalConfig = {
                controller: "modals/ConfirmationAlertController",
                disableExpanding: false,
                disableBackdropClosing: true,
                question: "Are you sure that this procedure is completed for patient ? ",
                title: "Complete procedure",
            };

            this.showModalFromTemplate(
                "confirmation-alert",
                (event) => {
                    if (event.detail) {
                        model.status = "Confirmed";
                        this.updateProcedure(model);
                    }
                }, this.emptyCallback, modalConfig);
        });
    }

    getInitModel() {
        return {
            procedures: [],
            visit: {},
            ...this.getState(),
        };
    }

}
