import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const QuestionnaireService = commonServices.QuestionnaireService;
const BaseRepository = commonServices.BaseRepository;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const ConsentStatusMapper = commonServices.ConsentStatusMapper;

let getInitModel = () => {
    return {
        econsents: [],
    };
};

export default class TrialParticipantController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.model = {
            ...getInitModel(),
        };


        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Consents - Trial Participant",
                tag: "econsent-trial-participant"
            }
        );

        this._initServices().then( () => {
            this.model.econsentsDataSource = DataSourceFactory.createDataSource(7, 10, this.econsents);
        });

        this._initHandlers();
    }

    async _initServices() {
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        await this._initConsents(this.model.trialUid);
        const sites = this.model.toObject("hcoDSU.volatile.site");
        this.model.site = sites.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trialUid);
        this.model.hasTpNumber = this.model.tp.number !== undefined;
        if((this.model.tp.status === Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED || this.model.tp.status === Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAWN ||
            this.model.tp.status === Constants.TRIAL_PARTICIPANT_STATUS.UNAVAILABLE || this.model.tp.status === Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED)) {
            this.model.tsBtnIsDisabled = true;
        }
    }

    _initHandlers() {
        this._attachHandlerNavigateToEconsentVersions();
        this._attachHandlerNavigateToEconsentSign();
        this._attachHandlerAddTrialParticipantNumber();
        this._attachHandlerView();
        this._attachHandlerContactTs();
    }

    async _initConsents(trialUid) {
        await this._initTrialParticipant();
        let ifcs = this.model.hcoDSU.volatile.ifcs;
        const site = this.model.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid)

        let siteConsentsKeySSis = site.consents.map(consent => consent.uid);
        let trialConsents = ifcs.filter(icf => {
            return siteConsentsKeySSis.indexOf(icf.genesisUid) > -1 && icf.tpUid === this.model.tp.pk
        })

        this.econsents = trialConsents.map(consent => {
            return {
                ...consent,
                versionDateAsString: DateTimeService.convertStringToLocaleDate(consent.versions[0].versionDate)
            };
        })
        return this._computeEconsentsWithActions();
    }

    async _initTrialParticipant() {
        let trialParticipant = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        let nonObfuscatedTps = await this.TrialParticipantRepository.filterAsync(`did == ${trialParticipant.did}`);
        if (nonObfuscatedTps.length > 0) {
            trialParticipant.name = nonObfuscatedTps[0].name;
            trialParticipant.number = nonObfuscatedTps[0].number;
            trialParticipant.pk = nonObfuscatedTps[0].pk;
        }
        this.model.tp = trialParticipant;
    }

    _attachHandlerNavigateToEconsentVersions() {
        this.onTagEvent('consent:history', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-versions', {
                trialUid: this.model.trialUid,
                econsentUid: model.uid,
                tpUid: this.model.tpUid,
                tpDid: this.model.tp.did,
                tpPk:this.model.tp.pk,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerView() {
        this.onTagEvent('consent:view', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-sign', {
                trialUid: this.model.trialUid,
                econsentUid: model.uid,
                ecoVersion: model.lastVersion,
                tpDid: this.model.tp.did,
                controlsShouldBeVisible: false,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerNavigateToEconsentSign() {
        this.onTagEvent('consent:sign', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            let ecoVersion = undefined;
            if (model && model.versions && model.versions.length > 0) {
                ecoVersion = model.versions[model.versions.length - 1].version;
            }
            this.navigateToPageTag('econsent-sign', {
                trialUid: this.model.trialUid,
                econsentUid: model.uid,
                tpUid: this.model.tpUid,
                tpDid: this.model.tp.did,
                ecoVersion: ecoVersion,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerContactTs() {
        this.onTagEvent('consent:contactTS', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-contact-ts', {
                trialUid: this.model.trialUid,
                tpDid: this.model.tp.did,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerAddTrialParticipantNumber() {
        this.onTagEvent('tp:setTpNumber', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.showModalFromTemplate(
                'add-tp-number',
                async (event) => {
                    window.WebCardinal.loader.hidden = false;
                    this.model.tp.number = event.detail;

                    this.updateSiteStage(()=>{
                        this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.ADDED_TS_NUMBER, {
                              ssi: this.model.tpUid
                        },'The stage of the site changed');
                    });

                    const tpDSU = this.model.toObject("tp");
                    tpDSU.name = "-";

                    this._updateTrialParticipant(tpDSU, async () => {
                        let cons = await this._initConsents(this.model.trialUid);
                        this.model.econsentsDataSource.updateTable(cons);

                        if(!this.model.hasTpNumber){
                            //send the questionnaire if available once
                            await this.sendQuestionnaireToPatient(this.model.tp.did);
                            this.model.hasTpNumber = true;
                        }

                        this.model.message = {
                            content: 'Tp Number was updated',
                            type: 'success'
                        }

                        window.WebCardinal.loader.hidden = true;
                    });


                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/AddTrialParticipantNumber',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Attach Trial Participant Number',
                    existingTSNumbers: this.model.hcoDSU.volatile.tps.filter(tp => typeof tp.number !== "undefined").map(tp => tp.number),
                    currentTSNumber:this.model.tp.number,
                    trialId:this.model.site.trialId,
                    siteId:this.model.site.id,
                });
        });
    }

    updateSiteStage(callback) {

        const site = this.model.site;
        if (site.status.stage === "Recruiting") {
            this.HCOService.getHCOSubEntity(site.status.uid, "/site/" + site.uid + "/status", (err, statusDSU) => {
                statusDSU.stage = 'Enrolling';
                this.HCOService.updateHCOSubEntity(statusDSU, "/site/" + site.uid + "/status", (err, dsu) => {
                    this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.UPDATE_SITE_STATUS, {
                        stageInfo: {
                            siteSSI: this.model.site.uid
                        }
                    },'The stage of the site changed');
                    callback();
                });
            });
        }
    }


   async _updateTrialParticipant(trialParticipant, callback) {
        const tps = await this.TrialParticipantRepository.filterAsync(`did == ${trialParticipant.did}`, 'ascending', 30)
        let trialSubject;
        if (tps.length > 0) {
            trialSubject = tps[0];
        }

        const tpDsuUpdate = (callback) => {
            trialParticipant.actionNeeded = Constants.TP_ACTIONNEEDED_NOTIFICATIONS.SET_TP_NUMBER;
            this.HCOService.updateHCOSubEntity(trialParticipant, "tps", (err, tp) => {
                if (err) {
                    return console.log(err);
                }
                this._sendMessageToPatient(this.model.trialUid, tp, 'Tp Number was attached');
                this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.ADDED_TS_NUMBER, {
                    ssi: this.model.tpUid
              },'Tp Number was attached');
                this.TrialParticipantRepository.update(trialParticipant.pk, trialSubject, callback);
            })
        }

        this.model.tp.number = trialParticipant.number;
        trialSubject.number = trialParticipant.number;
        if(this.model.tp.status !== Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED) {
            this.model.tp.status = Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED;
            this.model.tp.enrolledDate = new Date().toLocaleDateString();
            this.TrialParticipantRepository.update(this.model.tp.pk, trialSubject, (err, trialParticipant) => {
                if (err) {
                    return console.log(err);
                }
                tpDsuUpdate(callback);
            });
        }
        else {
            tpDsuUpdate(callback);
        }

    }

    sendQuestionnaireToPatient(patientDid){
        const questionnaireService = new QuestionnaireService();
        return new Promise((resolve, reject)=>{
            questionnaireService.getAllQuestionnaires((err, questionnaires) => {
                if (err) {
                    reject (err);
                }

                const trialQuestionnaire = questionnaires.find(questionnaire => questionnaire.trialSSI === this.model.trialUid);
                if(!trialQuestionnaire){
                    return resolve();
                }

                questionnaireService.getQuestionnaireSReadSSI(trialQuestionnaire,async (err, sReadSSI)=>{
                    if(err){
                        reject(err);
                    }

                    await this.CommunicationService.sendMessage(patientDid, {
                        operation: Constants.MESSAGES.HCO.CLINICAL_SITE_QUESTIONNAIRE,
                        ssi: sReadSSI,
                        shortDescription: Constants.MESSAGES.HCO.CLINICAL_SITE_QUESTIONNAIRE,
                    });

                    resolve();
                })

            })
        })

    }

    _sendMessageToPatient(ssi, tp, shortMessage) {
        this.CommunicationService.sendMessage(tp.did, {
            operation: Constants.MESSAGES.PATIENT.UPDATE_TP_NUMBER,
            ssi: ssi,
            useCaseSpecifics: {
                tpNumber: tp.number,
                tpName: tp.name,
                tpDid: tp.did
            },
            shortDescription: shortMessage,
        });
    }

    _computeEconsentsWithActions() {
        this.econsents.forEach(econsent => {
            econsent.versions.forEach(version => {
                if (version.actions !== undefined) {
                    let validVersions = version.actions.filter(action => action.tpDid === this.model.tp.did);
                    let tpVersions = validVersions.filter(action => action.type === 'tp');
                    let hcoVersions = validVersions.filter(action => action.type === 'hco');

                    let tpVersion = {};
                    if (tpVersions && tpVersions.length > 0) {
                        tpVersion = tpVersions[tpVersions.length - 1];
                        if (tpVersion && tpVersion.actionNeeded) {
                            if (tpVersion.actionNeeded === Constants.ECO_STATUSES.TO_BE_SIGNED) {
                                econsent.toBeSignedByHCO = true;
                                econsent.tsSignedDate = tpVersion.toShowDate;
                            }

                            if (tpVersion.actionNeeded === Constants.ECO_STATUSES.WITHDRAWN) {

                                econsent.tsWithdrawDate = tpVersion.toShowDate;
                                econsent.withdrawn = true;
                                econsent.toBeContactedByHCO = true;
                            }
                            if (tpVersion.actionNeeded === Constants.ECO_STATUSES.DECLINED || tpVersion.actionNeeded === Constants.ECO_STATUSES.DECLINED_OPTIONAL) {
                                econsent.tsDeclined = true;
                            }
                        }
                    }
                    if (hcoVersions && hcoVersions.length > 0) {
                        let hcoVersion = hcoVersions[hcoVersions.length - 1];
                        let hcoVersionIndex = validVersions.findIndex(v => v === hcoVersion);
                        let tpVersionIndex = validVersions.findIndex(v => v === tpVersion);
                        if (hcoVersion.name === ConsentStatusMapper.consentStatuses.signed.name && hcoVersionIndex > tpVersionIndex) {
                            econsent.signed = true;
                            econsent.toBeSignedByHCO = false;
                        }
                        if (hcoVersion.name === ConsentStatusMapper.consentStatuses.decline.name && hcoVersionIndex > tpVersionIndex) {
                            econsent.hcoDeclined = true;
                            econsent.toBeSignedByHCO = false;
                        }
                        econsent.hcoDate = hcoVersion.toShowDate;

                    }
                }

                econsent.lastVersion = econsent.versions[econsent.versions.length - 1].version;
            })
        })

        this.model.tsBtnIsDisabled = true;
        this.econsents.forEach(econsent => {
            if((econsent['type'] === 'Mandatory' && econsent.signed === true) || (econsent['type'] === 'Mandatory' && econsent['showScheduleButton'] === true)) {
                this.model.tsBtnIsDisabled = false;
            }
        });

        let mandatoryConsent = this.econsents.find(cons => cons.type === "Mandatory");
        let lastVersion = mandatoryConsent.versions[mandatoryConsent.versions.length - 1];
        if(lastVersion.hasOwnProperty('actions')) {
            let actions = lastVersion.actions;
            actions.forEach(action => {
                if(action.name === ConsentStatusMapper.consentStatuses.signed.name && action.type === "hco") {
                    this.model.tsBtnIsDisabled = false;
                } else {
                    this.model.tsBtnIsDisabled = true;
                }
            })
        } else {
            this.model.tsBtnIsDisabled = true;
        }

        return this.econsents;
    }

    _sendMessageToSponsor(operation, data, shortDescription) {
        this.CommunicationService.sendMessage(this.model.site.sponsorDid, {
            operation: operation,
            ...data,
            shortDescription: shortDescription,
        });
    }
}
