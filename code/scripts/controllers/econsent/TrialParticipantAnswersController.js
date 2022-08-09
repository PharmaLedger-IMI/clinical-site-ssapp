import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const {ResponsesService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();


let getInitModel = () => {
    return {
        trial: {},
        trialParticipants: [],
        currentTable: "proms",
        pageIsInitialized: false,
        promSelected: true,
        premSelected: false,
        hasProms: false,
        hasPrems: false,
        promAnswers: [],
        premAnswers: [],
    };
};

export default class TrialParticipantAnswersController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = {
            ...getInitModel(),
            trialSSI: prevState.trialSSI,
            tpUid: prevState.tpUid,
            patientDID: prevState.participantDID,
            patientName:prevState.patientName
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Questionnaire Answers",
                tag: "trial-participant-answers"
            }
        );

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
        this.ResponsesService = new ResponsesService();
        this.ResponsesService.getResponses((err, data) => {
            if (err) {
                return console.log(err);
            }
            console.log(data);
            data.forEach(response => {
                response.forEach(answer => {
                    console.log(answer);
                    if(answer.patientDID === this.model.patientDID){
                        const datetime = answer.responseDate; // anything
                        const date = new Date(datetime);
                        const options = {
                            year: 'numeric', month: 'numeric', day: 'numeric',
                        };
                        const formattedDate = date.toLocaleDateString('en', options);

                        this.filterAnswers(answer, formattedDate);
                    }
                })
            })
            this.buildDataSources();
        });
    }

    buildDataSources(){
        this.model.hasProms = this.model.toObject('promAnswers').length !== 0;
        this.model.PromsDataSource = DataSourceFactory.createDataSource(4, 6, this.model.promAnswers);
        this.model.hasPrems =  this.model.toObject('premAnswers').length !== 0;
        this.model.PremsDataSource = DataSourceFactory.createDataSource(4, 6, this.model.premAnswers);
        this.model.pageIsInitialized = true;
    }

    filterAnswers(answer, formattedDate) {
        let question = {
            question: answer.question.title,
            answer: answer.answer,
            date: formattedDate
        }

        if (answer.question.type === "slider") {
            const minLabel = answer.question.slider.minLabel;
            const maxLabel = answer.question.slider.maxLabel;
            const steps = answer.question.slider.steps;
            const possibleAnswers = "Min:" + minLabel + " " + "Max:" + maxLabel + " " + "Steps:" + steps;

            question.possibleAnswers = possibleAnswers;
        }

        if (answer.question.type === "checkbox") {
            let options = []
            for (let i = 0; i < answer.question.options.length; i++) {
                options.push(answer.question.options[i].value);
            }

            question.possibleAnswers = options;
        }

        if (answer.question.type === "string") {
            question.possibleAnswers = [
                "Not Available"
            ]
        }
        if (answer.question.task === "prom") {
            this.model.promAnswers.push(question);
        }
        if (answer.question.task === "prem") {
            this.model.premAnswers.push(question);
        }
    }


    _attachHandlerPromQuestions() {
        this.onTagEvent('new:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms";
            this.model.promSelected = true;
            this.model.premSelected = false;
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('new:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems";
            this.model.promSelected = false;
            this.model.premSelected = true;
        });
    }
}
