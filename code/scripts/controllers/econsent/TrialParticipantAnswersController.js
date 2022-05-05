import HCOService from "../../services/HCOService.js";
import TrialService from '../../services/TrialService.js';
const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
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

export default class TrialParticipantAnswersController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = {
            ...getInitModel(),
            trialSSI: prevState.trialSSI
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Questionnaire Answers",
                tag: "trial-participant-answers"
            }
        );
        this.model.message = "";

        this.model.hasProms = false;
        this.model.hasPrems = false;
        this.model.currentTable = "none"

        this.initHandlers();
        this.initServices();
    }

    initHandlers(){
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
    }

    initServices() {
        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            this.model.trials = hcoDSU.volatile.trial;
            this.model.selected_trial = this.model.trials.find(t => t.uid === this.model.trialSSI);
        });

        let promAnswers = [
            {
                question: "Question About Mobility",
                answer: "I have moderate problems in walking about",
                possibleAnswers: [
                    "I have no problems in walking about",
                    "I have slight problems in walking about",
                    "I have moderate problems in walking about",
                    "I have severe problems in walking about",
                    "I am unable to walk about"
                ],
                date: "25/04/2022"
            },
            {
                question: "Indicate how your health is TODAY",
                answer: "7",
                possibleAnswers: [
                    "Min: The worst health you can imagine",
                    "Max: The best health you can imagine",
                    "Steps: 10"
                ],
                date: "26/04/2022"
            }
        ];

        let premAnswers = [
            {
                question: "Were you involved, as much as you wanted to be, in decisions about your care and treatment?",
                answer: "Yes, to some extent",
                possibleAnswers: [
                    "Not Available"
                ],
                date: "25/04/2022"
            }
        ];
        this.model.hasPromsAnswers = promAnswers.length !== 0;
        this.model.PromsDataSource = DataSourceFactory.createDataSource(4, 6, promAnswers);
        const { PromsDataSource } = this.model;
        this.onTagClick("prom-prev-page", () => PromsDataSource.goToPreviousPage());
        this.onTagClick("prom-next-page", () => PromsDataSource.goToNextPage());

        this.model.hasPremsAnswers = premAnswers.length !== 0;
        this.model.PremsDataSource = DataSourceFactory.createDataSource(4, 6, premAnswers);
        const { PremsDataSource } = this.model;
        this.onTagClick("prem-prev-page", () => PremsDataSource.goToPreviousPage());
        this.onTagClick("prem-next-page", () => PremsDataSource.goToNextPage());

    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('new:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms"
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('new:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems"
        });
    }

    _attachHandlerGoBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }
}
