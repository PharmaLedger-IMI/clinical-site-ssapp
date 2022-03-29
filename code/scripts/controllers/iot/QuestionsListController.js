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
        this.model.questions = data;
        this.model.elements = 6;
        this.setPageSize(this.model.elements);
        this.model.noOfColumns = 3;
    }

    async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
        console.log({startOffset, dataLengthForCurrentPage});
        if (this.model.questions.length <= dataLengthForCurrentPage) {
            this.setPageSize(this.model.questions.length);
        }
        else {
            this.setPageSize(this.model.elements);
        }
        let slicedData = [];
        this.setRecordsNumber(this.model.questions.length);
        if (dataLengthForCurrentPage > 0) {
            slicedData = Object.entries(this.model.questions).slice(startOffset, startOffset + dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        } else {
            slicedData = Object.entries(this.model.questions).slice(0, startOffset - dataLengthForCurrentPage).map(entry => entry[1]);
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

        this.model.hasProms = false;
        this.model.hasPrems = false;
        this.model.currentTable = "none"

        this._attachHandlerAddNewQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this.initServices();
    }

    initServices() {
        this.getQuestionnaire();
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
            //this.updateSampleQuestionnaire();
        });
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('new:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms"
            console.log("prom")
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('new:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems"
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
            prom: [
                {
                    question: "Mobility",
                    type: "slider",
                    uid: "#generatedUID",
                    minLabel: "No Mobility",
                    maxLabel: "Normal mobility",
                    steps: 10
                },
                {
                    question: "Treatment",
                    type: "checkbox",
                    options: ["Option 1", "Option 2", "Option 3"],
                    uid: "#generatedUID"
                },
                {
                    question: "Usual Activities", type: "free-text", uid: "#generatedUID"
                }
            ],
            prem: [
                {
                    question: "PREM Activities", type: "free-text", uid: "#generatedUID"
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
        this.model.qes.prem.push(
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
        const getQuestions = () => {
            return new Promise ((resolve, reject) => {
                this.QuestionnaireService.getAllQuestionnaires((err, data ) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                })
            })
        }

        getQuestions().then(data => {
            this.model.questionnaire = data[0];
            if (!this.model.questionnaire){
                console.log("Initial Questionnaire is not created");
            }
            else{
                this.model.hasProms = this.model.questionnaire.prom.length !== 0;
                this.model.PromsDataSource = new QuestionsDataSource(this.model.questionnaire.prom);
                const { PromsDataSource } = this.model;
                this.onTagClick("prom-prev-page", () => PromsDataSource.goToPreviousPage());
                this.onTagClick("prom-next-page", () => PromsDataSource.goToNextPage());
                this.onTagClick("prom-edit", (model) => {
                    console.log(model);
                });
                this.onTagClick("prom-delete", (model) => {
                    console.log(model);
                });
                this.model.hasPrems = this.model.questionnaire.prem.length !== 0;
                this.model.PremsDataSource = new QuestionsDataSource(this.model.questionnaire.prem);
                const { PremsDataSource } = this.model;
                this.onTagClick("prem-prev-page", () => PremsDataSource.goToPreviousPage());
                this.onTagClick("prem-next-page", () => PremsDataSource.goToNextPage());
                this.onTagClick("prem-edit", (model) => {
                    console.log(model);
                });
                this.onTagClick("prem-delete", (model) => {
                    console.log(model);
                });
            }
        })


    }








}
