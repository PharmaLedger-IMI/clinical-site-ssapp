const {WebcController} = WebCardinal.controllers;
import HCOService from '../../services/HCOService.js';
import QuestionnaireService from '../../services/QuestionnaireService.js';
const commonServices = require("common-services");
const { DataSource } = WebCardinal.dataSources;


let getInitModel = () => {
    return {
        trials: {},
        selected_trial: {}
    };
};

class QuestionsDataSource extends DataSource {
    constructor(data) {
        super();
        this.model.proms = data;
        this.model.elements = 5;
        this.setPageSize(this.model.elements);
        this.model.noOfColumns = 3;
    }

    async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
        console.log({startOffset, dataLengthForCurrentPage});
        if (this.model.proms.length <= dataLengthForCurrentPage) {
            this.setPageSize(this.model.proms.length);
        }
        else {
            this.setPageSize(this.model.elements);
        }
        let slicedData = [];
        this.setRecordsNumber(this.model.proms.length);
        if (dataLengthForCurrentPage > 0) {
            slicedData = Object.entries(this.model.proms).slice(startOffset, startOffset + dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        } else {
            slicedData = Object.entries(this.model.proms).slice(0, startOffset - dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        }
        return slicedData;
    }
}

export default class QuestionsListController extends WebcController {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        const { breadcrumb, ...state } = prevState;

        this.model = {
            ...getInitModel(),
            trialSSI: prevState.trialSSI,
        };

        this.model.breadcrumb = prevState.breadcrumb;
        this.model.breadcrumb.push({
            label: "IoT Edit Questions",
            tag: "edit-questions",
            state: state
        });

        this.model.hasQuestions = false;

        this._attachHandlerAddNewQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this.getQuestionnaire();

        this.initServices();
    }

    initServices() {
        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            this.model.trials = hcoDSU.volatile.trial;
            this.model.selected_trial = this.model.trials.find(t => t.uid === this.model.trialSSI);
        });
    }

    _attachHandlerAddNewQuestion() {
        this.onTagEvent('new:question', 'click', (model, target, event) => {
            this.saveSampleQuestionnaire();
        });
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('new:prom', 'click', (model, target, event) => {
            console.log("prom")
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('new:prem', 'click', (model, target, event) => {
            console.log("prem")
        });
    }

    saveSampleQuestionnaire(){
        let questions = {
            resourceType: "Questionnaire",
            id: "bb",
            text: {
                status: "generated",
                div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"></div>"
            },
            url: "http://hl7.org/fhir/Questionnaire/bb",
            title: "NSW Government My Personal Health Record",
            status: "draft",
            subjectType: "Patient",
            date: Date.now(),
            publisher: "New South Wales Department of Health",
            jurisdiction: [
                {
                    coding: [
                        {
                            system: "urn:iso:std:iso:3166",
                            code: "AU"
                        }
                    ]
                }
            ],
            prom:[
                {
                    question: "first", type:"slider", uid:"#generatedUID"
                },
                {
                    question: "questionnaire", type:"checkbox", options:["Option 1","Option 2","Option 3"],uid:"#generatedUID"
                },
                {
                    question: "created", type:"free-text",uid:"#generatedUID"
                }
            ]
        }

        this.QuestionnaireService = new QuestionnaireService();
        this.QuestionnaireService.saveQuestionnaire(questions, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log("First Questionnaire Saved")
        });
    }

    updateSampleQuestionnaire(){
        console.log(this.model.qes.prom);
        this.model.qes.prom.push(
            {
                question: "2342354", type:"slider", uid:"#generatedUID"
            },
            {
                question: "345345345", type:"checkbox", options:["Option 1","Option 2","Option 3"],uid:"#generatedUID"
            },
            {
                question: "234 234234", type:"free-text",uid:"#generatedUID"
            }
        )
        console.log(this.model.qes);
        this.QuestionnaireService = new QuestionnaireService();
        this.QuestionnaireService.updateQuestionnaire(this.model.qes, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log("Questionnaire updated")
        });
    }

    getQuestionnaire(){
        this.QuestionnaireService = new QuestionnaireService();
        this.QuestionnaireService.getAllQuestionnaires((err, data) => {
            if (err) {
                console.log(err);
            }
            this.model.qes = data[0];
            console.log(this.model.qes);
            if (!this.model.qes){
                console.log("it is empty")
            }
            else{
                this.model.hasQuestions = this.model.qes.length !== 0;
                console.log(this.model.qes.prom)
                this.model.questionsDataSource = new QuestionsDataSource(this.model.qes.prom);
                const { questionsDataSource } = this.model;

                this.onTagClick("view-evidence", (model) => {

                });

                this.onTagClick("prev-page", () => questionsDataSource.goToPreviousPage());
                this.onTagClick("next-page", () => questionsDataSource.goToNextPage());
            }
        });
    }








}
