const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


let getInitModel = () => {
    return {
        selected_trial: {}
    };
};

export default class AddQuestionsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = {
            ...getInitModel(),
            trialSSI: prevState.trialSSI,
            trialName: prevState.trialName,
            currentView: "none",
            ...this.getQuestionsFormModel()
        };

       this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Add IoT Questions",
                tag: "add-questions"
            }
        );

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
                uid: this.randomQuestionId()
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
                    question = Object.assign(question, {
                        task: "prom"
                    });
                    this.model.questionnaire.prom.push(question);
                    break;
                case "prem":
                    question = Object.assign(question, {
                        task: "prem"
                    });
                    this.model.questionnaire.prem.push(question);
                    break;
            }

            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                let message ={}

                if (err) {
                    console.log(err);
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = "The question has been added!";
                    message.type = 'success';
                }

                window.WebCardinal.loader.hidden = true;

                this.navigateToPageTag('questions-list', {
                    message: message,
                    breadcrumb: this.model.toObject('breadcrumb'),
                    trialSSI: this.model.trialSSI
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
            this.model.questionnaire = data.filter(data => data.trialSSI === this.model.trialSSI)[0];
            if (!this.model.questionnaire){
                console.log("Initial Questionnaire not found for this trial.");
            }
            else{
                console.log("Initial questionnaire loaded for this trial.")
            }
        })
    }

    randomQuestionId(){
        let max = Date.now();
        let qId = Math.floor(Math.random() * max);
        return qId;
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
