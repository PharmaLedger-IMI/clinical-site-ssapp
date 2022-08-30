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
        this.attachHandlerSelect();
        this.attachHandlerConfirm();
        this.observeCheckbox();
    }

    observeCheckbox() {
        this.model.onChange("makeAllCompleted", () => {
            if(this.model.makeAllCompleted) {
                this.initProcedures("Completed")
                this.updateProcedure();
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
        this.HCOService.updateHCOSubEntity(this.model.tp, "tps", async (err, data) => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
            this.initProcedures();
            window.WebCardinal.loader.hidden = true;
        });
    }

    updateProcedure(procedure) {
        let visitTp = this.model.tp.visits.filter(v => v.uuid === this.model.visit.uuid)[0];
        if(procedure === undefined) {
            let modifiedProcedures = this.model.procedures.map(procedure => (
                {
                    name: procedure.name,
                    id: procedure.id,
                    uuid:  procedure.uuid,
                    status: 'Completed',
                }));
            visitTp.procedures = modifiedProcedures;
        } else {
            let objIndex = this.model.procedures.findIndex((obj => obj.id == procedure.id));
            this.model.procedures[objIndex] = procedure;
            visitTp.procedures = this.model.procedures;
        }

        let obj = this.model.tp.visits.findIndex((obj => obj.uuid == visitTp.uuid));
        this.model.tp.visits[obj] = visitTp;
    }

    async initServices() {
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initHandlers();
        this.initProcedures();
    }

    initProcedures(makeCompleted) {
        this.model.tp = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        this.model.procedures = this.model.visit.procedures;
        if (!this.model.tp.visits || this.model.tp.visits.length < 1) {
            this.model.tp.visits = this.model.visits;
            this.updateTrialParticipant();

        } else {
            let visitTp = this.model.tp.visits.filter(v => v.uuid === this.model.visit.uuid)[0];

            if (visitTp) {
                this.model.procedures = visitTp.procedures;

            } else {
                this.model.tp.visits.push(this.model.visit);
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
            }
        });
    }

    attachHandlerSelect() {
        this.onTagClick('select-option', (model) => {
            if(model.statusList.value !== '') {
                let procedure = {
                    name: model.name,
                    id: model.id,
                    uuid: model.uuid,
                    status: model.statusList.value,
                }
                this.updateProcedure(procedure);
            }
        })
    }

    attachHandlerConfirm() {
        this.onTagClick('confirm-procedures', (model) => {
            let index = this.model.tp.visits.findIndex(visit => visit.uuid === this.model.visit.uuid);
            this.updateTrialParticipant(this.model.tp.visits[index]);
            this.navigateToPageTag('econsent-visits-procedures', {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                trialId: this.model.trialId,
                consentId:this.model.consentId,
                consentVersion: this.model.consentVersion,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        })
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
                },
            },
            shortDescription: Constants.MESSAGES.HCO.COMMUNICATION.TYPE.UPDATE_VISIT,
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
