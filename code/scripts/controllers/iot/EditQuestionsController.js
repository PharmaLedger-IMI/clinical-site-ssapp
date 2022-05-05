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
            questionID: prevState.questionID,
            view: "none",
            ...this.getQuestionsFormModel()
        };

       this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Edit IoT Questions",
                tag: "edit-questions"
            }
        );

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

            let prems = this.model.questionnaire.prem;
            this.model.indexPrems = prems.findIndex(prems => prems.uid === this.model.questionID);
            let proms = this.model.questionnaire.prom;
            this.model.indexProms = proms.findIndex(proms => proms.uid === this.model.questionID);

            switch (this.model.chosenQuestion.type) {
                case "free text":
                    this.model.view = "freetext"
                    this.model.question.value = this.model.chosenQuestion.question;
                    break;
                case "slider":
                    this.model.view = "slider"
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.sliderMin.value = this.model.chosenQuestion.minLabel;
                    this.model.sliderMax.value = this.model.chosenQuestion.maxLabel;
                    this.model.sliderSteps.value = this.model.chosenQuestion.steps;
                    break;
                case "checkbox":
                    this.model.view = "checkbox"
                    this.model.question.value = this.model.chosenQuestion.question;
                    this.model.options = this.model.chosenQuestion.options;
                    this.model.hasOptions = this.model.options.length !== 0;
                    this.model.OptionsDataSource = DataSourceFactory.createDataSource(3, 6, this.model.options);
                    this.model.OptionsDataSource.__proto__.updateOptions = function() {
                        this.forceUpdate(true);
                    }
                    const {OptionsDataSource} = this.model;
                    this.onTagClick("option-prev-page", () => OptionsDataSource.goToPreviousPage());
                    this.onTagClick("option-next-page", () => OptionsDataSource.goToNextPage());
                    this.onTagClick("option-edit", (model) => {
                        this.model.chosenAnswer = model.element;
                        this.showModalFromTemplate(
                            'edit-answer',
                            (event) => {
                                const response = event.detail;
                                this.model.response = response;
                                this.model.updatedAnswer = this.model.response.updatedAnswer;

                                switch (this.model.chosenQuestion.task) {
                                    case "prem":
                                        let answersPrems = this.model.options;
                                        let answerPremsIndex = answersPrems.findIndex(answersPrems => answersPrems.element === this.model.chosenAnswer);
                                        this.model.questionnaire.prem[this.model.indexPrems].options[answerPremsIndex].element = this.model.updatedAnswer;
                                        this.model.OptionsDataSource.updateOptions();
                                        break;
                                    case "prom":
                                        let answersProms = this.model.options;
                                        let answerpromsIndex = answersProms.findIndex(answersProms => answersProms.element === this.model.chosenAnswer);
                                        this.model.questionnaire.prom[this.model.indexProms].options[answerpromsIndex].element = this.model.updatedAnswer;
                                        this.model.OptionsDataSource.updateOptions();
                                        break;
                                }
                            },
                            (event) => {
                                const response = event.detail;
                            },
                            {
                                controller: 'modals/EditAnswer',
                                disableExpanding: false,
                                disableBackdropClosing: true,
                                title: 'Update Answer',
                                givenAnswer: model.element
                            }
                        );
                    });
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
                            this.model.questionnaire.prem[this.model.indexPrems].minLabel = this.model.sliderMin.value;
                            this.model.questionnaire.prem[this.model.indexPrems].maxLabel = this.model.sliderMax.value;
                            this.model.questionnaire.prem[this.model.indexPrems].steps = this.model.sliderSteps.value;
                            break;
                        case "prom":
                            this.model.questionnaire.prom[this.model.indexProms].minLabel = this.model.sliderMin.value;
                            this.model.questionnaire.prom[this.model.indexProms].maxLabel = this.model.sliderMax.value;
                            this.model.questionnaire.prom[this.model.indexProms].steps = this.model.sliderSteps.value;
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

                this.navigateToPageTag('questions-list', {
                    message: message,
                    breadcrumb: this.model.toObject('breadcrumb'),
                    trialSSI: this.model.trialSSI
                });
            });
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
            options: []
        }
    }


}
