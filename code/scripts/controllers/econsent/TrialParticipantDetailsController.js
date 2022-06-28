import HCOService from "../../services/HCOService.js";
import TrialService from '../../services/TrialService.js';

const commonServices = require("common-services");
const Constants = commonServices.Constants;

const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();

let getInitModel = () => {
    return {
        trial: {},
        trialParticipants: [],
    };
};

export default class TrialParticipantDetailsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            ...this.history.win.history.state.state,
            consentsSigned: [],
            userActionsToShow: []
        });


        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Status - Trial Participant Details",
                tag: "econsent-trial-participant-details"
            }
        );

        this._initServices().then(() => {
            this.model.dataSourceInitialized = true;

            let tableData = [];
            let dataObject = {
                consentsSigned: this.model.consentsSigned,
                lastBadAction: this.model.lastBadAction,
                userActionsToShow: this.model.userActionsToShow,
            }
            tableData.push(dataObject);
            this.model.participantDetailsDataSource = DataSourceFactory.createDataSource(1, 4, tableData);
        });
        this._initHandlers();
    }

    async _initServices() {
        this.TrialService = new TrialService();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        await this._initTrialParticipant(this.model.trialUid);
    }

    _initHandlers() {
        this._attachHandlerChangeStatus();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    async _initTrialParticipant(keySSI) {
        let trialParticipant = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        let nonObfuscatedTps = await this.TrialParticipantRepository.filterAsync(`did == ${trialParticipant.did}`);
        if (nonObfuscatedTps.length > 0) {
            trialParticipant.name = nonObfuscatedTps[0].name;
        }
        this.model.trialParticipant = trialParticipant;

        let userActions = await this._getUserActionsFromEconsents(keySSI, this.model.trialParticipant.did);
        userActions = userActions.filter(ua => ua.action.type === 'tp');
        let userActionsToShow = [
            {
                name: 'Enrolled',
                date: this.model.trialParticipant.enrolledDate
            }
        ];
        userActions.forEach(ua => {
            let actualAction = ua.action;
            userActionsToShow.push({
                name: actualAction.status,
                date: actualAction.toShowDate
            })
        });
        this.model.userActionsToShow = userActionsToShow;
        this.model.lastAction = userActions.length === 0 ? undefined : userActions[userActions.length - 1].action.name
            .split('-')
            .filter(action => action.length > 0)
            .map(action => action.charAt(0).toUpperCase() + action.slice(1))
            .join(" ");

        this.model.consentsSigned = userActions
            .filter(ac => ac.action.name === 'sign')
            .map(ac => ac.version.version + ' - ' + ac.econsent.name);

        let lastBadActions = userActions
            .filter(ac => ac.action.name === 'withdraw-intention' || ac.action.name === 'withdraw');

        let lastBadAction = lastBadActions.length === 0 ? undefined : lastBadActions[lastBadActions.length - 1];

        let initials = lastBadAction === undefined ? 'N/A' : lastBadAction.action.name
            .split('-')
            .filter(action => action.length > 0)
            .map(action => action.charAt(0).toUpperCase())
            .join("");
        this.model.lastBadAction = lastBadAction === undefined ? 'N/A'
            : initials + ' - ' + lastBadAction.action.toShowDate;
    }

    async _getUserActionsFromEconsents(keySSI, tpDid) {
        // TODO: re-check this logic.
        let userActions = [];
        this.model.hcoDSU.volatile.ifcs
            .forEach(econsent => {
                if (econsent.versions === undefined) {
                    return userActions;
                }
                econsent.versions.forEach(version => {
                    if (version.actions === undefined) {
                        return userActions;
                    }
                    version.actions.forEach(action => {
                        if (action.tpDid === tpDid) {
                            userActions.push({
                                econsent: {
                                    uid: econsent.uid,
                                    keySSI: econsent.keySSI,
                                    name: econsent.name,
                                    type: econsent.type,
                                },
                                version: {
                                    attachmentKeySSI: version.attachmentKeySSI,
                                    version: version.version,
                                    versionDate: version.versionDate,
                                },
                                action: action
                            })
                        }
                    })
                })
            });
        return userActions;
    }

    _showFeedbackToast(title, message, alertType = 'toast') {
        if (typeof this.feedbackEmitter === 'function') {
            this.feedbackEmitter(message, title, alertType);
        }
    }

    _attachHandlerGoBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }

    _attachHandlerChangeStatus() {
        this.onTagEvent('change-status-popup', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'change-participant-status',
                async (event) => {
                    console.log("Status outcome");
                    console.log(event.detail);
                    if (this.model.hcoDSU.volatile.tps) {
                        const tp = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
                        if (tp === undefined) {
                            return console.error('Cannot find tp.');
                        }
                        let tpObjectToAssign = {};
                        const currentDate = new Date();
                        switch (event.detail) {
                            case Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT:
                                tpObjectToAssign = {
                                    actionNeeded: "No action required",
                                    status: Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT,
                                    endOfTreatmentDate: currentDate.toLocaleDateString()
                                }
                            break;
                            case Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED:
                                tpObjectToAssign = {
                                    actionNeeded: "No action required",
                                    status: Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED,
                                    completedDate: currentDate.toLocaleDateString()
                                }
                            break;
                            case Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED:
                                tpObjectToAssign = {
                                    actionNeeded: "No action required",
                                    status: Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED,
                                    discontinuedDate: currentDate.toLocaleDateString()
                                }
                            break;
                            case Constants.TRIAL_PARTICIPANT_STATUS.SCREEN_FAILED: 
                                tpObjectToAssign = {
                                    actionNeeded: "No action required",
                                    status: Constants.TRIAL_PARTICIPANT_STATUS.SCREEN_FAILED,
                                    screenFailedDate: currentDate.toLocaleDateString()
                                }
                            break;
                        }
                        Object.assign(tp, tpObjectToAssign);
                        this.HCOService.updateHCOSubEntity(tp, "tps", async (err, response) => {
                            if (err) {
                                return console.log(err);
                            }
                            this.TrialParticipantRepository.filter(`did == ${tp.did}`, 'ascending', 30, (err, tps) => {

                                if (tps && tps.length > 0) {
                                    Object.assign(tps[0], tpObjectToAssign);
                                    this.TrialParticipantRepository.update(tps[0].uid, tps[0], (err, trialParticipant) => {
                                        if (err) {
                                            return console.log(err);
                                        }
                                        console.log(trialParticipant);
                                        const sites = this.model.toObject("hcoDSU.volatile.site");
                                        const site = sites.find(site => site.trialSReadSSI === tp.trialSReadSSI);
                                        this.sendMessageToPatient(tp, Constants.MESSAGES.HCO.SEND_REFRESH_CONSENTS_TO_PATIENT, this.model.hcoDSU.volatile.trial.uid, null);
                                        this.sendMessageToSponsor(site.sponsorDid, Constants.MESSAGES.SPONSOR.TP_CONSENT_UPDATE, {
                                            ssi: tp.uid,
                                            consentSSI: null
                                        }, 'Participant status changed');
                                    });
                                }
                            });
                        });

                        // this._saveNotification(message, 'Trial participant ' + message.useCaseSpecifics.tpDid + ' signed', 'view trial', Constants.NOTIFICATIONS_TYPE.CONSENT_UPDATES);
                    }
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/ChangeParticipantStatusController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Edit Participant Status'
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

    // _saveNotification(notification, name, reccomendedAction, type) {
    //     notification.type = type;
    //     notification.name = name;
    //     notification.recommendedAction = reccomendedAction;
    //     this.NotificationsRepository.create(notification, (err, data) => {
    //         if (err) {
    //             return console.error(err);
    //         }
    //     });
    // }
}
