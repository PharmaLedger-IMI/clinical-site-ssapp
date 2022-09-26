import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const ConsentStatusMapper = commonServices.ConsentStatusMapper;
const Constants = commonServices.Constants;
const momentService  = commonServices.momentService;
const BaseRepository = commonServices.BaseRepository;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class VisitsAndProceduresController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();
        this.state = this.getState();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Visit and Procedures",
                tag: "econsent-visits-procedures"
            }
        );
        this.initServices().then(() => {
            this.model.dataSourceInitialized = this.model.visits.length ? true : false;
            this.model.visitsDataSource = DataSourceFactory.createDataSource(5, 10, this.model.toObject('visits'));
        });
    }

    initHandlers() {
        this.attachHandlerDetails();
        this.attachHandlerSetDate();
        this.attachHandlerConfirm();
        this.attachHandlerEditDate();
        this.attachHandlerViewVisit();
    }

    async initServices() {
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS);
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initHandlers();
        await this.initSiteAndConsents();
        await this.initVisits();
    }

    addConsentsProcedures() {
        let mergedCons = [];

        this.trialConsents.forEach(consent => {
            if(consent['type'] === 'Mandatory') {
                return mergedCons.push(consent);
            }

            if (consent['type'] === 'Optional') {
                const consentVersions = consent.versions;
                const lastConsentVersionActions = consentVersions[consentVersions.length - 1].actions;
                if (lastConsentVersionActions) {
                    const hcoSigned = lastConsentVersionActions.some(action => action.type === "hco" && action.name === ConsentStatusMapper.consentStatuses.signed.name)
                    if (hcoSigned) {
                        mergedCons.push(consent);
                    }
                }
            }
        });

        if (mergedCons.length > 1) {
            mergedCons.forEach(cons => {
                if (cons.type === 'Optional') {
                    this.site.visits.visits.forEach(visit => {
                        if (cons.trialConsentId === visit.consentId && cons.trialConsentVersion === visit.consentVersion) {
                            this.model.visits.forEach(shownVisit => {
                                let wantedVisit = visit.visits.find(el => el.id === shownVisit.id);
                                if(wantedVisit !== undefined ) {
                                    shownVisit.procedures.push(...wantedVisit.procedures);
                                }
                            })
                        }
                    })
                }
            })
        }

        this.model.visits.forEach(visit => {
            visit.procedures = visit.procedures.map((procedure, index) => {
                return {
                    ...procedure,
                    id: index
                }
            })
        })

        console.log('this.model.visits', this.model.visits)
    }

    prepareDateForVisits(receivedVisits) {
        if (receivedVisits.length > 0) {

            let visits = receivedVisits;
            let dayInMs = 86400000; // number of milliseconds in a day
            if (!visits[0].proposedDate) {
                return;
            }
            visits.map((currentVisit, index) => {
                if (index === 0) {
                    return;
                }
                let {windowTo, windowFrom} = currentVisit;
                let previousVisit = visits[0];
                if (previousVisit.proposedDate) {
                    let weeksDif = (currentVisit.week - previousVisit.week) * 7;
                    let daysDif = currentVisit.day - previousVisit.day;

                    let dayInRange = weeksDif + daysDif;

                    windowFrom = windowFrom !== 'N/A' ? windowFrom : 0;
                    windowTo = windowTo !== 'N/A' ? windowTo : 0;

                    let suggestedFromDate = (dayInRange + windowFrom) * dayInMs;
                    let suggestedToDate = (dayInRange + windowTo) * dayInMs;

                    let suggestedInterval = [previousVisit.proposedDate + suggestedFromDate, previousVisit.proposedDate + suggestedToDate];

                    if (windowTo === 0 || windowFrom === 0) {
                        let firstDate = suggestedInterval[0];
                        let date = new Date(firstDate);
                        let todayMs = (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) * 1000;
                        let firstDateMinimized = firstDate - todayMs;
                        let secondDateMaximized = firstDateMinimized + (24 * 3600 * 1000) - 60 * 1000;

                        suggestedInterval = [firstDateMinimized, secondDateMaximized];
                    } else {
                        let firstDate = new Date(suggestedInterval[0]);
                        let todayMs = (firstDate.getHours() * 3600 + firstDate.getMinutes() * 60 + firstDate.getSeconds()) * 1000;
                        let firstDateMinimized = suggestedInterval[0] - todayMs;
                        let secondDateMaximized = (new Date(suggestedInterval[1])).setHours(23, 59);

                        suggestedInterval = [firstDateMinimized, secondDateMaximized];
                    }
                    currentVisit.suggestedInterval = suggestedInterval;
                }
            })
        }
    }

    async initVisits() {
        if (this.site.visits.visits.length) {
            const {trialId} = this.model;
            const selectedVisit = this.site.visits.visits
                .find(v => v.trialId === trialId && v.consentId === this.mandatoryConsent.trialConsentId && v.consentVersion === this.mandatoryConsent.trialConsentVersion);
            this.model.visits = selectedVisit ? (selectedVisit.visits || []) : [];
        }
        this.addConsentsProcedures();
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
            let tpIndex = this.hcoDSU.volatile.tps.findIndex(tp => tp.uid === this.state.tpUid);
            if (tpIndex === undefined) {
                return;
            }
            this.tp = this.hcoDSU.volatile.tps[tpIndex];
            if (!this.tp.visits || this.tp.visits.length < 1) {
                this.tp.visits = this.visits;
                this.HCOService.updateHCOSubEntity(this.tp, "tps", async (err, data) => {
                    this.hcoDSU = await this.HCOService.getOrCreateAsync();
                });

            } else {
                this.model.visits.forEach(visit => {
                    let visitTp = this.tp.visits.filter(v => v.uuid === visit.uuid)[0];
                    if (visitTp !== undefined) {

                        visitTp.procedures = visit.procedures;
                        visit.confirmed = visitTp.confirmed;
                        visit.accepted = visitTp.accepted;
                        visit.declined = visitTp.declined;
                        visit.rescheduled = visitTp.rescheduled;
                        visit.shouldBeRescheduled = false;
                        visit.proposedDate = visitTp.proposedDate;
                        visit.confirmedDate = visitTp.confirmedDate;
                        visit.isExtended = visitTp.isExtended;

                        visit.hasProposedDate = typeof visit.proposedDate !== "undefined";
                        if (visit.hasProposedDate) {
                            visit.toShowDate = momentService(visit.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                        }

                        if (!visit.accepted && !visit.declined && !visit.rescheduled) {
                            visit.tsAcceptance = "required";
                            if(visit.hasProposedDate) {
                                visit.tsAcceptance = "scheduled";
                            }
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
                        if(visit.confirmed) {
                            visit.tsAcceptance = "confirmed-by-both";
                        }

                        if(visit.hcoRescheduled) {
                            visit.tsAcceptance = "rescheduled-by-hco"
                        }

                    }
                })
            }
        }
    }

    async updateTrialParticipantVisit(visit, operation) {
        window.WebCardinal.loader.hidden = false;

        if(!this.tp.visits){
            this.tp.visits = [];
        }

        this.model.visits.forEach(visit=>{
            if (!this.tp.visits.some(tpVisit => tpVisit.uuid === visit.uuid)) {
                this.tp.visits.push(JSON.parse(JSON.stringify(visit)));
            }
        })

        let tpVisitIndex = this.tp.visits.findIndex((obj => obj.uuid === visit.uuid));
        let consentVisitIndex = this.model.visits.findIndex((obj => obj.uuid === visit.uuid));
        this.tp.visits[tpVisitIndex].toShowDate = visit.toShowDate;
        this.tp.visits[tpVisitIndex].proposedDate = this.model.proposedDate;
        this.tp.visits[tpVisitIndex].hasProposedDate = visit.hasProposedDate;
        this.tp.visits[tpVisitIndex].confirmedDate = visit.confirmedDate;
        this.tp.visits[tpVisitIndex].confirmed = visit.confirmed;
        this.tp.visits[tpVisitIndex].suggestedInterval = visit.suggestedInterval;
        this.tp.visits[tpVisitIndex].hcoRescheduled = visit.hcoRescheduled;
        this.tp.visits[tpVisitIndex].isExtended = visit.isExtended;
        this.model.visits[consentVisitIndex].proposedDate = this.model.proposedDate;
        this.model.visits[consentVisitIndex].hasProposedDate = true;
        this.model.visits[consentVisitIndex].isExtended = visit.isExtended;

        if(this.actionNeeded) {
            this.tp.actionNeeded = this.actionNeeded;
        }
        this.HCOService.updateHCOSubEntity(this.tp, "tps", async (err, data) => {
            if (err) {
                return this.model.message = {
                    content: `An error has been occurred!`,
                    type:'error'
                }
            }
            this.hcoDSU = await this.HCOService.getOrCreateAsync();
            const currentConsentVisits = this.tp.visits.filter(tpVisit=>{
                return this.model.visits.some(visit => tpVisit.uuid === visit.uuid)
            })
            this.model.visitsDataSource.updateTable(currentConsentVisits);
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
                    let date = new Date(event.detail.procedureDate);
                    model.isExtended = event.detail.isExtended;
                    model.proposedDate = date.getTime();
                    this.model.proposedDate = date.getTime();
                    this.model.toShowDate = momentService(model.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                    model.toShowDate = this.model.toShowDate;
                    model.hasProposedDate = true;
                    await this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.COMMUNICATION.TYPE.SCHEDULE_VISIT);
                    this.model.message = {
                        content: `${model.name} have been scheduled. Wait for confirmation.`,
                        type: 'success'
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/SetProcedureDateController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    suggestedInterval: model.suggestedInterval,
                    isExtended: model.isExtended
                });
        });
    }

    async updateTrialParticipantRepository(pk, tp) {
        await this.TrialParticipantRepository.updateAsync(pk, tp);
    }

    attachHandlerEditDate() {
        this.onTagClick("procedure:editDate", (model) => {
            this.showModalFromTemplate(
                "set-procedure-date",
                async (event) => {
                    let date = new Date(event.detail.procedureDate);
                    model.isExtended = event.detail.isExtended;
                    model.proposedDate = date.getTime();
                    model.confirmed = false;
                    model.accepted = false;
                    this.model.proposedDate = date.getTime();
                    this.model.toShowDate = momentService(model.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                    model.hcoRescheduled = true;
                    await this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT);
                    this.model.message = {
                        content: `${model.name} have been rescheduled! Wait for TP response!`,
                        type: 'success'
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: "modals/SetProcedureDateController",
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    confirmedDate: model.confirmedDate,
                    suggestedInterval: model.suggestedInterval,
                    isExtended: model.isExtended
                });
        });
    }

    sendMessageToPatient(visit, operation) {
        this.CommunicationService.sendMessage(this.tp.did, {
            operation: operation,
            useCaseSpecifics: {
                tpDid: this.tp.did,
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
                    proposedDate: visit.proposedDate,
                    suggestedInterval: visit.suggestedInterval,
                    isExtended: visit.isExtended
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
                        model.hcoRescheduled = false;
                        this.model.proposedDate = model.proposedDate;
                        this.model.toShowDate = momentService(model.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                        if(this.tp.actionNeeded === Constants.TP_ACTIONNEEDED_NOTIFICATIONS.TP_VISIT_CONFIRMED || this.tp.actionNeeded === Constants.TP_ACTIONNEEDED_NOTIFICATIONS.TP_VISIT_RESCHEDULED) {
                            this.actionNeeded = Constants.TP_ACTIONNEEDED_NOTIFICATIONS.VISIT_CONFIRMED;
                        }

                        await this.updateTrialParticipantVisit(model, Constants.MESSAGES.HCO.VISIT_CONFIRMED);

                        this.model.message = {
                            content: `${model.name} have been confirmed!`,
                            type: 'success'
                        }
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


    attachHandlerViewVisit() {
        this.onTagClick("visit:view", (model) => {
            this.navigateToPageTag('econsent-procedures-view', {
                trialUid: this.state.trialUid,
                tpUid: this.state.tpUid,
                trialId: this.state.trialId,
                visits: this.model.toObject("visits"),
                visit: model,
                pk: this.state.pk,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    async initSiteAndConsents() {
        this.site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.state.trialUid);
        let ifcs = this.hcoDSU.volatile.ifcs;
        let siteConsentsKeySSis = this.site.consents.map(consent => consent.uid);
        this.trialConsents = ifcs.filter(icf => {
            return siteConsentsKeySSis.indexOf(icf.genesisUid) > -1 && icf.tpUid === this.state.pk
        })

        this.mandatoryConsent = this.trialConsents.find(cons => {
            return cons['type'] === 'Mandatory' && cons.hasOwnProperty('hcoSign') === true
        });
    }

    getInitModel() {
        return {
            ...this.getState(),
            visits: [],
            generalVisits: []
        };
    }

}
