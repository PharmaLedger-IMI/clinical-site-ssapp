import TrialService from "../services/TrialService.js";

const {WebcController} = WebCardinal.controllers;
const commonServices = require("common-services");
const Constants = commonServices.Constants;
const CommunicationService = commonServices.CommunicationService;
import ResponsesService from '../services/ResponsesService.js';
import TrialParticipantRepository from '../repositories/TrialParticipantRepository.js';
import TrialRepository from '../repositories/TrialRepository.js';
import SiteService from "../services/SiteService.js";
import HCOService from "../services/HCOService.js";

const DIDService = commonServices.DIDService;
const BaseRepository = commonServices.BaseRepository;
const SharedStorage = commonServices.SharedStorage;

// TODO: Landing Controller will listen to all messages: incoming trials, questionnaires, consent updates, withdraws and so on...
export default class LandingPageController extends WebcController {
    constructor(element, history) {
        super(element, history);
        this.model = {};
        this.initServices();
        this.initHandlers();
    }

    async initServices() {
        this.model.did = await DIDService.getDidAsync(this);
        this.ResponsesService = new ResponsesService(this.DSUStorage);
        this.TrialParticipantRepository = TrialParticipantRepository.getInstance(this.DSUStorage);
        //this.TrialRepository = TrialRepository.getInstance(this.DSUStorage);

        this.TrialService = new TrialService();
        this.StorageService = SharedStorage.getInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS);
        this.SiteService = new SiteService();
        this.CommunicationService = await DIDService.getCommunicationServiceInstanceAsync(this);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.attachDidMessagesListener();

    }

    initHandlers() {
        this.attachHandlerManageDevices();
        this.attachHandlerTrialManagement();
        this.attachHandlerListOfPatients();
        this.attachHandlerVisits();
        this.attachHandlerEconsentTrialManagement();
    }

    attachDidMessagesListener() {
        this.CommunicationService.listenForMessages(async (err, data) => {
            if (err) {
                return console.error(err);
            }
            switch (data.domain) {
                case 'iot': {
                    await this.handleIotMessages(data);
                    break;
                }
                case 'eco': {
                    await this.handleEcoMessages(data);
                    break;
                }
            }
        });
    }

    attachHandlerManageDevices() {
        this.onTagClick('navigation:iot-manage-devices', () => {
            this.navigateToPageTag('iot-manage-devices');
        });
    }

    attachHandlerTrialManagement() {
        this.onTagClick('navigation:trial-management', () => {
            this.navigateToPageTag('trial-management');
        });
    }

    attachHandlerListOfPatients() {
        this.onTagClick('navigation:econsent-notifications', () => {
            this.navigateToPageTag('econsent-notifications');
        });
    }

    attachHandlerVisits() {
        this.onTagClick('navigation:econsent-visits', () => {
            this.navigateToPageTag('econsent-visits');
        });
    }

    attachHandlerEconsentTrialManagement() {
        this.onTagClick('navigation:econsent-trial-management', () => {
            this.navigateToPageTag('econsent-trial-management');
        });
    }

    attachHandlerPatients() {
        this.onTagEvent('navigation:econsent-patients-list', () => {
            this.navigateToPageTag('econsent-patients-list');
        });
    }

    async handleIotMessages(data) {
        switch (data.message.operation) {
            case 'questionnaire-response': {
                console.log('Received message', data.message);
                this.ResponsesService.mount(data.message.ssi, (err, data) => {
                    if (err) {
                        return console.log(err);
                    }
                    this.ResponsesService.getResponses((err, data) => {
                        if (err) {
                            return console.log(err);
                        }
                        console.log('ProfessionalSSAPPHomeController');
                        data.forEach(response => {
                            response.item.forEach(item => {
                                console.log(item.answer[0], item.linkId, item.text)
                            })
                        })
                    })
                });
                break;
            }
        }
    }

    async handleEcoMessages(data) {
        switch (data.did) {
            case CommunicationService.identities.ECO.HCO_IDENTITY.did: {
                switch (data.message.operation) {
                    case 'add-trial-subject': {
                        let useCaseSpecifics = data.message.useCaseSpecifics;
                        let trial = useCaseSpecifics.trial;
                        let participant = useCaseSpecifics.participant;
                        let trials = await this.TrialRepository.filterAsync(`id == ${trial.id}`, 'ascending', 30);
                        if (trials.length === 0) {
                            await this.TrialRepository.createAsync(trial);
                        }
                        participant.trialId = trial.id;
                        await this.TrialParticipantRepository.createAsync(participant);
                        break;
                    }
                }
                break;
            }
        }


        let senderIdentity = {
            did: data.did,
            domain: data.domain
        }
        switch (data.message.operation) {
            case Constants.MESSAGES.HCO.ADD_CONSENT_VERSION: {
                this._saveNotification(data.message, 'New ecosent version was added', 'view trial', Constants.NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                await this._reMountTrialAndSendRefreshMessageToAllParticipants(data);
                break;
            }
            case Constants.MESSAGES.HCO.ADD_CONSENT: {
                this._saveNotification(data.message, 'New ecosent  was added', 'view trial', Constants.NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                await this._reMountTrialAndSendRefreshMessageToAllParticipants(data);
                break;
            }
            case Constants.MESSAGES.HCO.SITE_STATUS_CHANGED: {
                this._refreshSite(data.message);
                this._saveNotification(data.message, 'The status of site was changed', 'view trial', Constants.NOTIFICATIONS_TYPE.TRIAL_UPDATES);

                break;
            }
            case Constants.MESSAGES.HCO.UPDATE_BASE_PROCEDURES: {
                this._saveNotification(data.message, 'New procedure was added ', 'view trial', Constants.NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                this._saveVisit(data.message.ssi);
                break;
            }
            case Constants.MESSAGES.HCO.ADD_SITE: {

                this._saveNotification(data.message, 'Your site was added to the trial ', 'view trial', Constants.NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                const mountSiteAndUpdateEntity = new Promise((resolve => {
                    this.HCOService.mountSite(data.message.ssi, (err, site) => {
                        if (err) {
                            return console.log(err);
                        }
                        site.sponsorIdentity = senderIdentity;
                        this.HCOService.updateEntity(site, (err, updatedSite) => {
                            if (err) {
                                return console.log(err);
                            }
                            this.HCOService.mountTrial(site.trialKeySSI, (err, trial) => {
                                if (err) {
                                    return console.log(err);
                                }
                                this.HCOService.mountVisit(site.visitsKeySSI, (err, visit) => {
                                    if (err) {
                                        return console.log(err);
                                    }
                                    this.sendMessageToSponsor(senderIdentity, Constants.MESSAGES.HCO.SEND_HCO_DSU_TO_SPONSOR, this.HCOService.ssi, null);
                                    resolve();
                                })
                            });
                        });
                    });
                }))
                await mountSiteAndUpdateEntity;
                break;
            }
            case 'ask-question': {
                this._saveQuestion(data.message);
                break;
            }
            case Constants.MESSAGES.HCO.COMMUNICATION.TYPE.VISIT_RESPONSE: {
                this._updateVisit(data.message);
                break;
            }
            case Constants.MESSAGES.HCO.ADD_TRIAl_CONSENT: {
                this._saveNotification(data.message, 'New consent was added to trial  ', 'view trial', Constants.NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                break;
            }
            case Constants.MESSAGES.HCO.UPDATE_ECOSENT: {
                this._updateEconsentWithDetails(data.message);
                break;
            }
            case Constants.MESSAGES.PATIENT.SEND_TRIAL_CONSENT_DSU_TO_HCO: {
                this.HCOService.mountTC(data.message.ssi, (err, data) => {
                })
                break;
            }
        }
        await this._updateHcoDSU();


    }


    _reMountTrialAndSendRefreshMessageToAllParticipants(data) {
        //TODO change it to async function
        return new Promise((resolve => {
            this.HCOService.cloneIFCs(data.message.trialSSI, async () => {
                this.model.hcoDSU = await this.HCOService.getOrCreateAsync();

                this.TrialParticipantRepository.findAll((err, tps) => {
                    if (err) {
                        return console.log(err);
                    }
                    tps.forEach(tp => this.sendMessageToPatient(tp,
                        Constants.MESSAGES.HCO.SEND_REFRESH_CONSENTS_TO_PATIENT, data.message.ssi, null))
                    resolve();
                })
            });
        }))
    }

    async _updateHcoDSU() {
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
    }

    _refreshSite(message) {
        this.SiteService.mountSite(message.data.site, (err, site) => {
            if (err) {
                return console.log(err);
            }
        });
    }

    _updateEconsentWithDetails(message) {
        let econsent = this.model.hcoDSU.volatile.icfs.find(ifc => ifc.genesisSSI === message.ssi)
        if (econsent === undefined) {
            return console.error('Cannot find econsent.');
        }
        let currentVersionIndex = econsent.versions.findIndex(eco => eco.version === message.useCaseSpecifics.version)
        if (currentVersionIndex === -1) {
            return console.log(`Version ${message.useCaseSpecifics.version} of the econsent ${message.ssi} does not exist.`)
        }
        let currentVersion = econsent.versions[currentVersionIndex]
        if (currentVersion.actions === undefined) {
            currentVersion.actions = [];
        }

        let actionNeeded = 'No action required';
        let status = Constants.TRIAL_PARTICIPANT_STATUS.SCREENED;
        let tpSigned = false;
        switch (message.useCaseSpecifics.action.name) {
            case 'withdraw': {
                actionNeeded = 'TP Withdrawed';
                status = Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW;
                this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' withdraw', 'view trial participants', Constants.NOTIFICATIONS_TYPE.WITHDRAWS);
                break;
            }
            case 'withdraw-intention': {
                actionNeeded = 'Reconsent required';
                this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' withdraw', 'view trial participants', Constants.NOTIFICATIONS_TYPE.WITHDRAWS);
                status = Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW;
                break;
            }
            case 'Declined': {
                actionNeeded = 'TP Declined';
                this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' declined', 'view trial participants', Constants.NOTIFICATIONS_TYPE.WITHDRAWS);
                status = Constants.TRIAL_PARTICIPANT_STATUS.DECLINED;
                break;
            }
            case 'sign': {
                tpSigned = true;
                this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' signed', 'view trial', Constants.NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                actionNeeded = 'Acknowledgement required';
                status = Constants.TRIAL_PARTICIPANT_STATUS.SCREENED;
                break;
            }
        }

        currentVersion.actions.push({
            ...message.useCaseSpecifics.action,
            tpDid: message.useCaseSpecifics.tpDid,
            status: status,
            type: 'tp',
            actionNeeded: actionNeeded
        });

        if (this.model.hcoDSU.volatile.tps) {
            let tp = this.model.hcoDSU.volatile.tps.find(tp => tp.did === message.useCaseSpecifics.tpDid)
            if (tp === undefined) {
                return console.error('Cannot find tp.');
            }
            tp.actionNeeded = actionNeeded;
            tp.tpSigned = tpSigned;
            tp.status = status;
            this.HCOService.updateEntity(tp, {}, async (err, response) => {
                if (err) {
                    return console.log(err);
                }
            });
        }

        econsent.uid = econsent.keySSI;
        econsent.versions[currentVersionIndex] = currentVersion;
        this.HCOService.updateEntity(econsent, {}, async (err, response) => {
            if (err) {
                return console.log(err);
            }
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        });
    }

    sendMessageToPatient(trialParticipant, operation, ssi, shortMessage) {
        this.CommunicationService.sendMessage(trialParticipant.did, {
            operation: operation,
            ssi: ssi,
            useCaseSpecifics: {
                tpName: trialParticipant.name,
                did: trialParticipant.did,
                sponsorIdentity: trialParticipant.sponsorIdentity,
                trialSSI: ssi
            },
            shortDescription: shortMessage,
        });
    }

    sendMessageToSponsor(sponsorIdentity, operation, ssi, shortMessage) {
        this.CommunicationService.sendMessage(sponsorIdentity, {
            operation: operation,
            ssi: ssi,
            shortDescription: shortMessage,
        });
    }


    _saveNotification(notification, name, reccomendedAction, type) {
        notification.type = type;
        notification.name = name;
        notification.recommendedAction = reccomendedAction;
        this.NotificationsRepository.create(notification, (err, data) => {
            if (err) {
                return console.error(err);
            }
        });
    }

    async _saveVisit(message) {
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.model.hcoDSU.volatile.visit.forEach(visit => {
            // TODO: Refactor this structure in sponsor ssapp
            if (visit.visits && visit.visits.visits) {
                visit.visits.visits.forEach(item => {

                    let visitToBeAdded = {
                        name: item.name,
                        procedures: item.procedures,
                        uuid: item.uuid,
                        visitWindow: item.visitWindow,
                        trialSSI: message,
                        consentsSSI: []
                    }

                    //visitToBeAdded.consentsSSI.push(consent.keySSI);
                    let weaksFrom = item.weeks?.filter(weak => weak.type === 'weekFrom' || weak.type === 'week');
                    if (weaksFrom)
                        visitToBeAdded.weakFrom = weaksFrom[0]?.value;
                    let weaksTo = item.weeks?.filter(weak => weak.type === 'weekTo');
                    if (weaksTo)
                        visitToBeAdded.weakTo = weaksTo[0]?.value;

                    let plus = item.visitWindow?.filter(weak => weak.type === 'windowFrom');
                    if (plus)
                        visitToBeAdded.plus = plus[0]?.value;
                    let minus = item.visitWindow?.filter(weak => weak.type === 'windowTo');
                    if (plus)
                        visitToBeAdded.minus = minus[0]?.value;
                    this.VisitsAndProceduresRepository.findBy(visitToBeAdded.uuid, (err, existingVisit) => {
                        if (err || !existingVisit) {

                            this.VisitsAndProceduresRepository.create(visitToBeAdded.uuid, visitToBeAdded, (err, visitCreated) => {
                                if (err) {
                                    return console.error(err);
                                }
                            })
                        } else if (existingVisit) {
                            //visitToBeAdded.consentsSSI.push(existingVisit.consentsSSI);
                            visitToBeAdded.procedures.push(existingVisit.procedures);

                            this.VisitsAndProceduresRepository.update(visitToBeAdded.uuid, visitToBeAdded, (err, visitCreated) => {
                                if (err) {
                                    return console.error(err);
                                }
                            })
                        }
                    })

                })
            }
        })
    }

    _saveQuestion(message) {
        this.QuestionsRepository.create(message.useCaseSpecifics.question.pk, message.useCaseSpecifics.question, (err, data) => {
            if (err) {
                console.log(err);
            }
            let notification = message;

            this._saveNotification(notification, message.shortDescription, 'view questions', Constants.NOTIFICATIONS_TYPE.TRIAL_SUBJECT_QUESTIONS);
        })
    }

    _updateVisit(message) {
        this.TrialParticipantRepository.filter(`did == ${message.useCaseSpecifics.tpDid}`, 'ascending', 30, (err, tps) => {
            if (err) {
                console.log(err);
            }
            let tp = tps[0];
            let objIndex = tp?.visits?.findIndex((obj => obj.uuid == message.useCaseSpecifics.visit.id));
            tp.visits[objIndex].accepted = message.useCaseSpecifics.visit.accepted;
            tp.visits[objIndex].declined = message.useCaseSpecifics.visit.declined;

            this.TrialParticipantRepository.update(tp.uid, tp, (err, data) => {
                if (err) {
                    console.log(err);
                }

                let notification = message;
                notification.tpUid = data.uid;
                this._saveNotification(notification, message.shortDescription, 'view visits', Constants.NOTIFICATIONS_TYPE.MILESTONES_REMINDERS);
            })


        });
    }


    // async attachHandlerListOfPatients() {
    //     this.onTagClick('home:list-of-patients', () => {
    //         this.IotAdaptorApi = new IotAdaptorApi();
    //         let observations = [];
    //         this.IotAdaptorApi.searchResource("Observation", function (err, result) {
    //             result.forEach(value => {
    //                 let initData = {
    //                     name: value.code.text,
    //                     value: value.valueQuantity.value,
    //                     unit: value.valueQuantity.unit
    //                 };
    //                 observations.push(initData);
    //             });
    //         });
    //
    //         this.navigateToPageTag('patient-status', {allData: observations});
    //     });
    // }


}