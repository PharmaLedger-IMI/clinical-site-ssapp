import HCOService from '../../services/HCOService.js';

const commonServices = require("common-services");
const {CommunicationService, Constants, JWTService, DidService} = commonServices;
const BaseRepository = commonServices.BaseRepository;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const ConsentStatusMapper = commonServices.ConsentStatusMapper;

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
        this.model = {
            ...getInitModel(),
            trialUid: state.trialUid,
            previousScreened: 0,
            hasNoSearchResults:false,
        };


        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Subjects",
                tag: "econsent-trial-participants"
            }
        );

        this.model.search = {
            required: false,
            placeholder: 'Search trial participant by name or assigned number',
            value: '',
        };

        this._initServices().then(() => {
            this.model.dataSourceInitialized = true;
            this.model.trialParticipantsDataSource = DataSourceFactory.createDataSource(6, 5, this.model.toObject('trialParticipants'));
        });

        this._initHandlers();
        this.addSearchHandlers();
    }

    addSearchHandlers() {

        this.model.addExpression(
            'hasTps',
            () => this.model.trialParticipants && this.model.trialParticipants.length > 0,
            'trialParticipants');

        this.model.onChange('search.value', () => {
            this.filterData();
        });
    }

    filterData() {
        let searchKeys = ['name', 'lastName', 'number'];

        let trialParticipants = this.model.toObject('trialParticipants');

        if (this.model.search.value.trim() !== '') {
            let filteredTps = trialParticipants.filter(tp => {

                let keys = Object.keys(tp);
                for (let key of keys) {
                    for (let searchKey of searchKeys) {
                        if (tp[key].toString().toUpperCase().search(this.model.search.value.toUpperCase()) !== -1 && searchKey === key) {
                            return true;
                        }
                    }
                }

                return false;
            });

            this.model.trialParticipantsDataSource.updateTable(JSON.parse(JSON.stringify(filteredTps)));
            this.model.hasNoSearchResults = filteredTps.length === 0;
        }
        else {
            this.model.trialParticipantsDataSource.updateTable(trialParticipants);
            this.model.hasNoSearchResults = false;
        }
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

        this.model.statistics.endOfTreatment = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT).length;
        this.model.statistics.completed = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED).length;
        this.model.statistics.screenFailed = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.SCREEN_FAILED).length;
        this.model.statistics.discontinued = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED).length;
        this.model.statistics.planned = this.model.trialParticipants.length;
        this.model.statistics.enrolled = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED).length;
        this.model.statistics.screened = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.SCREENED).length
            + this.model.previousScreened;
        this.model.statistics.withdrew = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAWN).length;
        this.model.statistics.declined = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.DECLINED).length;
        if(!this.model.statistics.planned) {
            this.model.statistics.percentage = 'N/A';
        } else {
            this.model.statistics.percentage = ((this.model.statistics.enrolled * 100) / this.model.statistics.planned).toFixed(2) + "%";
        }
    }

    async _initServices() {
        this.HCOService = new HCOService();
        this.JWTService = new JWTService();
        this.DIDService = DidService.getDidServiceInstance();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        return await this.initializeData();
    }

    async initializeData() {
        this.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.tps = await this.TrialParticipantRepository.findAllAsync();
        return await this._initTrial(this.model.trialUid);
    }

    _initHandlers() {
        this._attachHandlerAddTrialParticipant();
        this._attachHandlerViewTrialParticipantDetails();
        this._attachHandlerViewAnswersDetails();
        this._attachHandlerViewTrialParticipantStatus();
        this._attachHandlerViewTrialParticipantDevices();
        this._attachHandlerVisits();
    }

    async _initTrial(trialUid) {
        this.model.trial = this.hcoDSU.volatile.trial.find(trial => trial.uid === trialUid);
        const sites = this.hcoDSU.volatile.site;
        const site = sites.find(site=>this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid)
        this.site = site;
        this.model.siteHasConsents = site.consents.length > 0;

        let actions = await this._getEconsentActionsMappedByUser();
        this.model.trialParticipants = await this._getTrialParticipantsMappedWithActionRequired(actions);
        this.checkIfCanAddParticipants();
        this.getStatistics();
    }

    checkIfCanAddParticipants() {
        const recruitmentPeriod = this.model.trial.recruitmentPeriod;
        const recruitmentPeriodIsSet = typeof recruitmentPeriod !== "undefined";
        let isInRecruitmentPeriod = false;
        if (recruitmentPeriodIsSet) {
            let recruitingStage;
            const today = (new Date()).getTime();
            const startDate = (new Date(recruitmentPeriod.startDate)).setHours(0, 0, 0);
            const endDate = (new Date(recruitmentPeriod.endDate)).setHours(23, 59, 59);

            if (startDate <= today && today <= endDate) {
                isInRecruitmentPeriod = true;
                recruitingStage = Constants.RECRUITING_STAGES.RECRUITING;
            }
            if (today < startDate) {
                recruitingStage = Constants.RECRUITING_STAGES.NOT_YET_RECRUITING;
            }
            if (today > endDate) {
                recruitingStage = Constants.RECRUITING_STAGES.ACTIVE_NOT_RECRUITING;
            }

            this.model.trial.recruitmentPeriod.recruitingStage = recruitingStage;
        }

        this.model.addParticipantsIsDisabled = !(this.model.siteHasConsents && isInRecruitmentPeriod);
    }

    async _getTrialParticipantsMappedWithActionRequired(actions) {
        let tpsMappedByDID = {};

        if (this.tps.length === 0) {
            return [];
        }
        this.tps.forEach(tp => tpsMappedByDID[tp.did] = tp);

        let trialParticipants = this.hcoDSU.volatile.tps;

        return trialParticipants
            .filter(tp => tp.trialNumber === this.model.trial.id)
            .map(tp => {

                let nonObfuscatedTp = tpsMappedByDID[tp.did];
                tp.name = nonObfuscatedTp.name;
                tp.birthdate = nonObfuscatedTp.birthdate;
                tp.enrolledDate = nonObfuscatedTp.enrolledDate;
                let tpActions = actions[tp.did];

                if(typeof tp.number === "undefined" || !tpActions){
                    tp.cannotManageDevicesAndVisits = true;
                }
                else{
                    tp.cannotManageDevicesAndVisits = !tpActions.canReceiveTreatment;
                }

                let actionNeeded = 'No action required';
                let notificationColor;
                if (tpActions === undefined || tpActions.length === 0) {
                    notificationColor = 'primary';
                    return {
                        ...tp,
                        actionNeeded: actionNeeded,
                        notificationColor: notificationColor
                    }
                }
                let lastIndexAction = tpActions.length-1;
                let foundEconsentAction = false;

                while(foundEconsentAction === false && lastIndexAction >= 0) {
                    let lastAction = tpActions[lastIndexAction];

                    switch (lastAction.action.name) {
                        case ConsentStatusMapper.consentStatuses.withdraw.name: {
                            actionNeeded = 'Contact TP';
                            notificationColor = 'warning';
                            foundEconsentAction = true;
                            break;
                        }
                        case ConsentStatusMapper.consentStatuses.signed.name: {
                            switch (lastAction.action.type) {
                                case 'hco': {
                                    actionNeeded = 'Set TP Number';
                                    notificationColor = 'success';
                                    foundEconsentAction = true;

                                    break;
                                }
                                case 'tp': {
                                    actionNeeded = 'Consent Review';
                                    notificationColor = 'success';
                                    foundEconsentAction = true;

                                    break;
                                }
                            }
                        }
                    }
                    lastIndexAction--;
                }

                switch(tp.actionNeeded) {
                    case Constants.TP_ACTIONNEEDED_NOTIFICATIONS.SET_TP_NUMBER: {
                        actionNeeded = 'Schedule Visit';
                        notificationColor = 'success';
                        break;
                    }
                    case Constants.TP_ACTIONNEEDED_NOTIFICATIONS.TP_VISIT_RESCHEDULED: {
                        actionNeeded = 'Review Visit';
                        notificationColor = 'warning';
                        break;
                    }
                    case Constants.TP_ACTIONNEEDED_NOTIFICATIONS.VISIT_CONFIRMED: {
                        actionNeeded = 'No action required';
                        notificationColor = 'primary';
                        break;
                    }
                    case Constants.TP_ACTIONNEEDED_NOTIFICATIONS.TP_WITHDRAWN: {
                        actionNeeded = 'Contact TP';
                        notificationColor = 'danger';
                        break;
                    }
                }

                return {
                    ...tp,
                    actionNeeded: actionNeeded,
                    notificationColor: notificationColor
                }
            })
    }

    async _getEconsentActionsMappedByUser() {
        let actions = {};
        let econsents = [];
        const siteConsentsUids = this.site.consents.map(consent => consent.uid);
        if(this.hcoDSU.volatile.ifcs){
             econsents = this.hcoDSU.volatile.ifcs.filter(ifc => siteConsentsUids.includes(ifc.genesisUid));
        }

        econsents.forEach(econsent => {
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
                                version: version.version,
                                versionDate: version.versionDate,
                            },
                            action: action
                        })
                    })
                })
                if(econsent.type === 'Mandatory' && econsent.versions[econsent.versions.length-1].actions) {
                    let actionsLastVersion = econsent.versions[econsent.versions.length-1].actions;
                    actionsLastVersion.forEach(action => {
                        if(action.name === ConsentStatusMapper.consentStatuses.signed.name && action.type === 'hco') {
                            actions[action.tpDid].canReceiveTreatment = true;
                        }
                    })
                }
        });
        return actions;
    }

    _attachHandlerAddTrialParticipant() {
        this.onTagEvent('add:ts', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            let tpsDIDs = [];
            //include both anonymous and public DIDs
            if(this.tps){
                tpsDIDs = this.tps.map(tp => tp.publicDid);
            }
            if(this.hcoDSU.volatile.tps){
                tpsDIDs = tpsDIDs.concat(this.hcoDSU.volatile.tps.map(tp => tp.did));
            }
            this.showModalFromTemplate(
                'add-new-tp',
                async (event) => {
                    const response = event.detail;
                    await this.createTpDsu(response);
                    this.model.trialParticipantsDataSource.updateTable(this.model.toObject('trialParticipants'))
                },
                (event) => {},
                {
                    controller: 'modals/AddTrialParticipantController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Add Trial Participant',
                    tpsDIDs: tpsDIDs
                });
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

    extractConsentInfos(tpPk) {
        let ifcs = this.hcoDSU.volatile.ifcs;
        const site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trialUid);
        let siteConsentsKeySSis = site.consents.map(consent => consent.uid);
        this.trialConsents = ifcs.filter(icf => {
            return siteConsentsKeySSis.indexOf(icf.genesisUid) > -1 && icf.tpUid === tpPk
        })

        this.mandatoryConsent = this.trialConsents.find(cons => {
            return cons['type'] === 'Mandatory' && cons.hasOwnProperty('hcoSign') === true
        });
    }

    _attachHandlerVisits() {
        this.onTagEvent('tp:visits', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.extractConsentInfos(model.pk);
            this.navigateToPageTag('econsent-visits-procedures', {
                trialUid: this.model.trialUid,
                tpUid: model.uid,
                trialId: this.site.trialId,
                pk: model.pk,
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
                patientName:model.name,
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

        await this.initializeData();
        const site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trial.uid)

        //TODO use enums
        if (site.status.stage === "Created") {
            this.HCOService.getHCOSubEntity(site.status.uid,"/site/"+site.uid+"/status",(err, statusDSU)=>{
                statusDSU.stage = 'Recruiting';
                this.HCOService.updateHCOSubEntity(statusDSU,"/site/"+site.uid+"/status",(err, dsu)=>{
                    this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.UPDATE_SITE_STATUS, {
                        stageInfo: {
                            siteSSI: this.site.uid
                        }
                    },'The stage of the site changed');
                });
            });
        }

        this.HCOService.cloneIFCs(site.uid, trialParticipant.pk, async () => {
            this.hcoDSU = await this.HCOService.getOrCreateAsync();
            let ifcs = this.hcoDSU.volatile.ifcs||[];
            let siteConsentsKeySSis = site.consents.map(consent => consent.uid);
            let trialConsents = ifcs.filter(ifc => {
                return siteConsentsKeySSis.includes(ifc.genesisUid) && ifc.tpUid === trialParticipant.pk
            });

            const consentsPromises = trialConsents.map((econsent, index)=> {
                return this.sendConsentToPatient(Constants.MESSAGES.HCO.SEND_REFRESH_CONSENTS_TO_PATIENT, tp,
                    econsent.keySSI, index, null);
            });

            const consentsKeySSIs = trialConsents.map((econsent, index)=> econsent.keySSI);
        
            const sponsorPromise =  this._sendMessageToSponsor(
                Constants.MESSAGES.SPONSOR.TP_ADDED,
                {
                    ssi: anonymizedTp.sReadSSI,
                    tpUid:trialParticipant.pk,
                    consentsKeySSIs
                },
                "A new trial participant was added"
            );

            await Promise.all([...consentsPromises, sponsorPromise]);
            window.WebCardinal.loader.hidden = true;
        });
    }




    sendConsentToPatient(operation, tp, econsentKeySSI, index, shortMessage) {
        return new Promise((resolve) => {

            setTimeout(async () => {
                await this.CommunicationService.sendMessage(tp.publicDid, {
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
                resolve();

            }, index * 100);

        })
    }


    async sendMessageToPatient(operation, tp, trialSSI, shortMessage) {
        const site = this.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trial.uid)
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

    _sendMessageToSponsor(operation, data, shortDescription) {
        this.CommunicationService.sendMessage(this.site.sponsorDid, {
            operation: operation,
            ...data,
            shortDescription: shortDescription,
        });
    }
}