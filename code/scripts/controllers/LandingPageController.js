import TrialParticipantRepository from '../repositories/TrialParticipantRepository.js';
import HCOService from "../services/HCOService.js";
import DeviceAssignationService from "../services/DeviceAssignationService.js";
import {getNotificationsService} from "../services/NotificationsService.js";

const {WebcController} = WebCardinal.controllers;
const commonServices = require("common-services");
const ConsentStatusMapper = commonServices.ConsentStatusMapper;
const Constants = commonServices.Constants;
const {ResponsesService} = commonServices;
const momentService  = commonServices.momentService;

const HealthDataService = commonServices.HealthDataService;
const healthDataService = new HealthDataService();

const {getCommunicationServiceInstance} = commonServices.CommunicationService;
const {getDidServiceInstance} = commonServices.DidService;
const MessageHandlerService = commonServices.MessageHandlerService;
const JWTService = commonServices.JWTService;
const BaseRepository = commonServices.BaseRepository;
const SharedStorage = commonServices.SharedStorage;

// TODO: Landing Controller will listen to all messages: incoming trials, questionnaires, consent updates, withdraws and so on...
export default class LandingPageController extends WebcController {
    constructor(element, history) {
        super(element, history);
        this.model = this.getInitialModel();

        this.didService = getDidServiceInstance();

        this.model.publicDidReady = false;
        this.CommunicationService = getCommunicationServiceInstance();
        this.CommunicationService.onPrimaryDidReady((err, didDocument)=>{

            if(err){
                throw err;
            }
            this.model.publicDidReady = true;
        })

        this._attachMessageHandlers();
        this.initHandlers();
        this.initServices();

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

        this.StorageService = SharedStorage.getSharedStorage(this.DSUStorage);
        this.DeviceAssignationService = new DeviceAssignationService();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
        this.VisitsAndProceduresRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.VISITS);
        this.HCOService = new HCOService();
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        return this.hcoDSU;

    }

    initHandlers() {
        const pageHandlers = [
            {eventTag: "navigation:iot-manage-devices", pageTag: "iot-manage-devices"},
            {eventTag: "navigation:econsent-notifications", pageTag: "econsent-notifications"},
            {eventTag: "navigation:econsent-trial-management", pageTag: "econsent-trial-management"}
        ];

        pageHandlers.forEach(pageHandler => {
            this.onTagClick(pageHandler.eventTag, () => {
                this.navigateToPageTag(pageHandler.pageTag, {breadcrumb: this.model.toObject('breadcrumb')});
            })
        })

    }

    _attachMessageHandlers() {
        MessageHandlerService.init(async (data) => {
            data = JSON.parse(data);

            await this.handleIotMessages(data);
            await this.handleEcoMessages(data);

        })
    }

    async handleIotMessages(data) {
        switch (data.operation) {
            case Constants.MESSAGES.PATIENT.QUESTIONNAIRE_RESPONSE: {
                this.ResponsesService.mount(data.ssi, async (err, qs) => {
                    if (err) {
                        return console.log(err);
                    }
                    this.hcoDSU = await this.HCOService.getOrCreateAsync();
                    const patientDID = qs.questionResponses[0].patientDID;
                    const tp = this.hcoDSU.volatile.tps.find(tp => tp.did === patientDID);
                    const trialUid = this.HCOService.getAnchorId(tp.trialSReadSSI);
                    let patientName;
                    const tps = await this.TrialParticipantRepository.filterAsync(`did == ${patientDID}`, 'ascending', 30)
                    if (tps.length > 0) {
                        patientName = tps[0].name;
                    }

                    let notificationInfo = {
                        ...Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_SUBJECT_QUESTIONNAIRE_RESPONSES,
                        state: {
                            participantDID: patientDID,
                            trialSSI: trialUid,
                            patientName: patientName
                        }
                    }
                    await this._saveNotification(data, `New questionnaire response from patient ${patientName} <${tp.number}>`, 'View responses', notificationInfo);
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
        window.WebCardinal.loader.hidden = false;

        switch (data.operation) {

            case Constants.MESSAGES.PATIENT.TP_CONTACT_DATA: {
                await this._saveNotification(data, data.shortDescription, 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                await this.updateTpContactData(data);
                break;
            }

            case Constants.MESSAGES.PATIENT.TP_IS_UNAVAILABLE:{
                await this._saveNotification(data, 'TP is unavailable', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                await this.markTpAsUnavailable(data);
                break;
            }

            case Constants.MESSAGES.HCO.ADD_CONSENT_VERSION: {
                await this._saveNotification(data, 'New econsent version was added', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                this.HCOService.refreshSite(async ()=> {
                    await this.sendRefreshConsentsToTrialParticipants(data);
                });
                break;
            }
            case Constants.MESSAGES.HCO.ADD_CONSENT: {
                await this._saveNotification(data, 'New econsent  was added', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES);
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
            case Constants.MESSAGES.HCO.COMMUNICATION.TYPE.VISIT_RESPONSE: {
                await this._updateVisit(data);
                break;
            }
            case Constants.MESSAGES.HCO.ADD_TRIAl_CONSENT: {
                await this._saveNotification(data, 'New consent was added to trial  ', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES);
                break;
            }
            case Constants.MESSAGES.HCO.UPDATE_ECONSENT: {
                await this._updateEconsentWithDetails(data);
                break;
            }
            case Constants.MESSAGES.PATIENT.SEND_TRIAL_CONSENT_DSU_TO_HCO: {
                this.HCOService.mountTC(data.ssi, (err, data) => {
                })
                break;
            }

        }
        window.WebCardinal.loader.hidden = true;
        await this._updateHcoDSU();
    }

    async updateTpContactData(message) {
        try {
            const profileData = await this.HCOService.readDsuDataAsync(message.ssi);
            let tp;
            const tps = await this.TrialParticipantRepository.filterAsync(`did == ${message.tpDid}`, 'ascending', 30)
            if (tps.length > 0) {
                tp = tps[0];
            }
            tp.contactData = {
                emailAddress: profileData.emailAddress,
                phoneNumber: profileData.phoneNumber
            };
            this.TrialParticipantRepository.updateAsync(tp.pk, tp);
        } catch (e) {
            console.error(e);
        }
    }

    async markTpAsUnavailable(data) {
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        if (this.hcoDSU.volatile.tps) {

            const JWTServiceInstance = new JWTService();
            const {verifyCredentialStatus} = await JWTServiceInstance.verifyCredential(data.anonymousDIDVc);
            const anonymizedDID = verifyCredentialStatus.vc.credentialSubject.anonymizedDID;
            let tp = this.hcoDSU.volatile.tps.find(tp => tp.did === anonymizedDID);
            tp.status = Constants.TRIAL_PARTICIPANT_STATUS.UNAVAILABLE;
            this.HCOService.updateHCOSubEntity(tp, "tps", async (err, response) => {
                if (err) {
                    return console.log(err);
                }
            });
        }
    }

    async sendRefreshConsentsToTrialParticipants(data) {
        //refresh hcoDSU
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        const site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.uid) === data.ssi);
        let loader = window.WebCardinal.loader
        loader.hidden = false;
        let promisesArr = [];

        this.TrialParticipantRepository.findAll(async (err, tps) => {
            if (err) {
                return console.log(err);
            }

            let counter = 0;

            tps = tps.filter(tp => tp.trialId === site.trialId);

            let nrOfTps = tps.length;

            const cloneIFCs = (tps, callback) => {
                if (tps.length === 0) {
                    return callback();
                }

                let tp = tps.shift();
                let percentage = Math.floor((counter * 100) / nrOfTps) + '%';
                let message = `Updating inform consents. Please wait... ${percentage}`;
                loader.setAttribute("data-value", message);

                this.HCOService.cloneIFCs(data.ssi, tp.pk, (err) => {
                    if (err) {
                        return console.error(err);
                    }

                    counter = counter + 1;

                    if (tps.length > 0) {
                        return cloneIFCs(tps, callback);
                    }

                    loader.setAttribute("data-value", "Update successfully completed");
                    loader.setAttribute("completed","");
                    setTimeout(() => {
                        loader.removeAttribute("data-value");
                        loader.removeAttribute("completed");
                        loader.hidden = true;
                    } ,2000)
                    callback();
                });
            }

            cloneIFCs([...tps], async () => {
                if (tps.length === 0) {
                    return loader.hidden = true;
                }
                this.hcoDSU = await this.HCOService.getOrCreateAsync();
                let ifcs = this.hcoDSU.volatile.ifcs || [];
                tps.forEach(tp => {
                    let tpIfcs = ifcs.filter(ifc => ifc.genesisUid === data.econsentUid && ifc.tpUid === tp.pk);

                    let promise = new Promise((resolve) => {
                        tpIfcs.forEach(econsent => {
                            this.sendMessageToPatient(tp, Constants.MESSAGES.HCO.SEND_REFRESH_CONSENTS_TO_PATIENT,
                                econsent.keySSI, null);
                        });

                        const consentsKeySSIs = tpIfcs.map(econsent => econsent.keySSI);
                        this.sendMessageToSponsor(site.sponsorDid, Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
                            ssi: tp.uid,
                            consentsKeySSIs
                        }, "Consent Changed");
                        resolve();
                    })
                    promisesArr.push(promise);
                })
            })
            await Promise.allSettled(promisesArr);
        })
    }

    async _updateHcoDSU() {
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
    }

    async _healthData(data) {
        healthDataService.mountObservation(data.sReadSSI, (err, healthData) => {
            if (err) {
                console.log(err);
            }

            this.DeviceAssignationService.getAssignedDevices((err, devices) => {
                if (err) {
                    return console.log(err);
                }
                let assignedDevice = devices.find(device => device.deviceId === data.deviceId);

                console.log(assignedDevice.healthDataIdentifiers)
                if(!assignedDevice.healthDataIdentifiers){
                    assignedDevice.healthDataIdentifiers = [];
                }
                assignedDevice.healthDataIdentifiers.push(healthData.uid);
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
        let tpDSU, tpRecord;
        this.hcoDSU = await this.HCOService.getOrCreateAsync();

        tpDSU = this.hcoDSU.volatile.tps.find(tp => tp.did === message.useCaseSpecifics.tpDid)
        if (!tpDSU) {
            return console.error('Cannot find tp.');
        }

        const tps = await this.TrialParticipantRepository.filterAsync(`did == ${tpDSU.did}`, 'ascending', 30)
        tpRecord = tps[0];

        const consentSSI = message.ssi;
        let econsent = this.hcoDSU.volatile.ifcs.find(ifc => ifc.keySSI === consentSSI && ifc.tpUid === tpRecord.pk )
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
        let statusUpdateDetails = {};
        let currentDate = new Date();
        switch (message.useCaseSpecifics.action.name) {
            case ConsentStatusMapper.consentStatuses.withdraw.name: {
                actionNeeded = 'TP Withdrawn';
                status = Constants.TRIAL_PARTICIPANT_STATUS.TP_WITHDRAWN;
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' withdraw', 'view trial participants', Constants.HCO_NOTIFICATIONS_TYPE.WITHDRAWS);
                statusUpdateDetails = {
                    actionNeeded,
                    status,
                    tpSigned,
                    withdrewDate: currentDate.toLocaleDateString()
                }
                break;
            }
            case ConsentStatusMapper.consentStatuses.decline.name: {
                actionNeeded = 'TP Declined';
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' declined', 'view trial participants', Constants.HCO_NOTIFICATIONS_TYPE.WITHDRAWS);
                status = currentVersionIndex > 0? Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED : Constants.TRIAL_PARTICIPANT_STATUS.SCREEN_FAILED;
                statusUpdateDetails = {
                    actionNeeded,
                    status,
                    tpSigned,
                    discontinuedDate: currentDate.toLocaleDateString()
                }
                break;
            }
            case ConsentStatusMapper.consentStatuses.signed.name: {
                tpSigned = true;
                await this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' signed', 'view trial', Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                actionNeeded = 'Acknowledgement required';
                if(tpDSU.status === Constants.TRIAL_PARTICIPANT_STATUS.PLANNED) {
                    status =  Constants.TRIAL_PARTICIPANT_STATUS.SCREENED;
                }

                statusUpdateDetails = {
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

        Object.assign(tpDSU, statusUpdateDetails);
        Object.assign(tpRecord, statusUpdateDetails);
        this.HCOService.updateHCOSubEntity(tpDSU, "tps", async (err) => {
            if (err) {
                return console.log(err);
            }

            econsent.versions[currentVersionIndex] = currentVersion;
            this.HCOService.updateHCOSubEntity(econsent, "ifcs/" + tpRecord.pk, (err) => {
                if (err) {
                    return console.log(err);
                }

                this.TrialParticipantRepository.update(tpRecord.pk, tpRecord, async (err) => {
                    if (err) {
                        return console.log(err);
                    }

                    this.hcoDSU = await this.HCOService.getOrCreateAsync();

                    const sites = this.hcoDSU.volatile.site;
                    const site = sites.find(site => site.trialSReadSSI === tpDSU.trialSReadSSI);

                    this.CommunicationService.sendMessage(tpRecord.did, {
                        status: status,
                        operation: Constants.MESSAGES.HCO.UPDATE_STATUS
                    });

                    this.sendMessageToSponsor(site.sponsorDid, Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
                        ssi: tpRecord.pk,
                        consentsKeySSIs: [econsent.uid]
                    }, "Consent Changed");

                });
            });

        });
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
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.hcoDSU.volatile.visit.forEach(visit => {
            // TODO: Refactor this structure in sponsor ssapp
            if (visit.visits && visit.visits.visits) {
                visit.visits.visits.forEach(item => {

                    let visitToBeAdded = {
                        name: item.name,
                        procedures: item.procedures,
                        uuid: item.uuid,
                        visitWindow: item.visitWindow,
                        trialSSI: message,
                    };

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
                        const site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.HCOService.getAnchorId(trialSSI));
                        procedure.consent.consentSSI = site.consents.find((consent => consent.name === procedure.consent.name)).keySSI;
                    });

                    this.VisitsAndProceduresRepository.findBy(visitToBeAdded.uuid, (err, existingVisit) => {
                        if (err || !existingVisit) {

                            this.VisitsAndProceduresRepository.create(visitToBeAdded.uuid, visitToBeAdded, (err, visitCreated) => {
                                if (err) {
                                    return console.error(err);
                                }
                            })
                        } else if (existingVisit) {
                            visitToBeAdded.procedures.push(existingVisit.procedures);

                            this.VisitsAndProceduresRepository.update(visitToBeAdded.uuid, visitToBeAdded, (err, visitCreated) => {
                                if (err) {
                                    return console.error(err);
                                }
                            });
                        }
                    });
                });
            }
        });
    }

    sendVisitToPatient(trialParticipantDid, visit, operation) {
        this.CommunicationService.sendMessage(trialParticipantDid, {
            operation: Constants.MESSAGES.HCO.VISIT_CONFIRMED,
            useCaseSpecifics: {
                tpDid: trialParticipantDid,
                visit: {
                    confirmed: visit.confirmed,
                    confirmedDate: visit.confirmedDate,
                    procedures: visit.procedures,
                    name: visit.name,
                    uid: visit.uuid,
                    id: visit.id,
                    proposedDate: visit.proposedDate,
                    suggestedInterval: visit.suggestedInterval
                },
            },
            shortDescription: operation
        });
    }

    async _updateVisit(message) {

        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        const tpDSU = this.hcoDSU.volatile.tps.find(tp => tp.did === message.useCaseSpecifics.tpDid);
        let objIndex = tpDSU?.visits?.findIndex((visit => visit.uuid === message.useCaseSpecifics.visit.id));

        tpDSU.visits[objIndex].accepted = message.useCaseSpecifics.visit.accepted;
        tpDSU.visits[objIndex].declined = message.useCaseSpecifics.visit.declined;
        tpDSU.visits[objIndex].rescheduled = message.useCaseSpecifics.visit.rescheduled;
        tpDSU.visits[objIndex].proposedDate = message.useCaseSpecifics.visit.proposedDate;

        tpDSU.visits[objIndex].confirmedDate = message.useCaseSpecifics.visit.confirmedDate;

        console.log('message', message);

        let visit = message.useCaseSpecifics.visit;

        if(visit.accepted) {
            tpDSU.visits[objIndex].confirmed = true;
            tpDSU.visits[objIndex].hcoRescheduled = false;
            tpDSU.visits[objIndex].confirmedDate = momentService(visit.proposedDate).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);

            this.sendVisitToPatient(message.useCaseSpecifics.tpDid, tpDSU.visits[objIndex],Constants.MESSAGES.HCO.VISIT_CONFIRMED);
        }

        if(visit.rescheduled || visit.declined) {
            tpDSU.actionNeeded = Constants.TP_ACTIONNEEDED_NOTIFICATIONS.TP_VISIT_RESCHEDULED;
        }

        this.HCOService.updateHCOSubEntity(tpDSU, "tps", async (err, data) => {
            this.hcoDSU = await this.HCOService.getOrCreateAsync();
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