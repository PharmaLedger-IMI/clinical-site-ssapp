import HCOService from "../../services/HCOService.js";
import TrialService from '../../services/TrialService.js';
const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const {ResponsesService} = commonServices;
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
            trialSSI: prevState.trialSSI,
            tpUid: prevState.tpUid,
            patientDID: prevState.participantDID
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Questionnaire Answers",
                tag: "trial-participant-answers"
            }
        );

        this.model.hasProms = false;
        this.model.hasPrems = false;
        this.model.currentTable = "none"
        this.model.promAnswers = [];
        this.model.premAnswers = [];

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
                        if(answer.question.type ==="range"){
                            const minLabel = answer.question.range.minLabel;
                            const maxLabel = answer.question.range.maxLabel;
                            const steps = answer.question.range.steps;
                            const possibleAnswers = "Min:" + minLabel +" "+ "Max:" + maxLabel +" "+ "Steps:"+ steps;
                            if(answer.question.task === "prom"){
                                let prom = {
                                    question: answer.question.title,
                                    answer:answer.answer,
                                    possibleAnswers: possibleAnswers,
                                    date: formattedDate
                                }
                                this.model.promAnswers.push(prom);
                            }else if(answer.question.task === "prem"){
                                let prem = {
                                    question: answer.question.title,
                                    answer:answer.answer,
                                    possibleAnswers: possibleAnswers,
                                    date: formattedDate
                                }
                                this.model.premAnswers.push(prem);
                            }
                        } else if (answer.question.type ==="radio"){

                            let options = []
                            for(let i = 0; i< answer.question.options.length; i++){
                                options.push(answer.question.options[i].value);
                            }

                            if(answer.question.task === "prom"){
                                let prom = {
                                    question: answer.question.title,
                                    answer:answer.answer,
                                    possibleAnswers: options,
                                    date: formattedDate
                                }
                                this.model.promAnswers.push(prom);

                            }else if(answer.question.task === "prem"){
                                let prem = {
                                    question: answer.question.title,
                                    answer:answer.answer,
                                    possibleAnswers: options,
                                    date: formattedDate
                                }
                                this.model.premAnswers.push(prem);
                            }
                        } else if (answer.question.type ==="string"){
                            if(answer.question.task === "prom"){
                                let prom = {
                                    question: answer.question.title,
                                    answer:answer.answer,
                                    possibleAnswers: [
                                        "Not Available"
                                    ],
                                    date: formattedDate
                                }
                                this.model.promAnswers.push(prom);
                            }else if(answer.question.task === "prem"){
                                let prem = {
                                    question: answer.question.title,
                                    answer:answer.answer,
                                    possibleAnswers: [
                                        "Not Available"
                                    ],
                                    date: formattedDate
                                }
                                this.model.premAnswers.push(prem);
                            }
                        }
                    }
                })
            })
            this.buildDataSources();
        });
    }

    buildDataSources(){
        this.model.hasProms = true;
        this.model.PromsDataSource = DataSourceFactory.createDataSource(4, 6, this.model.promAnswers);
        this.model.hasPrems = true;
        this.model.PremsDataSource = DataSourceFactory.createDataSource(4, 6, this.model.premAnswers);
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
}
