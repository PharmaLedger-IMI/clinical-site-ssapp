import SiteService from "../../services/SiteService.js";
import HCOService from "../../services/HCOService.js";

import TrialService from "../../services/TrialService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const DateTimeService = commonServices.DateTimeService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class TrialDetailsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        const prevState = this.getState() || {};
        const { breadcrumb, ...state } = prevState;
        this.model.trialUid = state.trialUid;

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Overview Trial",
                tag: "econsent-trial-details"
            }
        );

        this.initServices();
        this.initHandlers();
        this.getSite();
    }

    emptyCallback() {
    }

    async initServices() {
        this.TrialService = new TrialService();
        this.SiteService = new SiteService();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS, this.DSUStorage);

        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
        this.initTrial(this.model.trialUid);
    }

    initHandlers() {
        this.attachHandlerEditRecruitmentPeriod();
        this.attachHandlerNavigateToVersion();
        this.attachHandlerChangeStatus();
        this.attachHandlerBack();
        this.attachHandlerTrialParticipants();
    }

    async initTrial(keySSI) {
        this.model.trial = this.model.hcoDSU.volatile.trial.find(t => t.uid === this.model.trialUid);
        if (this.model.trial === undefined) {
            this.model.trial = {};
        }
        this.model.trialParticipants = (await this.TrialParticipantRepository.findAllAsync()).filter(tp => tp.trialNumber === this.model.trial.id);
        this.model.subjects.planned = this.model.trialParticipants.length;
        this.model.subjects.enrolled = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED).length;
        this.model.subjects.screened = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.SCREENED).length;
        this.model.subjects.withdrew = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAW).length;
        this.model.subjects.declined = this.model.trialParticipants.filter(tp => tp.status === Constants.TRIAL_PARTICIPANT_STATUS.DECLINED).length;
        this.model.subjects.percentage = ((this.model.subjects.enrolled * 100) / this.model.subjects.planned).toFixed(2) + "%";

        this.TrialService.getEconsents(this.model.trial.uid, (err, econsents) => {
            if (err) {
                return console.log(err);
            }
            //TODO check this mechanism and while the previous function is not returning the econsents...
            econsents = this.model.hcoDSU.volatile.ifcs ? this.model.hcoDSU.volatile.ifcs : [];

            this.model.econsents = econsents.map(econsent => {
                return {
                    ...econsent,
                    versions: econsent.versions.map(v => {
                        return {
                            ...v,
                            econsentUid: econsent.uid,
                            versionDateAsString: DateTimeService.convertStringToLocaleDate(v.versionDate)
                        }
                    })
                }
            });
        })
    }

    attachHandlerBack() {
        this.onTagClick("navigation:back", () => {
            this.history.goBack();
        });
    }

    attachHandlerTrialParticipants() {
        this.onTagClick("navigation:participants", (model) => {
            this.navigateToPageTag("econsent-trial-participants", model.keySSI);
        });
    }

    attachHandlerNavigateToVersion() {
        this.onTagClick("navigate-to-version", (model) => {
            this.navigateToPageTag("econsent-sign", {
                trialUid: this.model.trialUid,
                econsentUid: model.econsentUid,
                ecoVersion: model.version,
                controlsShouldBeVisible: false
            });
        });
    }

    attachHandlerChangeStatus() {
        this.onTagClick("change-status", () => {
            const currentStatus = this.model.site.status;
            const nextStatus = currentStatus === "On Hold" ? "Active" : "On Hold";
            const question = `Are you sure you want to change status ? The current status is ${currentStatus}. The status will be changed in ${nextStatus}`;
            const modalConfig = {
                controller: "modals/ConfirmationAlertController",
                disableExpanding: false,
                disableBackdropClosing: true,
                question: question,
                title: "Confirm visit",
            };

            this.showModalFromTemplate(
                "confirmation-alert", (event) => {
                    if (event.detail) {
                        this.model.site.status = nextStatus;
                        this.updateSite();
                    }
                }, this.emptyCallback, modalConfig);
        });
    }

    attachHandlerEditRecruitmentPeriod() {
        this.onTagClick("edit-period", (model) => {
            const modalConfig = {
                controller: "modals/EditRecruitmentPeriodController",
                disableExpanding: false,
                disableBackdropClosing: true,
                title: "Edit Recruitment Period",
                recruitmentPeriod: this.model.trial.recruitmentPeriod
            };

            this.showModalFromTemplate(
                "edit-recruitment-period", (event) => {
                    let recruitmentPeriod = event.detail;
                    const startDate = new Date(recruitmentPeriod.startDate).toLocaleDateString();
                    const endDate = new Date(recruitmentPeriod.endDate).toLocaleDateString();
                    this.model.trial.recruitmentPeriod = recruitmentPeriod;
                    this.model.trial.recruitmentPeriod.toShowDate = `${startDate} - ${endDate}`;
                    this.TrialService.updateTrialAsync(this.model.trial)
                }, this.emptyCallback, modalConfig);
        });
    }

    getSite() {
        this.SiteService.getSites((err, sites) => {
            if (err) {
                return console.log(err);
            }

            if (sites && sites.length > 0) {
                let filtered = sites?.filter(site => site.trialKeySSI === this.model.trial.keySSI);
                if (filtered) this.model.site = filtered[0];
            }
        });
    }

    updateSite() {
        this.SiteService.updateEntity(this.model.site, (err, site) => {
            if (err) {
                return console.log(err);
            }

            console.log("[Updated Site]", site);
        });
    }

    getInitModel() {
        return {
            trial: {},
            trialParticipants: [],
            // trialSSI: this.getState(),
            subjects: {
                planned: "",
                screened: "",
                enrolled: "",
                percentage: "",
                withdrew: "",
                declined: "",
            },
            econsents: [],
        }
    }
}
