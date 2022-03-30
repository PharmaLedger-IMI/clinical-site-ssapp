const {WebcController} = WebCardinal.controllers;
const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;


let getInitModel = () => {
    return {
        trials: {},
        selected_trial: {}
    };
};



export default class AddQuestionsController extends WebcController {

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
            label: "Add IoT Questions",
            tag: "add-questions",
            state: state
        });

        this.model = this.getQuestionsFormModel();
        this.model.currentView = "none"

        this.initServices();
        this._attachHandlerSaveQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerAddAnswer();
    }

    initServices() {
        this.QuestionnaireService = new QuestionnaireService();
        this.getQuestionnaire();
    }

    _attachHandlerSaveQuestion() {
        this.onTagEvent('save:question', 'click', (model, target, event) => {
            // this.saveSampleQuestionnaire();
            console.log("save question")
            console.log(this.model.question.value)
            console.log(this.model.answerType.value)
            console.log(this.model.answers)
            console.log(this.model.currentView)

            console.log(this.model.questionnaire)

            if (this.model.currentView === "proms"){
                this.model.questionnaire.prom.push({
                    question: this.model.question.value,
                    type: this.model.answerType.value,
                    options: this.model.answers,
                    uid: Date.now()
                })
                this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                    if (err) {
                        console.log(err);
                    }
                    console.log("Questionnaire updated")
                });
            }

            else if(this.model.currentView === "prems"){
                this.model.questionnaire.prem.push({
                    question: this.model.question.value,
                    type: this.model.answerType.value,
                    options: this.model.answers,
                    uid: Date.now()
                })
                this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                    if (err) {
                        console.log(err);
                    }
                    console.log("Questionnaire updated")
                });
            }

        });
    }

    getQuestionnaire(){
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
                console.log("Initial Questionnaire is not created. Generating now the initial questionnaire.");
                this.generateInitialQuestionnaire();
            }
            else{
                console.log("Initial questionnaire exists!")
            }
        })
    }

    generateInitialQuestionnaire() {
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
        this.QuestionnaireService.saveQuestionnaire(questions, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log("Initial Questionnaire Generated!")
            this.model.questionnaire = data;
        });
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('add:prom', 'click', (model, target, event) => {
            this.model.currentView = "proms"
            this.model = this.getQuestionsFormModel();
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('add:prem', 'click', (model, target, event) => {
            this.model.currentView = "prems"
            this.model = this.getQuestionsFormModel();
        });
    }

    _attachHandlerAddAnswer() {
        this.onTagEvent('add:answer', 'click', (model, target, event) => {
            this.model.answers.push({
                element: this.model.answer.value
            })
            this.model.answer.value = ""
        });
    }

    getQuestionsFormModel() {
        return {
            question: {
                name: 'question',
                id: 'question',
                label: "Question:",
                placeholder: 'Insert new question',
                required: true,
                value: ""
            },
            answer:{
                name: 'answer',
                id: 'answer',
                label: "Answer:",
                placeholder: 'Insert new answer',
                required: true,
                value: ""
            },
            answerType: {
                label: "Answer Type:",
                required: true,
                options: [{
                        label: "Checkbox",
                        value: 'checkbox'
                },
                    {
                        label: "Slider",
                        value: 'slider'
                    },
                    {
                        label: "Free Text",
                        value: 'free text'
                    }
                ],
                value: ""
            },
            answers: []
        }


    }




}
