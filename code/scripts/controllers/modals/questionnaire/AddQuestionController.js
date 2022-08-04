const commonServices = require("common-services");

const {WebcController} = WebCardinal.controllers;


export default class AddTrialParticipantController extends WebcController {
    constructor(...props) {
        super(...props);


        this.model = {
            currentView: "none",
            currentAnswerType: "none",
            questionType : props[0].questionType,
            formIsInvalid:true,
            ...this.getQuestionsFormModel()
        };


        this.monitorAnswerType();
        this.attachHandlerSaveQuestion();
        this.attachHandlerAddAnswer();


        this.model.onChange("question",this.validateForm.bind(this))
        this.model.onChange("answers",this.validateForm.bind(this))
        this.model.onChange("slider",this.validateForm.bind(this))


    }



    monitorAnswerType(){
        this.model.onChange('answerType.value', () => {
            switch (this.model.answerType.value) {
                case "checkbox":
                    this.model.currentAnswerType = "checkbox-answer";
                    this.model.answers = [{
                        optionValue: "",
                        optionNumber: 1,
                        removalIsDisabled:true
                    }];
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



    attachHandlerSaveQuestion() {
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

    attachHandlerAddAnswer() {

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


    randomQuestionId(){
        let max = Date.now();
        let qId = Math.floor(Math.random() * max);
        return qId;
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


