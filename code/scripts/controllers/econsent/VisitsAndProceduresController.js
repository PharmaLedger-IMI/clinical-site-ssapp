import TrialService from "../../services/TrialService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;

const {WebcController} = WebCardinal.controllers;

export default class VisitsAndProceduresController extends WebcController {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        this.initServices();
    }

    initHandlers() {
        this.attachHandlerBack();
        this.attachHandlerDetails();
        this.attachHandlerSetDate();
        this.attachHandlerConfirm();
        this.attachHandlerEditDate();
        this.attachHandlerViewVisit();
        this.attachHandlerEditVisit();
    }

    async initServices() {
        this.TrialService = new TrialService();
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS, this.DSUStorage);
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS, this.DSUStorage);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initHandlers();
        this.initSite();
        this.initVisits();
    }

    async initVisits() {
        this.model.visits = this.model.hcoDSU.volatile.visit[0].visits.visits;
        this.extractDataVisit();
        this.matchTpVisits();
    }

    extractDataVisit() {
        if (this.model.visits) {
            this.model.visits.forEach(visit => {
                let weaksFrom = visit.weeks?.filter(weak => weak.type === "weekFrom" || weak.type === "week");
                if (weaksFrom)
                    visit.weakFrom = weaksFrom[0]?.value;
                let weaksTo = visit.weeks?.filter(weak => weak.type === "weekTo");
                if (weaksTo)
                    visit.weakTo = weaksTo[0]?.value;

                let plus = visit.visitWindow?.filter(weak => weak.type === "windowFrom");
                if (plus)
                    visit.plus = plus[0]?.value;
                let minus = visit.visitWindow?.filter(weak => weak.type === "windowTo");
                if (plus)
                    visit.minus = minus[0]?.value;
            });
        }
    }

    async matchTpVisits() {
        if (this.model.visits && this.model.visits.length > 0) {
            let tpIndex = this.model.hcoDSU.volatile.tps.findIndex(tp => tp.uid === this.model.tpUid);
            if (tpIndex === undefined) {
                return;
            }
            this.model.tp = this.model.hcoDSU.volatile.tps[tpIndex];
            if (!this.model.tp.visits || this.model.tp.visits.length < 1) {
                this.model.tp.visits = this.model.visits;
                this.HCOService.updateEntity(this.model.tp, {}, async (err, data) => {
                    this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
                });

            } else {
                this.model.visits.forEach(visit => {

                    let visitTp = this.model.tp.visits.filter(v => v.uuid === visit.uuid)[0];
                    if (visitTp !== undefined) {
                        visit.confirmed = visitTp.confirmed;
                        visit.accepted = visitTp.accepted;
                        visit.declined = visitTp.declined;
                        if (!visit.accepted && !visit.declined) {
                            visit.tsAcceptance = "Required";
                        } else {
                            if (visit.accepted) {
                                visit.tsAcceptance = "Agreed";
                            } else {
                                visit.tsAcceptance = "Declined";
                            }
                        }
                        visit.date = visitTp.date;
                        visit.toShowDate = DateTimeService.convertStringToLocaleDateTimeString(visitTp.date);
                    }
                })
            }
        }
    }

    async updateTrialParticipantVisit(visit, operation) {
        if (!this.model.tp.visits) {
            this.model.tp.visits = this.visits;
        }

        let objIndex = this.model.tp.visits.findIndex((obj => obj.uuid == visit.uuid));
        this.model.tp.visits[objIndex] = visit;
        this.model.visits = this.model.tp.visits;
        let v = this.model.hcoDSU.volatile.visit[0];
        v.visits.visits = this.model.tp.visits;

        this.HCOService.updateEntity(v, {}, async (err, data) => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
            let tpIndex = this.model.hcoDSU.volatile.tps.findIndex(tp => tp.uid === this.model.tpUid);
            this.model.tp = this.model.hcoDSU.volatile.tps[tpIndex];
            this.HCOService.updateEntity(this.model.tp, {}, async (err, data) => {
                this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
                this.sendMessageToPatient(visit, operation);
            })
        })
    }

    attachHandlerBack() {
        this.onTagClick("back", () => {
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

    attachHandlerSetDate() {
        this.onTagClick("procedure:setDate", (model) => {
            this.showModalFromTemplate(
                "set-procedure-date",
                (event) => {
                    let date = new Date(event.detail);
                    this.model.date = event.detail;
                    this.model.toShowDate = DateTimeService.convertStringToLocaleDateTimeString(date);
                    this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.COMMUNICATION.TYPE.SCHEDULE_VISIT);
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/SetProcedureDateController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                });
        });
    }

    async updateTrialParticipantRepository(uid, tp) {
        await this.TrialParticipantRepository.updateAsync(uid, tp);
    }

    attachHandlerEditDate() {
        this.onTagClick("procedure:editDate", (model) => {
            this.showModalFromTemplate(
                "set-procedure-date",
                (event) => {
                    let visitIndex = this.model.tp.visits.findIndex(v => v.pk === model.pk);
                    let date = new Date(event.detail);
                    this.model.tp.visits[visitIndex].date = event.detail;
                    this.model.tp.visits[visitIndex].toShowDate = DateTimeService.convertStringToLocaleDateTimeString(date);
                    // this.model.existingVisit.toShowDate = DateTimeService.convertStringToLocaleDateTimeString(date);
                    // this.model.visit = model.tp.visits[visitIndex];
                    this.updateTrialParticipantRepository(this.model.tp.uid, this.model.tp);
                    this.model.visits = this.model.tp.visits;
                    let v = this.model.hcoDSU.volatile.visit[0];
                    v.visits.visits = this.model.tp.visits;
                    this.HCOService.updateEntity(v, {}, async (err, data) => {
                        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
                    });
                    this.sendMessageToPatient(this.model.tp.visits[visitIndex], Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT);
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/SetProcedureDateController",
                    disableExpanding: false,
                    disableBackdropClosing: true
                });
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
                    confirmed: visit.confirmed,
                    details: visit.details,
                    toRemember: visit.toRemember,
                    procedures: visit.procedures,
                    name: visit.name,
                    period: visit.period,
                    consentSSI: visit.consentSSI,
                    date: visit.date,
                    unit: visit.unit,
                    uid: visit.uuid,
                    id: visit.id
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.PATIENT.SCHEDULE_VISIT,
        });
    }

    attachHandlerConfirm() {
        this.onTagClick("visit:confirm", (model) => {
            this.showModalFromTemplate(
                "confirmation-alert",
                (event) => {
                    const response = event.detail;
                    if (response) {
                        model.confirmed = true;
                        let visitIndex = this.model.tp.visits.findIndex(v => v.pk === model.pk);
                        this.model.tp.visits[visitIndex].confirmed = true;
                        this.HCOService.updateEntity(this.model.tp, {}, async (err, data) => {
                            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
                            this.model.visits = this.model.tp.visits;
                            this.sendMessageToSponsor(model);
                        })
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/ConfirmationAlertController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    question: "Are you sure you want to confirm this visit, The patient attended to visit ? ",
                    title: "Confirm visit",
                });
        });
    }

    attachHandlerEditVisit() {
        this.onTagClick("visit:edit", (model) => {
            this.navigateToPageTag("econsent-visit-edit", {
                tpUid: this.model.tpUid,
                existingVisit: model
            });
        });
    }

    attachHandlerViewVisit() {
        this.onTagClick("visit:view", (model) => {
            this.navigateToPageTag('econsent-procedures-view', {
                tpUid: this.model.tpUid,
                visitUuid: model.uuid
            });
        });
    }

    async initSite() {
        this.model.site = this.model.hcoDSU.volatile.site[0];
    }

    sendMessageToSponsor(visit) {
        const currentDate = new Date();
        let sendObject = {
            operation: Constants.MESSAGES.HCO.COMMUNICATION.TYPE.VISIT_CONFIRMED,
            ssi: this.model.econsentSSI,
            useCaseSpecifics: {
                trialSSI: visit.trialSSI,
                tpNumber: this.model.tp.number,
                tpDid: this.model.tp.did,

                visit: {
                    id: visit.id,
                    date: DateTimeService.getCurrentDateAsISOString(),
                    toShowDate: currentDate.toLocaleDateString(),
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.SPONSOR.VISIT_CONFIRMED,
        };
        this.CommunicationService.sendMessage(this.model.site.sponsorIdentity, sendObject);
    }

    getInitModel() {
        return {
            ...this.getState(),
            visits: [],
            generalVisits: []
        };
    }

}
