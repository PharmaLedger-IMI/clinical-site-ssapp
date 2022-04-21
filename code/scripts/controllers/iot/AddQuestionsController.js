const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


let getInitModel = () => {
    return {
        trials: {},
        selected_trial: {}
    };
};

export default class AddQuestionsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = {
            ...getInitModel(),
            trialUid: prevState.trialUid,
            trialName: prevState.trialName
        };

       this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Add IoT Questions",
                tag: "add-questions"
            }
        );

        this.model = this.getQuestionsFormModel();
        this.model.currentView = "none"

        this.initServices();
        this.initHandlers();

    }

    initHandlers(){
        this._attachHandlerSaveQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerAddAnswer();
    }

    initServices() {
        this.QuestionnaireService = new QuestionnaireService();
        this.getQuestionnaire();
        this.monitorAnswerType();
    }

    monitorAnswerType(){
        this.model.onChange('answerType.value', () => {
            switch (this.model.answerType.value) {
                case "checkbox":
                    this.model.answers = []
                    this.model.answer.disabled = false;
                    this.model.answer.label = "Insert the options one by one";
                    this.model.answer.placeholder = "For each option hit OK";
                    break;
                case "slider":
                    this.model.answers = []
                    this.model.answer.disabled = false;
                    this.model.answer.label = "Insert the values min, max, steps one by one";
                    this.model.answer.placeholder = "For each option hit OK"
                    break;
                case "free text":
                    this.model.answers = []
                    this.model.answer.disabled = true;
                    this.model.answer.label = "No answer required";
                    this.model.answer.placeholder = "No answer required"
                    break;
            }
        });
    }

    _attachHandlerSaveQuestion() {
        this.onTagEvent('save:question', 'click', (model, target, event) => {

            window.WebCardinal.loader.hidden = false;

            let question = {
                question: this.model.question.value,
                type: this.model.answerType.value,
                uid: this.randomQuestionId(),
                task: "",
                schedule: {
                    startDate: "",
                    endDate: "",
                    repeatAppointment: ""
                },
                status: "active"
            }

            switch (this.model.answerType.value) {
                case "slider":
                    question = Object.assign(question, {
                        minLabel: this.model.answers[0].element,
                        maxLabel: this.model.answers[1].element,
                        steps: this.model.answers[2].element,
                    });
                    break;
                case "checkbox":
                    question = Object.assign(question, {
                        options: Object.values(this.model.answers)
                    });
                    break;
            }

            switch (this.model.currentView) {
                case "prom":
                    this.model.questionnaire.prom.push(question);
                    break;
                case "prem":
                    this.model.questionnaire.prem.push(question);
                    break;
            }

            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                if (err) {
                    console.log(err);
                }
                window.WebCardinal.loader.hidden = true;
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "Question included!",
                    redirectPage: "econsent-trial-management",
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            });
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

    randomQuestionId(){
        let max = Date.now();
        let qId = Math.floor(Math.random() * max);
        return qId;
    }

    generateInitialQuestionnaire() {
        let questionnaire = {
            resourceType: "Questionnaire",
            id: "bb",
            text: {
                status: "generated",
                div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"></div>"
            },
            url: "http://hl7.org/fhir/Questionnaire/bb",
            title: "NSW Government My Personal Health Record",
            status: "draft",
            subjectType: [
                "Patient"
            ],
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
            ],
            prem: [
            ]
        }
        this.QuestionnaireService.saveQuestionnaire(questionnaire, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log("Initial Questionnaire Generated!")
            this.model.questionnaire = data;
        });
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('add:prom', 'click', (model, target, event) => {
            this.model.currentView = "prom"
            this.model = this.getQuestionsFormModel();
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('add:prem', 'click', (model, target, event) => {
            this.model.currentView = "prem"
            this.model = this.getQuestionsFormModel();
        });
    }

    _attachHandlerAddAnswer() {
        this.onTagEvent('add:answer', 'click', (model, target, event) => {
            if (this.model.answerType.value === "checkbox") {
                this.model.answer.placeholder = "Insert the options one by one"
            }
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
                required: false,
                disabled: false,
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
