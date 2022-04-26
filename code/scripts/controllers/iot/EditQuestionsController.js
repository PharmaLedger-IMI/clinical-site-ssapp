const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class EditQuestionsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = this.getState();
        this.model = {
            trialSSI: prevState.trialSSI,
            trialName: prevState.trialName,
            questionID: prevState.questionID
        };

       this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Edit IoT Questions",
                tag: "edit-questions"
            }
        );
        this.model.view = "none";
        this.model = this.getQuestionsFormModel();

        this.initServices();
        this.initHandlers();

    }

    initHandlers(){
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
            console.log(this.model.chosenQuestion)


            if (this.model.chosenQuestion.type==="free text"){
                this.model.view = "freetext"
                this.model.question.value = this.model.chosenQuestion.question;
            }
            else if (this.model.chosenQuestion.type==="slider"){
                this.model.view = "slider"
                this.model.question.value = this.model.chosenQuestion.question;
                this.model.sliderMin.value = this.model.chosenQuestion.minLabel;
                this.model.sliderMax.value = this.model.chosenQuestion.maxLabel;
                this.model.sliderSteps.value = this.model.chosenQuestion.steps;
            }




        })
    }

    _attachHandlerEdit() {
        this.onTagEvent('update', 'click', (model, target, event) => {

            if (this.model.chosenQuestion.type==="free text") {
                if (this.model.chosenQuestion.task ==="prem") {
                    let prems = this.model.questionnaire.prem;
                    let index = prems.findIndex(prems => prems.uid === this.model.questionID);
                    this.model.questionnaire.prem[index].question = this.model.question.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        window.WebCardinal.loader.hidden = true;
                        console.log("updated");
                        console.log(data);
                    });
                }
                else if (this.model.chosenQuestion.task ==="prom") {
                    let proms = this.model.questionnaire.prom;
                    let index = proms.findIndex(proms => proms.uid === this.model.questionID);
                    this.model.questionnaire.prom[index].question = this.model.question.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        window.WebCardinal.loader.hidden = true;
                        console.log("updated");
                        console.log(data);
                    });
                }
            }
            else if (this.model.chosenQuestion.type==="slider"){
                if (this.model.chosenQuestion.task ==="prem") {
                    let prems = this.model.questionnaire.prem;
                    let index = prems.findIndex(prems => prems.uid === this.model.questionID);
                    this.model.questionnaire.prem[index].question = this.model.question.value;
                    this.model.questionnaire.prem[index].minLabel = this.model.sliderMin.value;
                    this.model.questionnaire.prem[index].maxLabel = this.model.sliderMax.value;
                    this.model.questionnaire.prem[index].steps = this.model.sliderSteps.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        window.WebCardinal.loader.hidden = true;
                        console.log("updated");
                        console.log(data);
                    });
                }
                else if (this.model.chosenQuestion.task ==="prom") {
                    let proms = this.model.questionnaire.prom;
                    let index = proms.findIndex(proms => proms.uid === this.model.questionID);
                    this.model.questionnaire.prom[index].question = this.model.question.value;
                    this.model.questionnaire.prom[index].minLabel = this.model.sliderMin.value;
                    this.model.questionnaire.prom[index].maxLabel = this.model.sliderMax.value;
                    this.model.questionnaire.prom[index].steps = this.model.sliderSteps.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        window.WebCardinal.loader.hidden = true;
                        console.log("updated");
                        console.log(data);
                    });
                }
            }



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
            sliderMin: {
                name: 'slidermin',
                id: 'slidermin',
                label: "Minimum value:",
                placeholder: 'Insert the minimum',
                required: true,
                value: ""
            },
            sliderMax: {
                name: 'slidermax',
                id: 'slidermax',
                label: "Maximum value:",
                placeholder: 'Insert the maximum',
                required: true,
                value: ""
            },
            sliderSteps: {
                name: 'slidersteps',
                id: 'slidersteps',
                label: "Steps:",
                placeholder: 'Insert the steps',
                required: true,
                value: ""
            },
            checkbox: [
                {
                    answer: "answer1",
                    id: "fghtyrgytry"
                },
                {
                    answer: "answer2",
                    id: "sdfasdafasdf"
                },
                {
                    answer: "answer3",
                    id: "dfsdffsdf"
                }
            ]
        }


    }




}
