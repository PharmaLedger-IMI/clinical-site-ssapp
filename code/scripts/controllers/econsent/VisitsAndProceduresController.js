import TrialService from "../../services/TrialService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const momentService  = commonServices.momentService;
const BaseRepository = commonServices.BaseRepository;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class VisitsAndProceduresController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Visit and Procedures",
                tag: "econsent-visits-procedures"
            }
        );

        this.initServices().then(() => {
            this.model.dataSourceInitialized = true;
            this.model.visitsDataSource = DataSourceFactory.createDataSource(5, 10, this.model.toObject('visits'))
            this.model.visitsDataSource.__proto__.updateVisits = function (visits) {
                this.model.tableData = visits;

                this.getElement().dataSize = visits.length;
                this.forceUpdate(true);
            }
        });
    }

    initHandlers() {
        this.attachHandlerDetails();
        this.attachHandlerSetDate();
        this.attachHandlerConfirm();
        this.attachHandlerEditDate();
        this.attachHandlerViewVisit();
        this.attachHandlerEditVisit();
    }

    async initServices() {
        this.TrialService = new TrialService();
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS);
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initHandlers();
        await this.initSite();
        await this.initVisits();
    }

     prepareDateForVisits(receivedVisits) {
        let visits = receivedVisits;
        let dayInMs = 86400000; // number of milliseconds in a day
        if(!visits[0].proposedDate) {
            return console.error("No proposed date for first visit!");
        }
        visits.map((currentVisit,index) => {
            if(index===0) {
                return;
            }
            let { windowTo, windowFrom } = currentVisit; // destr || current. ..
            let previousVisit = visits[0];
            if(previousVisit.proposedDate) {
                let weeksDif = (currentVisit.week - previousVisit.week)* 7;
                let daysDif = currentVisit.day - previousVisit.day;

                let dayInRange = weeksDif + daysDif;

                windowFrom = windowFrom !== 'N/A' ? windowFrom : 0;
                windowTo = windowTo !== 'N/A' ? windowTo : 0;

                let suggestedFromDate = (dayInRange + windowFrom)*dayInMs;
                let suggestedToDate = (dayInRange + windowTo)*dayInMs;

                let suggestedInterval = [previousVisit.proposedDate + suggestedFromDate, previousVisit.proposedDate + suggestedToDate];

                if(windowTo === 0 || windowFrom === 0) {
                    let firstDate = suggestedInterval[0];
                    let date = new Date(firstDate);
                    let todayMs = (date.getHours()*3600 + date.getMinutes()*60 + date.getSeconds()) * 1000;
                    let firstDateMinimized = firstDate - todayMs;
                    let secondDateMaximized = firstDateMinimized + (24*3600 * 1000) - 60*1000;

                    suggestedInterval = [firstDateMinimized, secondDateMaximized];
                } else {
                    let firstDate = new Date(suggestedInterval[0]);
                    let todayMs = (firstDate.getHours() * 3600 + firstDate.getMinutes() * 60 + firstDate.getSeconds())*1000;
                    let firstDateMinimized = suggestedInterval[0] - todayMs;
                    let secondDateMaximized = (new Date(suggestedInterval[1])).setHours(23, 59);

                    suggestedInterval = [firstDateMinimized, secondDateMaximized];
                }
                currentVisit.suggestedInterval = suggestedInterval;
            }
        })
    }

    async initVisits() {
        if(this.model.toObject("site.visits.visits").length) {
            this.model.visits = this.model.toObject("site.visits.visits").find((visit) => visit.consentId === this.model.consentId).data;
        }
        this.model.siteHasVisits = this.model.visits.length > 0;
        this.extractDataVisit();
        await this.matchTpVisits();
        this.prepareDateForVisits(this.model.visits);
    }

    extractDataVisit() {
        if (this.model.visits) {
            this.model.visits.forEach(visit => {
                visit.windowFrom = visit.visitWindow ? visit.visitWindow.windowFrom : "N/A";
                visit.windowTo = visit.visitWindow ? visit.visitWindow.windowTo : "N/A";
            });
        }
    }

    async matchTpVisits(visitsForUpdate) {
        if(visitsForUpdate) {
            this.model.visits = visitsForUpdate;
        }
        if (this.model.visits && this.model.visits.length > 0) {
            let tpIndex = this.model.hcoDSU.volatile.tps.findIndex(tp => tp.uid === this.model.tpUid);
            if (tpIndex === undefined) {
                return;
            }
            this.model.tp = this.model.hcoDSU.volatile.tps[tpIndex];
            if (!this.model.tp.visits || this.model.tp.visits.length < 1) {
                this.model.tp.visits = this.model.visits;
                this.HCOService.updateHCOSubEntity(this.model.tp, "tps", async (err, data) => {
                    this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
                });

            } else {
                this.model.visits.forEach(visit => {
                    let visitTp = this.model.tp.visits.filter(v => v.uuid === visit.uuid)[0];
                    if (visitTp !== undefined) {

                        visit.confirmed = visitTp.confirmed;
                        visit.accepted = visitTp.accepted;
                        visit.declined = visitTp.declined;
                        visit.rescheduled = visitTp.rescheduled;
                        visit.shouldBeRescheduled = false;
                        if (!visit.accepted && !visit.declined && !visit.rescheduled) {
                            visit.tsAcceptance = "required";
                        } else {
                            visit.shouldBeRescheduled = true;
                            if (visit.accepted) {
                                    visit.tsAcceptance = "agreed";
                            }
                            if (visit.declined) {
                                    visit.tsAcceptance = "declined";
                            }
                            if(visit.rescheduled) {
                                visit.tsAcceptance = "rescheduled";
                            }
                        }
                        visit.proposedDate = visitTp.proposedDate;
                        visit.confirmedDate = visitTp.confirmedDate;

                        visit.hasProposedDate = typeof visit.proposedDate !== "undefined";
                        if (visit.hasProposedDate) {
                            visit.toShowDate = momentService(visit.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                        }

                    }
                })
            }
        }
    }

    async updateTrialParticipantVisit(visit, operation) {
        window.WebCardinal.loader.hidden = false;

        if(!this.model.tp.visits){
            this.model.tp.visits = [];
        }

        this.model.visits.forEach(visit=>{
            if (!this.model.tp.visits.some(tpVisit => tpVisit.uuid === visit.uuid)) {
                this.model.tp.visits.push(JSON.parse(JSON.stringify(visit)));
            }
        })

        let tpVisitIndex = this.model.tp.visits.findIndex((obj => obj.uuid === visit.uuid));
        let consentVisitIndex = this.model.visits.findIndex((obj => obj.uuid === visit.uuid));
        this.model.tp.visits[tpVisitIndex].toShowDate = visit.toShowDate;
        this.model.tp.visits[tpVisitIndex].proposedDate = this.model.proposedDate;
        this.model.tp.visits[tpVisitIndex].hasProposedDate = visit.hasProposedDate;
        this.model.tp.visits[tpVisitIndex].confirmedDate = visit.confirmedDate;
        this.model.tp.visits[tpVisitIndex].confirmed = visit.confirmed;
        this.model.visits[consentVisitIndex].proposedDate = this.model.proposedDate;
        this.model.visits[consentVisitIndex].hasProposedDate = true;

        this.HCOService.updateHCOSubEntity(this.model.tp, "tps", async (err, data) => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
            const currentConsentVisits = this.model.tp.visits.filter(tpVisit=>{
                return this.model.visits.some(visit => tpVisit.uuid === visit.uuid)
            })
            this.model.visitsDataSource.updateVisits(currentConsentVisits);
            this.prepareDateForVisits(currentConsentVisits);
            await this.matchTpVisits(currentConsentVisits);
            this.sendMessageToPatient(visit, operation);
            window.WebCardinal.loader.hidden = true;
        })
    }

    attachHandlerDetails() {
        this.onTagClick("viewConsent", (model) => {
            this.navigateToPageTag("econsent-sign", {
                trialSSI: model.trialSSI,
                econsentUid: model.econsentUid,
                controlsShouldBeVisible: false
            });
        });
    }

    attachHandlerSetDate() {
        this.onTagClick("procedure:setDate", (model) => {
            this.showModalFromTemplate(
                "set-procedure-date",
                async (event) => {
                    let date = new Date(event.detail);
                    model.proposedDate = date.getTime();
                    this.model.proposedDate = date.getTime();
                    this.model.toShowDate = momentService(model.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                    model.toShowDate = this.model.toShowDate;
                    model.hasProposedDate = true;
                    await this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.COMMUNICATION.TYPE.SCHEDULE_VISIT);
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/SetProcedureDateController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    suggestedInterval: model.suggestedInterval
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
                async (event) => {
                    let date = new Date(event.detail);
                    model.proposedDate = date.getTime();
                    model.confirmed = false;
                    model.accepted = false;
                    this.model.proposedDate = date.getTime();
                    this.model.toShowDate = momentService(model.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern)
                    await this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT);
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/SetProcedureDateController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    confirmedDate: model.confirmedDate,
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
                    confirmedDate: visit.confirmedDate,
                    details: visit.details,
                    toRemember: visit.toRemember,
                    procedures: visit.procedures,
                    name: visit.name,
                    period: visit.period,
                    consentSSI: visit.consentSSI,
                    date: visit.date,
                    unit: visit.unit,
                    uid: visit.uuid,
                    id: visit.id,
                    proposedDate: visit.proposedDate
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.PATIENT.SCHEDULE_VISIT,
        });
    }

    attachHandlerConfirm() {
        this.onTagClick("visit:confirm", (model) => {
            this.showModalFromTemplate(
                "confirmation-alert",
                async (event) => {
                    const response = event.detail;
                    if (response) {
                        model.confirmed = true;
                        model.confirmedDate = momentService(model.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                        this.model.proposedDate = model.proposedDate;
                        this.model.toShowDate = DateTimeService.convertStringToLocaleDateTimeString(model.proposedDate);
                        await this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.VISIT_CONFIRMED);
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/ConfirmationAlertController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    question: "Are you sure you want to confirm this visit?",
                    title: "Confirm visit",
                });
        });
    }

    attachHandlerEditVisit() {
        this.onTagClick("visit:edit", (model) => {
            this.navigateToPageTag("econsent-visit-edit", {
                tpUid: this.model.tpUid,
                existingVisit: model,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    attachHandlerViewVisit() {
        this.onTagClick("visit:view", (model) => {
            this.navigateToPageTag('econsent-procedures-view', {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                consentId:this.model.consentId,
                visitUuid: model.uuid,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    async initSite() {
        const sites = this.model.toObject("hcoDSU.volatile.site");
        this.model.site = sites.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trialUid);
    }

    sendMessageToSponsor(visit) {
        const currentDate = new Date();
        let sendObject = {
            operation: Constants.MESSAGES.HCO.COMMUNICATION.TYPE.VISIT_CONFIRMED,
            ssi: this.model.econsentUid,
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
        this.CommunicationService.sendMessage(this.model.site.sponsorDid, sendObject);
    }

    getInitModel() {
        return {
            ...this.getState(),
            visits: [],
            generalVisits: []
        };
    }

}
