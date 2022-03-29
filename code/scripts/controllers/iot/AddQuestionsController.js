const {WebcController} = WebCardinal.controllers;
import QuestionnaireService from '../../services/QuestionnaireService.js';


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

        this.model.currentTable = "none"
        this.model = this.getQuestionsFormModel();

        this.model.answers = []

        this._attachHandlerSaveQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerAddAnswer();
    }

    _attachHandlerSaveQuestion() {
        this.onTagEvent('save:question', 'click', (model, target, event) => {
            //this.saveSampleQuestionnaire();
            console.log("save question")
            //this.updateSampleQuestionnaire();
        });
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('add:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms"
            console.log("prom")
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('add:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems"
            console.log("prem")
        });
    }

    _attachHandlerAddAnswer() {
        this.onTagEvent('add:answer', 'click', (model, target, event) => {
            this.model.answers.push({
                element: this.model.answer.value
            })
        });
    }

    getQuestionsFormModel() {
        return {
            question: {
                name: 'question',
                id: 'question',
                label: "Question:",
                placeholder: 'Insert new question',
                required: true
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
            }
        }


    }




}
