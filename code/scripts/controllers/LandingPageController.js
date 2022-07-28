import TrialService from "../services/TrialService.js";
const {WebcController} = WebCardinal.controllers;
const commonServices = require("common-services");
const Constants = commonServices.Constants;
const {ResponsesService} = commonServices;
import TrialParticipantRepository from '../repositories/TrialParticipantRepository.js';
import HCOService from "../services/HCOService.js";
import DeviceAssignationService from "../services/DeviceAssignationService.js";
import {getNotificationsService} from "../services/NotificationsService.js";

const HealthDataService = commonServices.HealthDataService;
const healthDataService = new HealthDataService();

const {getCommunicationServiceInstance} = commonServices.CommunicationService;
const {getDidServiceInstance} = commonServices.DidService;
const MessageHandlerService = commonServices.MessageHandlerService;

const BaseRepository = commonServices.BaseRepository;
const SharedStorage = commonServices.SharedStorage;

// TODO: Landing Controller will listen to all messages: incoming trials, questionnaires, consent updates, withdraws and so on...
export default class LandingPageController extends WebcController {
    constructor(element, history) {
        super(element, history);
        this.model = this.getInitialModel();

        this.didService = getDidServiceInstance();
        this._attachMessageHandlers();
        this.initServices().then(() => {
            this.initHandlers();
        });

        this.notificationService = getNotificationsService();
        this.notificationService.onNotification(this.getNumberOfNotifications.bind(this));
        this.getNumberOfNotifications();
    }

    getNumberOfNotifications() {
        this.notificationService.getNumberOfUnreadNotifications().then(numberOfNotifications => {
            {
                if(numberOfNotifications) {
                    this.model.notificationsNumber = numberOfNotifications;
                    console.log('numberOfNotifications', numberOfNotifications);
                    this.model.hasNotifications = true;
                } else this.model.hasNotifications = false;
            }
        })
    }

    async initServices() {
        this.ResponsesService = new ResponsesService();
        this.TrialParticipantRepository = TrialParticipantRepository.getInstance(this.DSUStorage);

        this.TrialService = new TrialService();
        this.StorageService = SharedStorage.getSharedStorage(this.DSUStorage);
        this.DeviceAssignationService = new DeviceAssignationService();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        return this.model.hcoDSU;

    }

    initHandlers() {
        this.attachHandlerManageDevices();
        this.attachHandlerListOfPatients();
        this.attachHandlerVisits();
        this.attachHandlerEconsentTrialManagement();

    }

    _attachMessageHandlers() {
        this.CommunicationService = getCommunicationServiceInstance();
        MessageHandlerService.init(async (data) => {
            data = JSON.parse(data);

            await this.handleIotMessages(data);
            await this.handleEcoMessages(data);

        })
    }

