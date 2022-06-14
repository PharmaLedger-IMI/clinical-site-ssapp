import TrialService from '../../services/TrialService.js';
import PatientEcosentService from "../../services/PatientEcosentService.js";
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const FileDownloaderService = commonServices.FileDownloaderService;
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
        this.attachHandlerBack();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    initConsent() {
        let econsent = this.model.hcoDSU.volatile.ifcs.find(consent => consent.uid == this.model.econsentUid);
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
        this.fileDownloaderService = new FileDownloaderService(this.DSUStorage);

        if (this.model.isManuallySigned) {
            this.PatientEcosentService = new PatientEcosentService(this.model.econsent.id);
            this.PatientEcosentService.mountEcosent(this.model.manualKeySSI, (err, data) => {
                if (err) {
                    return console.log(err);
                }
                let econsentFilePath = this.getEconsentManualFilePath(this.model.econsent.id, data.keySSI, this.model.manualAttachment);
                this.downloadFile(econsentFilePath, this.model.manualAttachment);
            })

        } else {
            let econsentFilePath = this.getEconsentFilePath(econsent, currentVersion);
            console.log(econsentFilePath);
            this.downloadFile(econsentFilePath, currentVersion.attachment);
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

    getEconsentFilePath(econsent, currentVersion) {
        return this.HCOService.PATH + '/' + this.HCOService.ssi + '/ifcs/'
            + econsent.uid + '/versions/' + currentVersion.version
    }

    getEconsentManualFilePath(ecoID, consentSSI, fileName) {
        return '/econsents/' + ecoID + '/' + consentSSI;
    }

    attachHandlerEconsentSign() {
        this.onTagEvent('econsent:sign', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const currentDate = new Date();
            this.model.econsent.hcoSign = {
                date: currentDate.toISOString(),
                toShowDate: currentDate.toLocaleDateString(),
            };
            this.updateEconsentWithDetails();
            this.sendMessageToSponsor(Constants.MESSAGES.SPONSOR.SIGN_ECOSENT, Constants.MESSAGES.HCO.COMMUNICATION.SPONSOR.SIGN_ECONSENT);

            let state = {
                trialUid: this.model.trialUid,
                tpUid: this.model.tpUid,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('econsent-trial-participant', state);
        });
    }


    downloadFile = async (filePath, fileName) => {
        await this.fileDownloaderService.prepareDownloadFromDsu(filePath, fileName);
        let fileBlob = this.fileDownloaderService.getFileBlob(fileName);
        this.rawBlob = fileBlob.rawBlob;
        this.mimeType = fileBlob.mimeType;
        this.blob = new Blob([this.rawBlob], {
            type: this.mimeType,
        });
        this.displayFile();
    };

    loadPdfOrTextFile = () => {
        const reader = new FileReader();
        reader.readAsDataURL(this.blob);
        reader.onloadend = () => {
            let base64data = reader.result;
            this.initPDF(base64data.substr(base64data.indexOf(',') + 1));
        };
    };

    initPDF(pdfData) {
        pdfData = atob(pdfData);
        let pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

        this.loadingTask = pdfjsLib.getDocument({data: pdfData});
        this.renderPage(this.model.pdf.currentPage);

        window.addEventListener("scroll", (event) => {
            let myDiv = event.target;
            if (myDiv.id === 'pdf-wrapper'
                && Math.ceil(myDiv.offsetHeight + myDiv.scrollTop) >= myDiv.scrollHeight) {
                this.model.documentWasNotRead = false;
            }
        }, {capture: true});
    }

    renderPage = (pageNo) => {
        this.loadingTask.promise.then((pdf) => {
            this.model.pdf.pagesNo = pdf.numPages;
            pdf.getPage(pageNo).then(result => this.handlePages(pdf, result));
        }, (reason) => console.error(reason));
    };

    handlePages = (thePDF, page) => {
        const viewport = page.getViewport({scale: 1.5});
        let canvas = document.createElement("canvas");
        canvas.style.display = "block";
        let context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        page.render({canvasContext: context, viewport: viewport});
        document.getElementById('canvas-parent').appendChild(canvas);

        this.model.pdf.currentPage = this.model.pdf.currentPage + 1;
        let currPage = this.model.pdf.currentPage;
        if (thePDF !== null && currPage <= this.model.pdf.pagesNo) {
            thePDF.getPage(currPage).then(result => this.handlePages(thePDF, result));
        }
    };

    displayFile = () => {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            const file = new File([this.rawBlob], this.fileName);
            window.navigator.msSaveOrOpenBlob(file);
            this.feedbackController.setLoadingState(true);
            return;
        }

        window.URL = window.URL || window.webkitURL;
        const fileType = this.mimeType.split('/')[0];
        switch (fileType) {
            case 'image': {
                this.loadImageFile();
                break;
            }
            default: {
                this.loadPdfOrTextFile();
                break;
            }
        }
    };


    updateEconsentWithDetails(message) {
        let currentVersionIndex = this.model.econsent.versions.findIndex(eco => eco.version === this.model.ecoVersion);
        if (currentVersionIndex === -1) {
            return console.log(`Version ${message.useCaseSpecifics.version} of the econsent ${message.ssi} does not exist.`)
        }
        let currentVersion = this.model.econsent.versions[currentVersionIndex];
        if (currentVersion.actions === undefined) {
            currentVersion.actions = [];
        }

        const currentDate = new Date();
        currentVersion.actions.push({
            name: 'sign',
            tpDid: this.model.tpDid,
            type: 'hco',
            status: Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED,
            actionNeeded: 'HCO SIGNED -no action required',
            toShowDate: currentDate.toLocaleDateString(),
        });

        this.model.econsent.versions[currentVersionIndex] = currentVersion;
        this.HCOService.updateHCOSubEntity(this.model.econsent, "ifcs", async (err, response) => {
            if (err) {
                return console.log(err);
            }
            this.updateTrialParticipantStatus()
            this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        });
    }

    initTrialParticipant() {
        this.TrialParticipantRepository.filter(`did == ${this.model.trialParticipantNumber}`, 'ascending', 30, (err, tps) => {

            if (tps && tps.length > 0) {
                this.model.trialParticipant = tps[0];
            }
        });
    }

    updateTrialParticipantStatus() {
        this.model.trialParticipant.actionNeeded = 'HCO SIGNED -no action required';
        this.model.trialParticipant.tpSigned = true;
        this.model.trialParticipant.status = Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED;
        this.TrialParticipantRepository.update(this.model.trialParticipant.uid, this.model.trialParticipant, (err, trialParticipant) => {
            if (err) {
                return console.log(err);
            }
            console.log(trialParticipant);
        });
    }

    attachHandlerBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }

    async initSite(trialUid) {
        const sites = this.model.toObject("hcoDSU.volatile.site");
        this.model.site = sites.find(site=>this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid);
    }

    getInitModel() {
        return {
            econsent: {},
            controlsShouldBeVisible:true,
            ...this.getState(),
            documentWasNotRead: true,
            pdf: {
                currentPage: 1,
                pagesNo: 0
            },
            showPageUp: false,
            showPageDown: true
        }
    }

}
