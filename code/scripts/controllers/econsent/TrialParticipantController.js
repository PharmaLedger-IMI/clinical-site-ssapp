import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();


let getInitModel = () => {
    return {
        econsents: [],
    };
};

export default class TrialParticipantController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            ...this.history.win.history.state.state,
        });


        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Consents - Trial Participant",
                tag: "econsent-trial-participant"
            }
        );

        this._initServices();
        this._initHandlers();
    }

    async _initServices() {
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.model.econsentsDataSource =  await this._initConsents(this.model.trialUid);
        const sites = this.model.toObject("hcoDSU.volatile.site");
        this.model.site = sites.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trialUid);
        if(this.model.tp.number !== undefined) {
            this.model.hasAlreadyTpNumber = true;
        } else {
            this.model.hasAlreadyTpNumber = false;
        }
        this.initTrialParticipant();
    }

    _initHandlers() {
        this._attachHandlerNavigateToEconsentVersions();
        this._attachHandlerNavigateToEconsentSign();
        this._attachHandlerAddTrialParticipantNumber();
        this._attachHandlerView();
        this._attachHandlerVisits();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    async _initConsents(trialUid) {

        let ifcs = this.model.hcoDSU.volatile.ifcs;
        const site = this.model.hcoDSU.volatile.site.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid)

        let siteConsentsKeySSis = site.consents.map(consent => consent.uid);
        let trialConsents = ifcs.filter(icf => {
            return siteConsentsKeySSis.indexOf(icf.genesisUid) > -1
        })

        this.model.econsents = trialConsents.map(consent => {
            return {
                ...consent,
                versionDateAsString: DateTimeService.convertStringToLocaleDate(consent.versions[0].versionDate)
            };
        })
        return await this._initTrialParticipant();
    }

    async _initTrialParticipant() {
        let trialParticipant = this.model.hcoDSU.volatile.tps.find(tp => tp.uid === this.model.tpUid);
        let nonObfuscatedTps = await this.TrialParticipantRepository.filterAsync(`did == ${trialParticipant.did}`);
        if (nonObfuscatedTps.length > 0) {
            trialParticipant.name = nonObfuscatedTps[0].name;
        }
        this.model.tp = trialParticipant;
        return this._computeEconsentsWithActions();

    }

    _attachHandlerNavigateToEconsentVersions() {
        this.onTagEvent('consent:history', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-versions', {
                econsentUid: model.uid,
                trialParticipantNumber: this.model.trialParticipantNumber,
                tpUid: this.model.tpUid,
                tpDid: this.model.tp.did,
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
                isManuallySigned: model.isManuallySigned,
                manualKeySSI: model.manualKeySSI,
                manualAttachment: model.manualAttachment,
                tpUid: this.model.tpUid,
                tpDid: this.model.tp.did,
                ecoVersion: ecoVersion,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerVisits() {
        this.onTagEvent('tp:visits', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-visits-procedures', {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                consentId:model.trialConsentId,
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
                (event) => {
                    //this.model.tp.number = event.detail will not trigger a view update
                    this.model.tp = {
                        ...JSON.parse(JSON.stringify(this.model.tp)),
                        number:event.detail
                    }

                    this._updateTrialParticipant(this.model.tp, () => {});
                    this.updateSiteStage(()=>{
                        this._sendMessageToSponsor(Constants.MESSAGES.SPONSOR.ADDED_TS_NUMBER, {
                              ssi: this.model.tpUid
                        },'The stage of the site changed');
                    });

                    this.model.message = {
                        content: 'Tp Number was updated',
                        type: 'success'
                    }
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
                    currentTSNumber:this.model.tp.number
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

    initTrialParticipant() {
        this.TrialParticipantRepository.filter(`did == ${this.model.tp.did}`, 'ascending', 30, (err, tps) => {

            if (tps && tps.length > 0) {
                this.model.trialParticipant = tps[0];
            }
        });
    }

    _updateTrialParticipant(trialParticipant, callback) {

        const tpDsuUpdate = (callback) => {
            this.HCOService.updateHCOSubEntity(trialParticipant, "tps", (err, trialParticipant) => {
                if (err) {
                    return console.log(err);
                }
                this._sendMessageToPatient(this.model.trialUid, trialParticipant, 'Tp Number was attached');
                this.TrialParticipantRepository.update(trialParticipant.uid, trialParticipant, callback);
            })
        }

        if(this.model.tp.status !== Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED) {
            this.model.tp.status = Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED;
            this.TrialParticipantRepository.update(this.model.trialParticipant.uid, this.model.trialParticipant, (err, trialParticipant) => {
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

    _showButton(econsent, buttonName) {
        let existingButtons = ['Sign', 'View', 'Schedule','Contact'];
        existingButtons.forEach(bn => {
            econsent['show' + bn + 'Button'] = false;
        })
        econsent['show' + buttonName + 'Button'] = true;

        return econsent;
    }

    _computeEconsentsWithActions() {
        this.model.econsents.forEach(econsent => {
            econsent = this._showButton(econsent, 'View');
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

                                econsent = this._showButton(econsent, 'Sign');

                                econsent.tsSignedDate = tpVersion.toShowDate;
                                econsent.isManuallySigned = tpVersion.isManual;
                                econsent.manualAttachment = tpVersion.attachment;
                                econsent.manualKeySSI = tpVersion.fileSSI;

                            }

                            if (tpVersion.actionNeeded === Constants.ECO_STATUSES.WITHDRAW) {
                                econsent = this._showButton(econsent, 'Contact');
                                econsent.tsWithdrawDate = tpVersion.toShowDate;
                            }
                            if (tpVersion.actionNeeded === Constants.ECO_STATUSES.CONTACT) {
                                if (tpVersion.status === 'Withdrawed') {
                                    econsent.tsWithdrawDate = tpVersion.toShowDate;
                                } else {
                                    econsent = this._showButton(econsent, 'Contact');
                                    econsent.tsWithdrawedIntentionDate = 'Intention';
                                }
                            }
                            if (tpVersion.actionNeeded === Constants.ECO_STATUSES.DECLINED) {
                                econsent.tsDeclined = true;
                            }
                        }
                    }
                    if (hcoVersions && hcoVersions.length > 0) {
                        let hcoVersion = hcoVersions[hcoVersions.length - 1];
                        let hcoVersionIndex = validVersions.findIndex(v => v === hcoVersion);
                        let tpVersionIndex = validVersions.findIndex(v => v === tpVersion);
                        if (hcoVersion.name === 'sign' && hcoVersionIndex > tpVersionIndex) {
                            econsent.test = true;
                            econsent = this._showButton(econsent, 'View');
                        }
                        if (hcoVersion.name === 'sign' && hcoVersionIndex > tpVersionIndex && this.model.tp.number!==undefined) {
                            econsent = this._showButton(econsent, 'Schedule');
                        }
                        if (hcoVersion.name === 'decline' && hcoVersionIndex > tpVersionIndex) {
                            econsent.hcoDeclined = true;
                            econsent = this._showButton(econsent, 'View');
                        }
                        econsent.hcoDate = hcoVersion.toShowDate;

                    }
                }

                econsent.lastVersion = econsent.versions[econsent.versions.length - 1].version;
            })
        })

        this.model.tsBtnIsDisabled = true;
        this.model.econsents.forEach(econsent => {
            if((econsent['type'] === 'Mandatory' && econsent.test === true) || (econsent['type'] === 'Mandatory' && econsent['showScheduleButton'] === true)) {
                this.model.tsBtnIsDisabled = false;
            }
        });

        return this.model.econsentsDataSource = DataSourceFactory.createDataSource(7, 10,this.model.toObject('econsents'));
    }

    _sendMessageToSponsor(operation, data, shortDescription) {
        this.CommunicationService.sendMessage(this.model.site.sponsorDid, {
            operation: operation,
            ...data,
            shortDescription: shortDescription,
        });
    }
}
