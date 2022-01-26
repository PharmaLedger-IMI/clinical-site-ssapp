import HCOService from "../../services/HCOService.js";
import TrialService from "../../services/TrialService.js";

const {WebcController} = WebCardinal.controllers;

const commonServices = require("common-services");
const BaseRepository = commonServices.BaseRepository;
const Constants = commonServices.Constants;

export default class PatientsListController extends WebcController {

    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();
        this.initServices();
    }

    async initServices() {
        this.TrialService = new TrialService();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS, this.DSUStorage);
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();

        this.getTrialParticipants();
        this.initHandlers();
        this.initFilterOptions();
    }

    initFilterOptions() {
        Object.keys(Constants.ECO_STATUSES).forEach(key => {
            this.model.notifications.options.push({
                label: Constants.ECO_STATUSES[key],
                value: Constants.ECO_STATUSES[key]
            });
        });

        Object.keys(Constants.TRIAL_PARTICIPANT_STATUS).forEach(key => {
            this.model.statuses.options.push({
                label: Constants.TRIAL_PARTICIPANT_STATUS[key],
                value: Constants.TRIAL_PARTICIPANT_STATUS[key]
            });
        });
    }

    initHandlers() {
        this.attachHandlerNavigateToParticipant();
        this.attachHandlerViewTrialParticipantDetails();
        this.attachHandlerViewTrialParticipantStatus();
        this.attachHandlerGoBack();
        this.attachHandlerFilters();
        this.attachHandlerSearch();
        this.attachHandlerClearFilters();
    }

    async getTrialParticipants() {
        this.model.trialParticipants = this.model.hcoDSU.volatile.tps;
        this.model.trialParticipantsFinal = this.model.trialParticipants;
    }

    attachHandlerNavigateToParticipant() {
        this.onTagClick("navigate:tp", (model) => {
            this.navigateToPageTag("econsent-trial-participant", {
                trialSSI: model.trialSSI,
                tpUid: model.uid,
                trialParticipantNumber: model.number,
            });
        });
    }

    attachHandlerViewTrialParticipantStatus() {
        this.onTagClick("tp:status", (model) => {
            this.navigateToPageTag("econsent-trial-participant-details", {
                trialSSI: model.trialSSI,
                tpUid: model.uid
            });
        });
    }

    attachHandlerViewTrialParticipantDetails() {
        this.onTagClick("tp:details", (model) => {
            this.navigateToPageTag("econsent-trial-participant", {
                trialSSI: model.trialSSI,
                tpUid: model.uid
            });
        });
    }

    attachHandlerGoBack() {
        this.onTagClick("navigation:back", () => {
            this.history.goBack();
        });
    }

    attachHandlerFilters() {
        this.on("filters-changed", async () => {
            this.filterData();
        });
    }

    attachHandlerSearch() {
        const searchField = this.element.querySelector("#search-field");
        searchField.addEventListener("keydown", () => {
            setTimeout(() => {
                this.filterData();
            }, 300);
        });
    }

    attachHandlerClearFilters() {
        this.onTagClick("filters-cleared", async () => {
            this.model.statuses.value = null;
            this.model.notifications.value = null;
            this.model.search.value = null;
            this.filterData();
        });
    }

    filterData() {
        let result = this.model.trialParticipantsFinal;

        if (this.model.statuses.value) {
            result = result.filter((x) => x.status === this.model.statuses.value);
        }
        if (this.model.notifications.value) {
            result = result.filter((x) => x.actionNeeded === this.model.notifications.value);
        }

        if (this.model.search.value && this.model.search.value !== "") {
            result = result.filter((x) => x.name.toUpperCase().search(this.model.search.value.toUpperCase()) !== -1);
        }

        this.model.trialParticipants = result;
    }

    getInitModel() {
        return {
            trialSSI: this.getState(),
            trial: {},
            trialParticipants: [],
            statuses: {
                label: "Select a status",
                value: "",
                options: [{
                    label: "Please select an option",
                    value: "",
                    disabled: true
                }]
            },
            notifications: {
                label: "Select a notification for action",
                value: "",
                options: [{
                    label: "Please select an option",
                    value: "",
                    disabled: true
                }]
            },
            search: {
                label: "Search for a patient",
                placeholder: "Patient Name...",
                value: "",
                id: "search-field"
            }
        };
    }
}