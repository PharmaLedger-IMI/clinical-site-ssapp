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
            let visitTp = this.tp.visits.filter(v => v.uuid === this.model.visit.uuid)[0];

            if (visitTp) {
                this.model.procedures = visitTp.procedures;
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
                ],
                value: '',
            }
            if (makeCompleted !== undefined) {
                procedure.statusList.value = 'Completed';
            } else {
                let index = this.initialProcedures.findIndex(prc => prc.id === procedure.id);
                this.initialProcedures[index].status = procedure.status;
            }
        });
    }

    attachHandlerConfirm() {
        this.onTagClick('confirm-procedures', async () => {
            let index = this.tp.visits.findIndex(visit => visit.uuid === this.model.visit.uuid);

            this.model.procedures.forEach(procedure => {
                this.initialProcedures.forEach(item => {
                    if(item.id===procedure.id && procedure.statusList.value !== '') {
                        item.status = procedure.statusList.value;
                    }
                })
            })
            this.tp.visits[index].procedures = this.initialProcedures;

            if(this.tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED) {
                this.tp.status = Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT;
                await this.CommunicationService.sendMessage(this.tp.did, {
                    status: this.tp.status,
                    operation: Constants.MESSAGES.HCO.UPDATE_STATUS
                });
                await this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
                    ssi: this.tp.pk,
                }, 'Participant status changed')
            }

            const tps = await this.TrialParticipantRepository.filterAsync(`did == ${this.tp.did}`, 'ascending', 30)
            let trialSubject;
            if (tps.length > 0) {
                trialSubject = tps[0];
                trialSubject.status = Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT;
            }

            await this.TrialParticipantRepository.updateAsync(this.tp.pk, trialSubject);

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

    sendMessageToPatient(visit, operation) {

        this.CommunicationService.sendMessage(this.tp.did, {
            operation: operation,
            useCaseSpecifics: {
                tpDid: this.tp.did,
                visit: {
                    ...visit,
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

    getInitModel() {
        return {
            procedures: [],
            makeAllCompleted: false,
            ...this.getState(),
        };
    }

}