    attachHandlerManageDevices() {
        this.onTagClick('navigation:iot-manage-devices', () => {
            this.navigateToPageTag('iot-manage-devices', {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    attachHandlerListOfPatients() {
        this.onTagClick('navigation:econsent-notifications', () => {
            this.navigateToPageTag('econsent-notifications', {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    attachHandlerVisits() {
        this.onTagClick('navigation:econsent-visits', () => {
            this.navigateToPageTag('econsent-visits', {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    attachHandlerEconsentTrialManagement() {
        this.onTagClick('navigation:econsent-trial-management', () => {
            this.navigateToPageTag('econsent-trial-management', {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    async handleIotMessages(data) {
        switch (data.operation) {
            case 'questionnaire-responses': {
                await this._saveNotification(data, 'New questionnaire update', 'view questions', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_SUBJECT_QUESTIONS);

                this.ResponsesService.mount(data.ssi, (err, data) => {
                    if (err) {
                        return console.log(err);
                    }
                    data.forEach(response => {
                        console.log(response);
                    })
                });
                break;
            }
        }
    }

    async handleEcoMessages(data) {

        console.log('MESSAGE' , data)
        let senderIdentity = data.senderIdentity;

        if (typeof senderIdentity === "undefined") {
            throw new Error("Sender identity is undefined. Did you forgot to add it?")
        }
        switch (data.operation) {

            case Constants.MESSAGES.HCO.ADD_CONSENT_VERSION: {
                await this._saveNotification(data, 'New ecosent version was added', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                this.HCOService.refreshSite(async ()=> {
                    await this.sendRefreshConsentsToTrialParticipants(data);
                });
                break;
            }
            case Constants.MESSAGES.HCO.ADD_CONSENT: {
                await this._saveNotification(data, 'New ecosent  was added', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                this.HCOService.refreshSite(async ()=>{
                    await this.sendRefreshConsentsToTrialParticipants(data);
                })
                break;
            }
            case Constants.MESSAGES.HCO.SITE_STATUS_CHANGED: {
                await this._saveNotification(data, 'The status of site was changed', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);

                break;
            }
            case Constants.MESSAGES.HCO.UPDATE_BASE_PROCEDURES: {
                await this._saveNotification(data, 'New procedure was added ', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                await this._saveVisit(data.ssi);
                break;
            }
            case Constants.MESSAGES.HCO.ADD_SITE: {

                await this._saveNotification(data, 'Your site was added to the trial ', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                const mountSiteAndUpdateEntity = new Promise((resolve => {
                    this.HCOService.mountSite(data.ssi, (err, site) => {
                        if (err) {
                            return console.log(err);
                        }
                        if (err) {
                            return console.log(err);
                        }

                        this.HCOService.mountTrial(site.trialSReadSSI, (err, trial) => {
                            if (err) {
                                return console.log(err);
                            }

                            this.HCOService.mountVisit(site.visitsSReadSSI, (err, visit) => {
                                if (err) {
                                    return console.log(err);
                                }
                                this.sendMessageToSponsor(senderIdentity, Constants.MESSAGES.HCO.SEND_HCO_DSU_TO_SPONSOR, {ssi: this.HCOService.ssi}, null);
                                resolve();
                            })
                        });
                    });
                }))
                await mountSiteAndUpdateEntity;
                break;
            }
            case Constants.MESSAGES.HCO.NEW_HEALTHDATA: {
                this._healthData(data);
                break;
            }
            case 'ask-question': {
                this._saveQuestion(data);
                break;
            }
            case Constants.MESSAGES.HCO.COMMUNICATION.TYPE.VISIT_RESPONSE: {
                await this._updateVisit(data);
                break;
            }
            case Constants.MESSAGES.HCO.ADD_TRIAl_CONSENT: {
                await this._saveNotification(data, 'New consent was added to trial  ', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                break;
            }
            case Constants.MESSAGES.HCO.UPDATE_ECOSENT: {
                await this._updateEconsentWithDetails(data);
                break;
            }
            case Constants.MESSAGES.PATIENT.SEND_TRIAL_CONSENT_DSU_TO_HCO: {
                this.HCOService.mountTC(data.ssi, (err, data) => {
                })
                break;
            }
            
        }
        await this._updateHcoDSU();
    }

    async sendRefreshConsentsToTrialParticipants(data) {
        //refresh hcoDSU
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        const site = this.model.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.uid) === data.ssi);
        return await new Promise((resolve) => {
            this.HCOService.cloneIFCs(data.ssi, async () => {
                this.model.hcoDSU = await this.HCOService.getOrCreateAsync();

                let ifcs = this.model.hcoDSU.volatile.ifcs || [];
                ifcs = ifcs.filter(ifc => ifc.genesisUid === data.econsentUid);

                this.TrialParticipantRepository.findAll((err, tps) => {
                    if (err) {
                        return console.log(err);
                    }

                    tps.filter(tp => tp.trialId === site.trialId).forEach((tp) => {
                        ifcs.forEach(econsent => {
                            this.sendMessageToPatient(tp, Constants.MESSAGES.HCO.SEND_REFRESH_CONSENTS_TO_PATIENT,
                                econsent.keySSI, null);
                        });
                        resolve();
                    })
                })
            });
        })
    }

    async _updateHcoDSU() {
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
    }

    async _healthData(data) {
        healthDataService.mountObservation(data.sReadSSI, (err, healthData) => {
            if (err) {
                console.log(err);
            }
            console.log("****************** Health Data ******************************")
            console.log(healthData);
            this.DeviceAssignationService.getAssignedDevices((err, devices) => {
                if (err) {
                    return console.log(err);
                }
                let assignedDevice = devices.find(device => device.deviceId === data.deviceId);
                
                if(!assignedDevice.healthDataIdentifier){
                    assignedDevice.healthDataIdentifier = [];
                }
                assignedDevice.healthDataIdentifier.push(healthData.uid);
                // console.log("****************** Assign Devices ******************************")
                // console.log(assignedDevice);
                this.DeviceAssignationService.updateAssignedDevice(assignedDevice, (err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            });
            if(healthData){
                console.log("We have successfully retrived data");
            }
            else {
                console.log("Your data is not available");
            }  
        });
    }

    async _updateEconsentWithDetails(message) {
        let tp;
        const consentSSI = message.ssi;
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        let econsent = this.model.hcoDSU.volatile.ifcs.find(ifc => ifc.keySSI === consentSSI)
        if (econsent === undefined) {
            return console.error('Cannot find econsent.');
        }
        let currentVersionIndex = econsent.versions.findIndex(eco => eco.version === message.useCaseSpecifics.version)
        if (currentVersionIndex === -1) {
            return console.log(`Version ${message.useCaseSpecifics.version} of the econsent ${consentSSI} does not exist.`)
        }
        let currentVersion = econsent.versions[currentVersionIndex]
        if (currentVersion.actions === undefined) {
            currentVersion.actions = [];
        }

        let actionNeeded = 'No action required';
        let status = Constants.TRIAL_PARTICIPANT_STATUS.SCREENED;
        let tpSigned = false;
        let tpObjectToAssign = {};
        let currentDate = new Date();
        switch (message.useCaseSpecifics.action.name) {
            case 'withdraw': {
                actionNeeded = 'TP Withdrawed';
                status = Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW;
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' withdraw', 'view trial participants', Constants.HCO_NOTIFICATIONS_TYPE.WITHDRAWS);
                tpObjectToAssign = {
                    actionNeeded,
                    status,
                    tpSigned,
                    withdrewDate: currentDate.toLocaleDateString()
                }
                break;
            }
            case 'withdraw-intention': {
                actionNeeded = 'Reconsent required';
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' withdraw', 'view trial participants', Constants.HCO_NOTIFICATIONS_TYPE.WITHDRAWS);
                status = Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW;
                tpObjectToAssign = {
                    actionNeeded,
                    status,
                    tpSigned,
                    withdrewDate: currentDate.toLocaleDateString()
                }
                break;
            }
            case 'Declined': {
                actionNeeded = 'TP Declined';
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' declined', 'view trial participants', Constants.HCO_NOTIFICATIONS_TYPE.WITHDRAWS);
                status = Constants.TRIAL_PARTICIPANT_STATUS.DECLINED;
                tpObjectToAssign = {
                    actionNeeded,
                    status,
                    tpSigned,
                    discontinuedDate: currentDate.toLocaleDateString()
                }
                break;
            }
            case 'sign': {
                tpSigned = true;
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' signed', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                actionNeeded = 'Acknowledgement required';
                status = Constants.TRIAL_PARTICIPANT_STATUS.SCREENED;
                tpObjectToAssign = {
                    tpSigned,
                    actionNeeded,
                    status,
                    screenedDate: currentDate.toLocaleDateString()
                }
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
            tp = this.model.hcoDSU.volatile.tps.find(tp => tp.did === message.useCaseSpecifics.tpDid)
            if (tp === undefined) {
                return console.error('Cannot find tp.');
            }
            Object.assign(tp, tpObjectToAssign);
            this.HCOService.updateHCOSubEntity(tp, "tps", async (err, response) => {
                if (err) {
                    return console.log(err);
                }
            });
        }

        econsent.versions[currentVersionIndex] = currentVersion;
        this.HCOService.updateHCOSubEntity(econsent, "ifcs", async (err, response) => {
            if (err) {
                return console.log(err);
            }
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        });

        const sites = this.model.toObject("hcoDSU.volatile.site");
        const site = sites.find(site => site.trialSReadSSI === tp.trialSReadSSI);
        this.sendMessageToSponsor(site.sponsorDid, Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
            ssi: tp.uid,
            consentSSI: consentSSI
        }, "Consent Changed");
    }

    sendMessageToPatient(trialParticipant, operation, ssi, shortMessage) {
        this.CommunicationService.sendMessage(trialParticipant.did, {
            operation: operation,
            ssi: ssi,
            useCaseSpecifics: {
                tpName: trialParticipant.name,
                did: trialParticipant.did,
                sponsorDid: trialParticipant.sponsorDid,
                trialSSI: ssi
            },
            shortDescription: shortMessage,
        });
    }

    sendMessageToSponsor(sponsorDid, operation, data, shortMessage) {
        this.CommunicationService.sendMessage(sponsorDid, {
            operation: operation,
            ...data,
            shortDescription: shortMessage,
        });
    }

    async _saveNotification(message, name, recommendedAction, notificationInfo) {

        console.log('notification message:', message)

        let notification = {
            ...message,
            recommendedAction: recommendedAction,
            ssi: message.ssi,
            viewed: false,
            read: false,
            date: Date.now(),
            name: name,
            type: notificationInfo.notificationTitle,
            tagPage: notificationInfo.tagPage,
            state: notificationInfo.state
        }

        return await this.notificationService.insertNotification(notification);
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

                    item.procedures.forEach((procedure) => {
                        procedure.consent.consentSSI = this.model.hcoDSU.volatile.site[0].consents.find((consent => consent.name === procedure.consent.name)).keySSI;
                    })

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
        this.QuestionsRepository.create(message.useCaseSpecifics.question.pk, message.useCaseSpecifics.question,async (err, data) => {
            if (err) {
                console.log(err);
            }
            let notification = message;

            await this._saveNotification(notification, message.shortDescription, 'view questions', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_SUBJECT_QUESTIONS);
        })
    }

    async _updateVisit(message) {

        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        const tpDSU = this.model.hcoDSU.volatile.tps.find(tp => tp.did === message.useCaseSpecifics.tpDid);
        let objIndex = tpDSU?.visits?.findIndex((visit => visit.uuid === message.useCaseSpecifics.visit.id));

        tpDSU.visits[objIndex].accepted = message.useCaseSpecifics.visit.accepted;
        tpDSU.visits[objIndex].declined = message.useCaseSpecifics.visit.declined;
        tpDSU.visits[objIndex].rescheduled = message.useCaseSpecifics.visit.rescheduled;
        tpDSU.visits[objIndex].proposedDate = message.useCaseSpecifics.visit.proposedDate;

        tpDSU.visits[objIndex].confirmedDate = message.useCaseSpecifics.visit.confirmedDate;

        this.HCOService.updateHCOSubEntity(tpDSU, "tps", async (err, data) => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
            let notification = message;
            notification.tpUid = data.uid;
            await this._saveNotification(notification, message.shortDescription, 'view visits', Constants.HCO_NOTIFICATIONS_TYPE.MILESTONES_REMINDERS);
        });

    }

    getInitialModel() {
        return {
            breadcrumb: [{
                label: "Dashboard",
                tag: "home",
                state: {}
            }]
        };
    }


}