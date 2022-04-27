const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();


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
            else if (this.model.chosenQuestion.type==="checkbox"){
                this.model.view = "checkbox"
                this.model.question.value = this.model.chosenQuestion.question;
                this.model.options = this.model.chosenQuestion.options;
                this.model.hasOptions = this.model.options.length !== 0;
                this.model.OptionsDataSource = DataSourceFactory.createDataSource(3, 6, this.model.options);
                const { OptionsDataSource } = this.model;
                this.onTagClick("option-prev-page", () => OptionsDataSource.goToPreviousPage());
                this.onTagClick("option-next-page", () => OptionsDataSource.goToNextPage());
                this.onTagClick("option-edit", (model) => {
                    this.model.answer.value = model.element;
                    this.model.chosenAnswer = model.element;
                });
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
                        console.log("updated prem free text question");
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
                        console.log("updated prom free text question");
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
                        console.log("updated prem slider question");
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
                        console.log("updated prom slider question");
                        console.log(data);
                    });
                }
            }
            else if (this.model.chosenQuestion.type === "checkbox") {
                if (!this.model.chosenAnswer) {return undefined;}
                if (this.model.chosenQuestion.task ==="prem") {
                    let prems = this.model.questionnaire.prem;
                    let index = prems.findIndex(prems => prems.uid === this.model.questionID);
                    this.model.questionnaire.prem[index].question = this.model.question.value;
                    let answers = this.model.options;
                    let answerIndex = answers.findIndex(answers => answers.element === this.model.chosenAnswer);
                    this.model.questionnaire.prem[index].options[answerIndex].element = this.model.answer.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        window.WebCardinal.loader.hidden = true;
                        console.log("updated prem checkbox question");
                        console.log(data);
                    });
                }
                else if (this.model.chosenQuestion.task ==="prom") {
                    let proms = this.model.questionnaire.prom;
                    let index = proms.findIndex(proms => proms.uid === this.model.questionID);
                    this.model.questionnaire.prom[index].question = this.model.question.value;
                    let answers = this.model.options;
                    let answerIndex = answers.findIndex(answers => answers.element === this.model.chosenAnswer);
                    this.model.questionnaire.prom[index].options[answerIndex].element = this.model.answer.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        window.WebCardinal.loader.hidden = true;
                        console.log("updated prom checkbox question");
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
            answer: {
                name: 'answer',
                id: 'answer',
                label: "Update the answer:",
                placeholder: 'Insert the new answer',
                required: true,
                value: ""
            },
            options: []
        }
    }


}
