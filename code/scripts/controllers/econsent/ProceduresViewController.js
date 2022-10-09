import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const Constants = commonServices.Constants;
const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;

const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class ProceduresViewController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.model = this.getInitModel();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Procedures View",
                tag: "econsent-procedures-view"
            }
        );
        this.initServices();
    }

    initHandlers() {
        this.attachHandlerConfirm();
        this.observeCheckbox();
    }

    observeCheckbox() {
        this.model.onChange("makeAllCompleted", () => {
            if(this.model.makeAllCompleted) {
                this.initProcedures("Completed")
            } else {
                this.initProcedures();
            }
        })
    }

    updateTrialParticipant(visit) {
        window.WebCardinal.loader.hidden = false;
        if(visit) {
            this.sendMessageToPatient(visit, Constants.MESSAGES.HCO.VISIT_CONFIRMED);
        }
        this.HCOService.updateHCOSubEntity(this.tp, "tps", async (err, data) => {
            this.hcoDSU = await this.HCOService.getOrCreateAsync();
            this.initProcedures();
            window.WebCardinal.loader.hidden = true;
        });
    }

    async initServices() {
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initHandlers();
        this.initProcedures();
    }

    initProcedures(makeCompleted) {
        this.initialProcedures = this.model.visit.procedures;
        this.tp = this.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        this.model.procedures = this.model.visit.procedures;
        if (!this.tp.visits || this.tp.visits.length < 1) {
            this.tp.visits = this.model.visits;
            this.updateTrialParticipant();
        } else {
            let visitTp = this.tp.visits.find(v => v.uuid === this.model.visit.uuid);

            if (visitTp) {
                this.model.procedures = visitTp.procedures.filter(procedure => procedure.checked);
            } else {
                this.tp.visits.push(this.model.visit);
                this.updateTrialParticipant();
            }
        }

        this.model.procedures.forEach(procedure => {
            procedure.statusList = {
                label: 'Is procedure complete',
                required: true,
                options: [
                    {
                        label: 'Select option',
                        value: '',
                        selected:true,
                        hidden:true
                    },
                    {
                        label: 'Completed',
                        value: 'Completed',
                    },
                    {
                        label: 'Missed',
                        value: 'Missed',
                    },
                    {
                        label: 'N/A',
                        value: 'N/A',
                    }
                ],
                value: '',
            }
            if (makeCompleted !== undefined) {
                procedure.statusList.value = 'Completed';
            } else {
                let index = this.initialProcedures.findIndex(prc => prc.uuid === procedure.uuid);
                this.initialProcedures[index].status = procedure.status;
            }
        });
    }

    attachHandlerConfirm() {
        this.onTagClick('confirm-procedures', async () => {
            let index = this.tp.visits.findIndex(visit => visit.uuid === this.model.visit.uuid);

            this.model.procedures.forEach(procedure => {
                this.initialProcedures.forEach(item => {
                    if(item.uuid===procedure.uuid && procedure.statusList.value !== '') {
                        item.status = procedure.statusList.value;
                    }
                })
            })
            this.tp.visits[index].procedures = this.initialProcedures;

            if(this.tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED) {
                this.tp.status = Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT;
                this.sendStatusToPatient(this.tp.did, Constants.MESSAGES.HCO.UPDATE_STATUS, this.tp.status, 'Update tp status');
                await this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
                    ssi: this.tp.pk,
                }, 'Participant status changed')

                const tps = await this.TrialParticipantRepository.filterAsync(`did == ${this.tp.did}`, 'ascending', 30);
                let trialSubject;
                if (tps.length > 0) {
                    trialSubject = tps[0];
                    trialSubject.status = Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT;
                }

                await this.TrialParticipantRepository.updateAsync(this.tp.pk, trialSubject);
            }

            await this.checkProceduresStatus();

            this.updateTrialParticipant(this.tp.visits[index]);
            this.navigateToPageTag('econsent-visits-procedures', {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                trialId: this.model.trialId,
                pk: this.model.pk,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        })
    }

    async checkProceduresStatus() {
        let hcoDSU = await this.HCOService.getOrCreateAsync();
        let tp = hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        let visits;
        if (tp.hasOwnProperty('visits')) {
            visits = tp.visits;
        }
        if (visits !== undefined) {
            let completedVisitsCounter = 0;
            visits.forEach(visit => {
                if (visit.hasOwnProperty('confirmed') && visit.confirmed === true) {
                    let allProcedures = visit.procedures.filter(procedure => procedure.checked && procedure.status !== "N/A");
                    let completedProcedures = allProcedures.filter(procedure => procedure.hasOwnProperty('status') && procedure.status === "Completed");

                    if(allProcedures.length === completedProcedures.length){
                        completedVisitsCounter++;
                    }
                }
            });

            if (this.tp.status !== Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED) {
                if (completedVisitsCounter === visits.length) {
                    this.tp.status = Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED;
                    this.HCOService.updateHCOSubEntity(this.tp, "tps", async (err) => {
                        if (err) {
                            return console.log(err);
                        }
                        this.TrialParticipantRepository.filter(`did == ${this.tp.did}`, 'ascending', 30, (err, tps) => {
                            if (tps && tps.length > 0) {
                                tps[0].status = Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED;
                                this.TrialParticipantRepository.update(tps[0].pk, tps[0], async (err) => {
                                    if (err) {
                                        return console.log(err);
                                    }
                                    this.sendStatusToPatient(this.tp.did, Constants.MESSAGES.HCO.UPDATE_STATUS, this.tp.status, 'Update tp status');
                                    await this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
                                        ssi: this.tp.pk,
                                        consentSSI: null
                                    }, 'Participant status changed');
                                });
                            }
                        });
                    });
                }
            }
        }
    }

    sendMessageToPatient(visit, operation) {
        const { uuid, ...visitDetails } = visit;
        this.CommunicationService.sendMessage(this.tp.did, {
            operation: operation,
            useCaseSpecifics: {
                tpDid: this.tp.did,
                visit: {
                    ...visitDetails,
                    uid: uuid
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT,
        });
    }

    async _sendMessageToSponsor(operation, data, shortDescription) {
        const site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trialUid)
        await this.CommunicationService.sendMessage(site.sponsorDid, {
            operation: operation,
            ...data,
            shortDescription: shortDescription,
        });
    }

    sendStatusToPatient(tpDid, operation, status, shortMessage) {
        this.CommunicationService.sendMessage(tpDid, {
            operation: operation,
            status: status,
            shortDescription: shortMessage,
        });
    }

    getInitModel() {
        return {
            procedures: [],
            makeAllCompleted: false,
            ...this.getState(),
        };
    }

}
