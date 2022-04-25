const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


let getInitModel = () => {
    return {
        trials: {},
        selected_trial: {}
    };
};

export default class EditQuestionsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = {
            ...getInitModel(),
            trialSSI: prevState.trialSSI,
            trialName: prevState.trialName,
            questionID: prevState.questionID,
            model: prevState.model
        };

       this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Edit IoT Questions",
                tag: "edit-questions"
            }
        );

        this.model = this.getQuestionsFormModel();

        this.initServices();
        this.initHandlers();

    }

    initHandlers(){
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
            this.model.question = this.model.model.question
            this.model.answerType = this.model.model.answerType
            this.model.checkbox.options = this.model.model.answers
        })
    }

    _attachHandlerEdit() {
        this.onTagEvent('edit', 'click', (model, target, event) => {

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
            uid : {
                name: 'uid',
                id: 'uid',
                label: "UID:",
                placeholder: 'ID of the question',
                required: false,
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
            slider: {
                minLabel: "",
                maxLabel: "",
                steps: ""
            },
            checkbox: {
                options: []
            }
        }


    }




}
