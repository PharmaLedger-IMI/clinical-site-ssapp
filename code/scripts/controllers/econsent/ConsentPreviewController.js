import TrialService from '../../services/TrialService.js';
import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const FileDownloaderService = commonServices.FileDownloaderService;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class ConsentPreviewController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getState();
        this.model.pdf = {
            currentPage: 1,
                pagesNo: 0
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Consent Preview",
                tag: "consent-preview"
            }
        );

        this.initServices();

    }

    initServices() {
        this.TrialService = new TrialService();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.HCOService = new HCOService();
        this.HCOService.getOrCreateAsync().then((hcoDsu) => {
            this.model.hcoDSU = hcoDsu;
            this.initSiteConsentModel(this.model.trialUid, hcoDsu.volatile.site);
        });
    }

    initSiteConsentModel(trialUid, siteList) {
        const site = siteList.find(site=>this.HCOService.getAnchorId(site.trialSReadSSI) === trialUid);
        let consent = site.consents.find(consent => consent.uid === this.model.consentUid);
        let version = consent.versions.find(version => version.version === this.model.versionId);

        this.fileDownloaderService = new FileDownloaderService(this.DSUStorage);

        let path = this.getEconsentFilePath(site.uid, consent.uid, version.version);
        this.downloadFile(path, version.attachment);
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

    displayFile = () => {
        window.URL = window.URL || window.webkitURL;
        this.loadPdfOrTextFile();
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
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'scripts/third-parties/pdf.worker.js';

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

    getEconsentFilePath(siteUid, consentUid, versionId) {
        return this.HCOService.PATH + '/' + this.HCOService.ssi + '/site/'
            + siteUid + '/consent/' + consentUid + '/versions/' + versionId
    }
}
