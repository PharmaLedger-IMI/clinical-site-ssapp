import TrialService from '../../services/TrialService.js';
import PatientEconsentService from "../../services/PatientEconsentService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const PDFService = commonServices.PDFService;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class EconsentSignController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "View/Sign",
                tag: "econsent-sign"
            }
        );

        this.initServices();
        this.initHandlers();
    }

    async initServices() {
        this.TrialService = new TrialService();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initSite(this.model.trialUid);
        this.initTrialParticipant();
        this.initConsent();
    }

    initHandlers() {
        this.attachHandlerEconsentSign();
        this.attachHandlerEconsentDecline();
    }

    initConsent() {
        let econsent = this.model.hcoDSU.volatile.ifcs.find(consent => consent.uid === this.model.econsentUid);
        if (econsent === undefined) {
            return console.log('Error while loading econsent.');
        }
        this.model.econsent = {
            ...econsent,
            versionDateAsString: DateTimeService.convertStringToLocaleDate(econsent.versions[0].versionDate)
        };
        let currentVersion = '';
        if (this.model.ecoVersion) {
            currentVersion = econsent.versions.find(eco => eco.version === this.model.ecoVersion);
        } else {
            currentVersion = econsent.versions[econsent.versions.length - 1];
            this.model.ecoVersion = currentVersion.version;
        }

        if (this.model.isManuallySigned) {
            this.PatientEconsentService = new PatientEconsentService(this.model.econsent.id);
            this.PatientEconsentService.mountEconsent(this.model.manualKeySSI, (err, data) => {
                if (err) {
                    return console.log(err);
                }

                let econsentFilePath = this.getEconsentManualFilePath(this.model.econsent.id, data.keySSI, this.model.manualAttachment);
                this.displayConsentFile(econsentFilePath, this.model.manualAttachment);
            });
        } else {
            let econsentFilePath = this.getEconsentFilePath(econsent, currentVersion);
            this.displayConsentFile(econsentFilePath, currentVersion.attachment);
        }
    }

    displayConsentFile(consentFilePath, version) {
        this.model.consentPathAndVersion = {
            path: consentFilePath,
            version: version
        };
        this.PDFService = new PDFService(this.DSUStorage);
        this.PDFService.displayPDF(consentFilePath, version);
        this.PDFService.onFileReadComplete(() => {
            this.model.documentWasNotRead = false;
        });
    }

    getEconsentFilePath(econsent, currentVersion) {
        return this.HCOService.PATH + '/' + this.HCOService.ssi + '/ifcs/'
            + econsent.uid + '/versions/' + currentVersion.version
    }

    getEconsentManualFilePath(ecoID, consentSSI, fileName) {
        return '/econsents/' + ecoID + '/' + consentSSI;
    }

    attachHandlerEconsentSign() {
        this.onTagEvent('econsent:sign', 'click', async (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            const currentDate = new Date();
            this.model.econsent.hcoSign = {
                date: currentDate.toISOString(),
                toShowDate: currentDate.toLocaleDateString(),
            };

            let message = {
                name: 'Signed',//use statusmapper
                status: Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED,
                actionNeeded: 'HCO SIGNED -no action required',
            }

            const {path, version} = this.model.consentPathAndVersion;
            const digitalSignatureOptions = {
                path: path,
                version: version,
                signatureDate: currentDate.toLocaleDateString(),
                signatureAuthor: "HCO Signature",
                existingSignatures: 1
            };
            const arrayBufferSignedPdf = await this.PDFService.applyDigitalSignature(digitalSignatureOptions);
            console.log("signed pdf", arrayBufferSignedPdf);

            this.updateEconsentWithDetails(message);
            this.sendMessageToSponsor(Constants.MESSAGES.SPONSOR.SIGN_ECONSENT, Constants.MESSAGES.HCO.COMMUNICATION.SPONSOR.SIGN_ECONSENT);

            let state = {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('econsent-trial-participant', state);
        });
    }

    attachHandlerEconsentDecline() {
        this.onTagEvent('econsent:decline', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const currentDate = new Date();
            this.model.econsent.hcoSign = {
                date: currentDate.toISOString(),
                toShowDate: currentDate.toLocaleDateString(),
            };
            let message = {
                name: 'Declined',//use statusmapper
                status: Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED,
                actionNeeded: 'HCO DECLINED -no action required',
            }
            this.updateEconsentWithDetails(message);
            this.sendMessageToSponsor(Constants.MESSAGES.SPONSOR.DECLINE_ECONSENT, Constants.MESSAGES.HCO.COMMUNICATION.SPONSOR.DECLINE_ECONSENT);

            let state = {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('econsent-trial-participant', state);
        });
    }


    updateEconsentWithDetails(message) {
        let currentVersionIndex = this.model.econsent.versions.findIndex(eco => eco.version === this.model.ecoVersion);
        if (currentVersionIndex === -1) {
            return console.log(`Version doesn't exist`);
        }
        let currentVersion = this.model.econsent.versions[currentVersionIndex];
        if (currentVersion.actions === undefined) {
            currentVersion.actions = [];
        }

        const currentDate = new Date();
        currentVersion.actions.push({
            name: message.name,
            tpDid: this.model.tpDid,
            type: 'hco',
            status: message.status,
            actionNeeded: message.actionNeeded,
            toShowDate: currentDate.toLocaleDateString(),
        });

        this.model.econsent.versions[currentVersionIndex] = currentVersion;
        this.HCOService.updateHCOSubEntity(this.model.econsent, "ifcs", async (err, response) => {
            if (err) {
                return console.log(err);
            }
            this.updateTrialParticipantStatus(message)
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        });
    }

    initTrialParticipant() {
        this.TrialParticipantRepository.filter(`did == ${this.model.tpDid}`, 'ascending', 30, (err, tps) => {

            if (tps && tps.length > 0) {
                this.model.trialParticipant = tps[0];
            }
        });
    }

    updateTrialParticipantStatus(message) {
        this.model.trialParticipant.actionNeeded = message.actionNeeded;
        this.model.trialParticipant.tpSigned = message.name === 'Signed';
        this.model.trialParticipant.status = message.status;
        let currentDate = new Date();
        if (message.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED) {
            this.model.trialParticipant.enrolledDate = currentDate.toLocaleDateString();
        } else this.model.trialParticipant.discontinuedDate = currentDate.toLocaleDateString();

        this.TrialParticipantRepository.update(this.model.trialParticipant.pk, this.model.trialParticipant, (err, trialParticipant) => {
            if (err) {
                return console.log(err);
            }

            this.sendMessageToPatient(trialParticipant.did,
                Constants.MESSAGES.HCO.UPDATE_STATUS, {
                    status: message.status
                });
        });
    }

    async initSite(trialUid) {
        const sites = this.model.toObject("hcoDSU.volatile.site");
        this.model.site = sites.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid);
    }

    getInitModel() {
        return {
            econsent: {},
            controlsShouldBeVisible: true,
            ...this.getState(),
            documentWasNotRead: true,
        }
    }

    sendMessageToSponsor(operation, shortMessage) {
        const currentDate = new Date();
        let sendObject = {
            operation: operation,
            ssi: this.model.tpUid,
            consentUid: this.model.econsentUid,
            useCaseSpecifics: {
                trialSSI: this.model.trialUid,
                tpNumber: this.model.trialParticipant.number,
                tpDid: this.model.trialParticipant.did,
                version: this.model.ecoVersion,
                siteSSI: this.model.site.uid,
                action: {
                    name: 'sign',
                    date: DateTimeService.getCurrentDateAsISOString(),
                    toShowDate: currentDate.toLocaleDateString(),
                },
            },
            shortDescription: shortMessage,
        };
        this.CommunicationService.sendMessage(this.model.site.sponsorDid, sendObject);
    }

    sendMessageToPatient(patientDid, operation, message) {
        if (!message) {
            message = {};
        }
        const patientMessage = {
            ...message,
            operation
        }
        this.CommunicationService.sendMessage(patientDid, patientMessage);
    }

}
