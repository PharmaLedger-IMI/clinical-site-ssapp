import HCOService from '../../services/HCOService.js';
import TrialService from '../../services/TrialService.js';

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
const JWTService = commonServices.JWTService;
const DidService = commonServices.DidService;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();

let getInitModel = () => {
    return {
        trial: {},
        trialParticipants: [],
    };
};

export default class TrialParticipantsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);
        
        const prevState = this.getState() || {};
        const { breadcrumb, ...state } = prevState;
        this.setModel({
            ...getInitModel(),
            trialUid: state.trialUid,
            previousScreened: 0
        });


        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Subjects",
                tag: "econsent-trial-participants"
            }
        );

        this._initServices().then(() => {
            this.model.dataSourceInitialized = true;
            this.model.trialParticipantsDataSource = DataSourceFactory.createDataSource(6, 10, this.model.toObject('trialParticipants'));
            this.model.trialParticipantsDataSource.__proto__.updateParticipants = function (trialParticipants) {
                this.model.trialParticipants = trialParticipants;
                this.model.tableData = trialParticipants;

                this.getElement().dataSize = trialParticipants.length;
                this.forceUpdate(true);
            }
        });

        this._initHandlers();
    }

    getStatistics() {
        this.model.statistics = {
            planned : '0',
            screened: 0,
            enrolled: '0',
            percentage: '0',
            withdrew: '0',
            declined: '0',
        }

        this.model.statistics.planned = this.model.trialParticipants.length;
        this.model.statistics.enrolled = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED).length;
        this.model.statistics.screened = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.SCREENED).length
            + this.model.previousScreened;
        this.model.statistics.withdrew = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW).length;
        this.model.statistics.declined = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.DECLINED).length;
        if(!this.model.statistics.planned) {
            this.model.statistics.percentage = 'N/A';
        } else {
            this.model.statistics.percentage = ((this.model.statistics.enrolled * 100) / this.model.statistics.planned).toFixed(2) + "%";
        }

    }

    async _initServices() {
        this.HCOService = new HCOService();
        this.TrialService = new TrialService();
        this.JWTService = new JWTService();
        this.DIDService = DidService.getDidServiceInstance();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        return await this.initializeData();
    }

    async initializeData() {
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        return await this._initTrial(this.model.trialUid);
    }

    _initHandlers() {
        this._attachHandlerAddTrialParticipant();
        this._attachHandlerNavigateToParticipant();
        this._attachHandlerViewTrialParticipantDetails();
        this._attachHandlerViewAnswersDetails();
        this._attachHandlerViewTrialParticipantStatus();
        this._attachHandlerViewTrialParticipantDevices();
        this._attachHandlerGoBack();
        this._attachHandlerEditRecruitmentPeriod();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    async _initTrial(trialUid) {
        this.model.trial = this.model.hcoDSU.volatile.trial.find(trial => trial.uid === trialUid);
        const sites = this.model.toObject("hcoDSU.volatile.site");
        const site = sites.find(site=>this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid)
        this.model.site = site;
        this.model.siteHasConsents = site.consents.length > 0;

        let actions = await this._getEconsentActionsMappedByUser(trialUid);
        this.model.trialParticipants = await this._getTrialParticipantsMappedWithActionRequired(actions);
        this.checkIfCanAddParticipants();
        this.model.onChange("site.recruitmentPeriod",this.checkIfCanAddParticipants.bind(this));
        this.getStatistics();
    }


    checkIfCanAddParticipants(){
        const recruitmentPeriod = this.model.site.recruitmentPeriod;
        let isInRecruitmentPeriod = false;
        if (typeof recruitmentPeriod === "object") {
            const today = new Date();
            const startDate = new Date(recruitmentPeriod.startDate)
            const endDate = new Date(recruitmentPeriod.endDate);

            if (startDate <= today && today <= endDate) {
                isInRecruitmentPeriod = true;
            }
        }

        this.model.addParticipantsIsDisabled = !(this.model.siteHasConsents && isInRecruitmentPeriod);
    }

    async _getTrialParticipantsMappedWithActionRequired(actions) {
        let tpsMappedByDID = {};

        let tps = await this.TrialParticipantRepository.findAllAsync();
        if (tps.length === 0) {
            return [];
        }
        tps.forEach(tp => tpsMappedByDID[tp.did] = tp);

        let trialParticipants = this.model.hcoDSU.volatile.tps;

        return trialParticipants
            .filter(tp => tp.trialNumber === this.model.trial.id)
            .map(tp => {

                let nonObfuscatedTp = tpsMappedByDID[tp.did];
                tp.name = nonObfuscatedTp.name;
                tp.birthdate = nonObfuscatedTp.birthdate;
                tp.enrolledDate = nonObfuscatedTp.enrolledDate;
                tp.cannotManageDevices = typeof tp.number === "undefined";

                let tpActions = actions[tp.did];
                let actionNeeded = 'No action required';
                if (tpActions === undefined || tpActions.length === 0) {
                    return {
                        ...tp,
                        actionNeeded: actionNeeded
                    }
                }
                let lastAction = tpActions[tpActions.length - 1];

                switch (lastAction.action.name) {
                    case 'withdraw': {
                        actionNeeded = 'TP Withdrawed';
                        break;
                    }
                    case 'withdraw-intention': {
                        actionNeeded = 'Reconsent required';
                        break;
                    }
                    case 'sign': {
                        switch (lastAction.action.type) {
                            case 'hco': {
                                actionNeeded = 'Consented by HCO';
                                break;
                            }
                            case 'tp': {
                                actionNeeded = 'Acknowledgement required';
                                break;
                            }
                        }
                    }
                }

                return {
                    ...tp,
                    actionNeeded: actionNeeded
                }
            })
    }

    async _getEconsentActionsMappedByUser(trialUid) {
        let actions = {};
        (await this.TrialService.getEconsentsAsync(trialUid))
            .forEach(econsent => {
                if (econsent.versions === undefined) {
                    return actions;
                }
                econsent.versions.forEach(version => {
                    if (version.actions === undefined) {
                        return actions;
                    }
                    version.actions.forEach(action => {
                        if (actions[action.tpDid] === undefined) {
                            actions[action.tpDid] = []
                        }
                        actions[action.tpDid].push({
                            econsent: {
                                uid: econsent.uid,
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
                    })
                })
            });
        return actions;
    }

    _attachHandlerNavigateToParticipant() {
        this.onTagEvent('navigate:tp', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-participant', {
                trialSSI: this.model.trialSSI,
                tpUid: model.uid,
                trialParticipantNumber: model.number,
            });
        });
    }

    _attachHandlerAddTrialParticipant() {
        this.onTagEvent('add:ts', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'add-new-tp',
                async (event) => {
                    const response = event.detail;
                    await this.createTpDsu(response);
                    this._showFeedbackToast('Result', Constants.MESSAGES.HCO.FEEDBACK.SUCCESS.ADD_TRIAL_PARTICIPANT);
                    this.model.trialParticipantsDataSource.updateParticipants(this.model.toObject('trialParticipants'))
                },
                (event) => {
                    const response = event.detail;
                }
                ,
                {
                    controller: 'modals/AddTrialParticipantController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Add Trial Participant',
                });
        });
    }

    _attachHandlerEditRecruitmentPeriod() {

        this.onTagEvent('edit-period', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'edit-recruitment-period',
                (event) => {
                    const response = event.detail;
                    this.model.site.recruitmentPeriod = response;
                    this.model.site.recruitmentPeriod.toShowDate = new Date(response.startDate).toLocaleDateString() + ' - ' + new Date(response.endDate).toLocaleDateString();
                    this.HCOService.updateHCOSubEntity(this.model.site, "site", async (err, data) => {

                    });

                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/EditRecruitmentPeriodController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Edit Recruitment Period',
                    recruitmentPeriod: this.model.site.recruitmentPeriod
                }
            );

        });

    }

    _attachHandlerViewTrialParticipantStatus() {
        this.onTagEvent('tp:status', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-participant-details', {
                trialUid: this.model.trialUid,
                tpUid: model.uid,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerViewTrialParticipantDevices() {
        this.onTagEvent('tp:devices', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-participant-devices-list', {
                trialUid: this.model.trialUid,
                trialNumber: model.trialNumber,
                tpUid: model.uid,
                trialParticipantNumber: model.number,
                participantName: model.name,
                participantDID: model.did,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerViewTrialParticipantDetails() {
        this.onTagEvent('tp:details', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-participant', {
                trialUid: this.model.trialUid,
                tpUid: model.uid,
                trialParticipantNumber: model.name,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerViewAnswersDetails() {
        this.onTagEvent('tp:answers', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('trial-participant-answers', {
                trialSSI: this.model.trialUid,
                tpUid: model.uid,
                participantDID: model.did,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    async createTpDsu(tp) {
        window.WebCardinal.loader.hidden = false;
        const currentDate = new Date();
        tp.trialNumber = this.model.trial.id;
        tp.status = Constants.TRIAL_PARTICIPANT_STATUS.PLANNED;
        tp.subjectName = tp.name;
        tp.plannedDate = currentDate.toLocaleDateString();
        tp.screenedDate = "N/A";
        tp.enrolledDate = "N/A";
        tp.endOfTreatmentDate = "N/A";
        tp.completedDate = "N/A";
        tp.discontinuedDate = "N/A";
        tp.screenFailedDate ="N/A"
        tp.withdrewDate = "N/A";
        tp.trialId = this.model.trial.id;
        tp.trialSReadSSI = await this.HCOService.getTrialSReadSSIAsync();
        let trialParticipant = await this.TrialParticipantRepository.createAsync(tp);
        const anonymizedTp  = await this.HCOService.addTrialParticipantAsync(tp);
        trialParticipant.actionNeeded = 'No action required';

        const tpClaims = {
            subjectClaims: {anonymizedDID: tp.did},
            publicClaims: {}
        };
        const clinicalSiteDID = await this.DIDService.getDID();
        const anonymousDIDVc = await this.JWTService.createVerifiableCredentialForAnonymousPatient(clinicalSiteDID, tp.publicDid, tpClaims);
        await this.sendMessageToPatient(
            Constants.MESSAGES.HCO.SEND_HCO_DSU_TO_PATIENT,
            {
                tpNumber: '',
                gender:tp.gender,
                birthdate:tp.birthdate,
                anonymousDIDVc: anonymousDIDVc,
                status: tp.status,
                subjectName: tp.subjectName,
                publicDid: tp.publicDid,
            },
            anonymizedTp.trialSReadSSI,
            Constants.MESSAGES.HCO.COMMUNICATION.PATIENT.ADD_TO_TRIAL
        );

        await this._sendMessageToSponsor(
            Constants.MESSAGES.SPONSOR.TP_ADDED,
            {ssi: anonymizedTp.sReadSSI},
            "A new trial participant was added"
        );

        await this.initializeData();
        const site = this.model.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trial.uid)

        //TODO use enums
        if (site.status.stage === "Created") {
            this.HCOService.getHCOSubEntity(site.status.uid,"/site/"+site.uid+"/status",(err, statusDSU)=>{
                statusDSU.stage = 'Recruiting';
                this.HCOService.updateHCOSubEntity(statusDSU,"/site/"+site.uid+"/status",(err, dsu)=>{
                    this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.UPDATE_SITE_STATUS, {
                        stageInfo: {
                            siteSSI: this.model.site.uid
                        }
                    },'The stage of the site changed');
                });
            });
        }

        this.HCOService.cloneIFCs(site.uid, async () => {
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
            let ifcs = this.model.hcoDSU.volatile.ifcs||[];
            let siteConsentsKeySSis = site.consents.map(consent => consent.uid);
            let trialConsents = ifcs.filter(icf => {
                return siteConsentsKeySSis.includes(icf.genesisUid)
            });

            const promises = trialConsents.map((econsent)=> {
                return this.sendConsentToPatient(Constants.MESSAGES.HCO.SEND_REFRESH_CONSENTS_TO_PATIENT, tp,
                    econsent.keySSI, null);

            });
            await Promise.all(promises);
            window.WebCardinal.loader.hidden = true;
        });
    }


    sendConsentToPatient(operation, tp, econsentKeySSI, shortMessage) {
        return this.CommunicationService.sendMessage(tp.publicDid, {
            operation: operation,
            ssi: econsentKeySSI,
            useCaseSpecifics: {
                subjectName: tp.subjectName,
                tpName: tp.name,
                did: tp.did,
                sponsorDid: tp.sponsorDid,
            },
            shortDescription: shortMessage,
        });
    }


    async sendMessageToPatient(operation, tp, trialSSI, shortMessage) {
        const site = this.model.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trial.uid)
        const siteSReadSSI = await this.HCOService.getSiteSReadSSIAsync();
        this.CommunicationService.sendMessage(tp.publicDid, {
            operation: operation,
            ssi: siteSReadSSI,
            useCaseSpecifics: {
                tp:tp,
                trialSSI: trialSSI,
                sponsorDid: site.sponsorDid,
                site: {
                    name: site?.name,
                    number: site?.id,
                    country: site?.country,
                    status: site?.status,
                    keySSI: site?.keySSI,
                },
            },
            shortDescription: shortMessage,
        });
    }

    _showFeedbackToast(title, message, alertType = 'toast') {
        if (typeof this.feedbackEmitter === 'function') {
            this.feedbackEmitter(message, title, alertType);
        }
    }

    _attachHandlerGoBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            this.navigateToPageTag('econsent-trial-management', { breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    _sendMessageToSponsor(operation, data, shortDescription) {
        this.CommunicationService.sendMessage(this.model.site.sponsorDid, {
            operation: operation,
            ...data,
            shortDescription: shortDescription,
        });
    }
}