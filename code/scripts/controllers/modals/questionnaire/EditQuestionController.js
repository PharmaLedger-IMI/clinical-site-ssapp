const commonServices = require("common-services");

const {WebcController} = WebCardinal.controllers;
const {QuestionnaireService} = commonServices;
const DataSourceFactory = commonServices.getDataSourceFactory();


export default class EditQuestionController extends WebcController {
    constructor(...props) {
        super(...props);

        let state = props[0].state;

        this.model = {
            action: props[0].action,
            trialSSI: state.trialSSI,
            trialName: state.trialName,
            questionID: state.questionID,
            view: "none",
            formIsInvalid:true,
            ...this.getQuestionsFormModel()
        };

        this.initServices();
        this.initHandlers();


        this.monitorAnswerType();
        this.attachHandlerEditAnswer();
        this.attachHandlerSave();

        this.model.onChange("question",this.validateForm.bind(this))
        this.model.onChange("answers",this.validateForm.bind(this))
        this.model.onChange("slider",this.validateForm.bind(this))
    }


    initHandlers() {
        this._attachHandlerEdit();
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
                    this.model.view = "freetext"
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.answerType.value = "free text";
                    break;
                case "slider":
                    this.model.view = "slider"
                    this.model.answerType.value = "slider";
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.slider.minimum.value = this.model.chosenQuestion.minLabel;
                    this.model.slider.maximum.value = this.model.chosenQuestion.maxLabel;
                    this.model.slider.steps.value = this.model.chosenQuestion.steps;
                    break;
                case "checkbox":
                    this.model.view = "checkbox"
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

    _attachHandlerEdit() {
        this.onTagEvent('update', 'click', (model, target, event) => {
            window.WebCardinal.loader.hidden = false;

            switch (this.model.chosenQuestion.task) {
                case "prem":
                    this.model.questionnaire.prem[this.model.indexPrems].question = this.model.question.value;
                    break;
                case "prom":
                    this.model.questionnaire.prom[this.model.indexProms].question = this.model.question.value;
                    break;
            }

            switch (this.model.chosenQuestion.type) {
                case "slider":
                    switch (this.model.chosenQuestion.task) {
                        case "prem":
                            this.model.questionnaire.prem[this.model.indexPrems].minLabel = this.model.slider.minimum.value;
                            this.model.questionnaire.prem[this.model.indexPrems].maxLabel = this.model.slider.maximum.value;
                            this.model.questionnaire.prem[this.model.indexPrems].steps = this.model.slider.steps.value;
                            break;
                        case "prom":
                            this.model.questionnaire.prom[this.model.indexProms].minLabel = this.model.slider.minimum.value;
                            this.model.questionnaire.prom[this.model.indexProms].maxLabel = this.model.slider.maximum.value;
                            this.model.questionnaire.prom[this.model.indexProms].steps = this.model.slider.steps.value;
                            break;
                    }
                    break;
            }

            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                let message ={}

                if (err) {
                    console.log(err);
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = "The question has been updated!";
                    message.type = 'success';
                }

                window.WebCardinal.loader.hidden = true;
            });
        });
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

    attachHandlerSave() {
        this.onTagEvent('save:question', 'click', (model, target, event) => {

            window.WebCardinal.loader.hidden = false;

            let question = {
                question: this.model.question.value,
                type: this.model.answerType.value,
                uid: this.model.chosenQuestion.uid,
            }

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

    attachHandlerEditAnswer() {

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


