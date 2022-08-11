const commonServices = require("common-services");
const {WebcController} = WebCardinal.controllers;
const {QuestionnaireService} = commonServices;
const ACTIONS = {
    EDIT: 'Edit',
    ADD: 'Create'
}

export default class AddOrEditQuestionController extends WebcController {
    constructor(...props) {
        super(...props);
        this.model = {
            ...this.model.toObject(),
            formIsInvalid: true,
            ...this.getQuestionsFormModel()
        }

        if(this.model.action === ACTIONS.EDIT) {
            this.initServices();
        }

        if(this.model.action === ACTIONS.ADD) {
            this.model.currentAnswerType = "none";
        }

        this.monitorAnswerType();
        this.attachHandlerAddOrEditAnswer();
        this.attachHandlerSaveQuestion();

        this.model.onChange("question",this.validateForm.bind(this))
        this.model.onChange("answers",this.validateForm.bind(this))
        this.model.onChange("slider",this.validateForm.bind(this))
    }



    initServices() {
        this.QuestionnaireService = new QuestionnaireService();
        this.getQuestionnaire();
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
            const dataPromsPrems = [...this.model.questionnaire.prom, ...this.model.questionnaire.prem];
            this.model.chosenQuestion = dataPromsPrems.filter(dataPromsPrems => dataPromsPrems.uid === this.model.questionID)[0];

            let prems = this.model.questionnaire.prem;
            this.model.indexPrems = prems.findIndex(prems => prems.uid === this.model.questionID);
            let proms = this.model.questionnaire.prom;
            this.model.indexProms = proms.findIndex(proms => proms.uid === this.model.questionID);

            switch (this.model.chosenQuestion.type) {
                case "free text":
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.answerType.value = "free text";
                    break;
                case "slider":
                    this.model.answerType.value = "slider";
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.slider.minimum.value = this.model.chosenQuestion.minLabel;
                    this.model.slider.maximum.value = this.model.chosenQuestion.maxLabel;
                    this.model.slider.steps.value = this.model.chosenQuestion.steps;
                    break;
                case "checkbox":
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.options = this.model.chosenQuestion.options;
                    this.model.hasOptions = this.model.options.length !== 0;
                    this.model.answerType.value = "checkbox";

                    let options = this.model.chosenQuestion.options;
                    options.forEach(option => {
                        this.model.answers.push({
                            optionValue: option.optionValue,
                            optionNumber: option.optionNumber,
                            removalIsDisabled: option.removalIsDisabled
                        });
                    })
                    break;
            }
        })
    }

    validateForm(){
        switch (this.model.answerType.value) {
            case "checkbox":
                this.model.formIsInvalid = this.model.answers.filter(answer => answer.optionValue.trim() === "").length > 0;
                if (this.model.formIsInvalid) {
                    break;
                }
                this.model.formIsInvalid = this.model.question.value.trim() === "";
                return;
            case "slider":
                const sliderValues = [this.model.slider.minimum.value, this.model.slider.maximum.value, this.model.slider.steps.value]
                this.model.formIsInvalid = sliderValues.some(value => value.trim() === "");
                if (this.model.formIsInvalid) {
                    break;
                }
                this.model.formIsInvalid = this.model.question.value.trim() === "";
                return;
            default:
                this.model.formIsInvalid = this.model.question.value.trim() === "";
        }
    }

    monitorAnswerType(){
        this.model.onChange('answerType.value', () => {
            switch (this.model.answerType.value) {
                case "checkbox":
                    this.model.currentAnswerType = "checkbox-answer";
                    this.model.answer.disabled = false;
                    this.model.answer.label = "Insert the options one by one";
                    this.model.answer.placeholder = "For each option hit OK";

                    if(this.model.action === ACTIONS.ADD || this.model.chosenQuestion.type !== 'checkbox') {
                        this.model.answers = [{
                            optionValue: "",
                            optionNumber: 1,
                            removalIsDisabled:true
                        }];
                    }

                    break;
                case "slider":
                    this.model.currentAnswerType = "slider-answer";
                    break;
                case "free text":
                    this.model.currentAnswerType = "free-text-answer";
                    break;
            }
            this.validateForm();
        });
    }

    attachHandlerSaveQuestion() {
        this.onTagEvent('save:question', 'click', (model, target, event) => {

            window.WebCardinal.loader.hidden = false;

            let question = {
                question: this.model.question.value,
                type: this.model.answerType.value,
            }

            if(this.model.action === ACTIONS.EDIT) {
                question.uid = this.model.chosenQuestion.uid;
            } else question.uid = this.randomQuestionId();

            switch (this.model.answerType.value) {
                case "slider":
                    question = Object.assign(question, {
                        minLabel: this.model.slider.minimum.value,
                        maxLabel: this.model.slider.maximum.value,
                        steps: this.model.slider.steps.value,
                    });
                    break;
                case "checkbox":
                    question = Object.assign(question, {
                        options: Object.values(this.model.answers)
                    });
                    break;
            }

            this.send('confirmed', question);
        });
    }

    randomQuestionId(){
        let max = Date.now();
        let qId = Math.floor(Math.random() * max);
        return qId;
    }

    attachHandlerAddOrEditAnswer() {

        let performValidationConstraints = () => {
            this.model.answers[0].removalIsDisabled = this.model.answers.length === 1;
        }

        this.onTagEvent("insert-option", 'click', (model, target, event) => {
            const changedOptionIndex = this.model.answers.findIndex(answer => answer.optionNumber === model.optionNumber);
            this.model.answers.splice(changedOptionIndex + 1, 0, {
                optionValue: "",
                optionNumber: changedOptionIndex + 1,
                removalIsDisabled: false
            });

            for (let i = changedOptionIndex + 1; i < this.model.answers.length; i++) {
                this.model.answers[i].optionNumber++;
            }
            performValidationConstraints();
        })

        this.onTagEvent("remove-option", 'click', (model, target, event) => {
            const changedOptionIndex = this.model.answers.findIndex(answer => answer.optionNumber === model.optionNumber);
            this.model.answers.splice(changedOptionIndex, 1,);

            for (let i = changedOptionIndex; i < this.model.answers.length; i++) {
                this.model.answers[i].optionNumber--;
            }
            performValidationConstraints();

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
                value: "free text"
            },
            answers: [],
            slider:{
                minimum:{
                    name: 'minimum',
                    id: 'minimum',
                    label: "Minimum:",
                    placeholder: 'Insert the minimum value',
                    required: true,
                    value: ""
                },
                maximum:{
                    name: 'maximum',
                    id: 'maximum',
                    label: "Maximum:",
                    placeholder: 'Insert the maximum value',
                    required: true,
                    value: ""
                },
                steps:{
                    name: 'steps',
                    id: 'steps',
                    label: "Steps:",
                    placeholder: 'Insert the steps',
                    required: true,
                    value: ""
                }
            }

        }
    }


}


