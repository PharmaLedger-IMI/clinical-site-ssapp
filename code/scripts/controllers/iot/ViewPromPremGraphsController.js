const commonServices = require("common-services");
const {ResponsesService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();
const {Constants} = commonServices;

export default class ViewPromPremGraphsController extends BreadCrumbManager  {
    constructor(...props) {
        super(...props);

        this.state = this.getState() || {};

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "View Graphs",
                tag: "prom-prem-graphs"
            }
        );

        this.model = this.getState();
        this.model = {
            currentTable: "proms",
            promSelected: true,
            premSelected: false,
            hasProms: false,
            hasPrems: false,
            pageIsInitialized: false,
        };

        this.model.questionnaire = {
            resourceType: "Questionnaire",
            prom: [],
            prem: [],
        }

        this.initServices();
        this.initHandlers();
    }


    filterAnswers(answer) {
        let question = {
            question: answer.question.title,
            uid: answer.question.uid,
            answer:answer.answer
        }

        if (answer.question.type === Constants.QUESTION_TYPES.FREE_TEXT) {
            question.type = Constants.QUESTION_TYPES.FREE_TEXT;
        }

        if (answer.question.type === Constants.QUESTION_TYPES.SLIDER) {
            question.minLabel = answer.question.slider.minLabel;
            question.maxLabel = answer.question.slider.maxLabel;
            question.steps = answer.question.slider.steps;
            question.type = Constants.QUESTION_TYPES.SLIDER;
        }

        if (answer.question.type === Constants.QUESTION_TYPES.CHECKBOX) {
            question.type = Constants.QUESTION_TYPES.CHECKBOX;
            question.options = answer.question.options;
        }

        if(answer.question.task === "prom") {
            question.task = "prom"
            this.model.questionnaire.prom.push(question)
        } else {
            question.task = "prem"
            this.model.questionnaire.prem.push(question)
        }
    }

    initServices() {
        this.ResponsesService = new ResponsesService();
        this.ResponsesService.getResponses((err, responses) => {
            if (err) {
                return console.log(err);
            }
            let searchedTrialResponses = responses.filter(response => response.trialUid === this.state.trialUid);
            this.model.pageIsInitialized = true;
            if(searchedTrialResponses) {
                searchedTrialResponses.forEach(response => {
                    response.questionResponses.forEach(answer => {
                        this.filterAnswers(answer);
                    })
                })
                console.log(this.model.questionnaire);

                //PROM
                this.currentQuestionType = 'prom';
                const promQuestions = this.getPossibleQuestion(this.currentQuestionType);
                const promAnswers = this.getAnswersForQuestion(this.currentQuestionType, promQuestions);
                const promCheckboxOptions = this.getCheckboxOptionsForQuestion(this.currentQuestionType, promQuestions);
                const promSliderOptions = this.getSliderOptionsForEachQuestion(this.currentQuestionType, promQuestions);

                let promInfo = [];

                promQuestions.forEach (function(value, key) {
                    let info = {
                        question: key,
                        answers: promAnswers.get(key),
                        type: value,
                        options: promCheckboxOptions.get(key),
                        minLabel:promSliderOptions.get(key).minLabel,
                        maxLabel:promSliderOptions.get(key).maxLabel,
                        steps:promSliderOptions.get(key).steps,
                    }
                    promInfo.push(info);
                })
                console.log(promInfo);
                this.model.promInfo = promInfo;

                //PREM
                this.currentQuestionType = 'prem';
                const premQuestions = this.getPossibleQuestion(this.currentQuestionType);
                const premAnswers = this.getAnswersForQuestion(this.currentQuestionType, premQuestions);
                const premCheckboxOptions = this.getCheckboxOptionsForQuestion(this.currentQuestionType, premQuestions);
                const premSliderOptions = this.getSliderOptionsForEachQuestion(this.currentQuestionType, premQuestions);

                let premInfo = [];

                premQuestions.forEach (function(value, key) {
                    let info = {
                        question: key,
                        answers: premAnswers.get(key),
                        type: value,
                        options: premCheckboxOptions.get(key),
                        minLabel:premSliderOptions.get(key).minLabel,
                        maxLabel:premSliderOptions.get(key).maxLabel,
                        steps:premSliderOptions.get(key).steps,
                    }
                    premInfo.push(info);
                })
                console.log(premInfo);
                this.model.premInfo = premInfo;
                this.buildDataSources();
            }
        });
    }

    buildDataSources(){
        this.model.PromsDataSource = DataSourceFactory.createDataSource(2, 10, this.model.promInfo);
        this.model.hasProms = this.model.toObject('promInfo').length !== 0;
        this.model.PremsDataSource = DataSourceFactory.createDataSource(2, 10, this.model.premInfo);
        this.model.hasPrems = this.model.toObject('premInfo').length !== 0;
        this.model.pageIsInitialized = true;
    }

    initHandlers(){
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerView();
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('charts:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms";
            this.model.promSelected = true;
            this.model.premSelected = false;
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('charts:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems";
            this.model.promSelected = false;
            this.model.premSelected = true;
        });
    }

    _attachHandlerView(){
        this.onTagClick("data-analysis", (model) => {
            let state = {};
            switch(model.type) {
                case Constants.QUESTION_TYPES.CHECKBOX:
                    state =
                        {
                            question: model.question,
                            answers: model.answers,
                            type: model.type,
                            options:model.options,
                            breadcrumb: this.model.toObject('breadcrumb')
                        }
                    break;

                case Constants.QUESTION_TYPES.SLIDER:
                    state =
                        {
                            question: model.question,
                            answers: model.answers,
                            type: model.type,
                            minLabel: model.minLabel,
                            maxLabel: model.maxLabel,
                            steps: model.steps,
                            breadcrumb: this.model.toObject('breadcrumb')
                        }
                    break;

                case Constants.QUESTION_TYPES.FREE_TEXT:
                    state =
                        {
                            question: model.question,
                            answers: model.answers,
                            type: model.type,
                            breadcrumb: this.model.toObject('breadcrumb')
                        }
                    break;
            }

            this.navigateToPageTag('view-graph', state)
        });
    }

    getPossibleQuestion(questionType) {
        const arrLength = this.model.questionnaire[questionType].length;
        let questions = new Map();
        let i=0;
        while (i < arrLength) {
            if(! questions.has(this.model.questionnaire[questionType][i].question)){
                questions.set(this.model.questionnaire[questionType][i].question, this.model.questionnaire[questionType][i].type);
            }
            i++;
        }

        return questions;
    }

    getAnswersForQuestion(questionType, questions) {
        const arrLength = this.model.questionnaire[questionType].length;
        let answers = [];
        let questionAndAnswer = new Map();
        let j=0;
        for (const key of questions.keys()) {
            while (j < arrLength){
                if(key === this.model.questionnaire[questionType][j].question){
                    answers.push(this.model.questionnaire[questionType][j].answer);
                }
                j++;
            }
            questionAndAnswer.set(key,answers);
            answers = [];
            j=0;
        }

        return questionAndAnswer;
    }

    getCheckboxOptionsForQuestion(questionType, questions) {
        const arrLength = this.model.questionnaire[questionType].length;
        let checkboxOptions = [];
        let questionAndCheckboxOptions = new Map();
        let j=0;
        for (const key of questions.keys()) {
            while (j < arrLength){
                if(key === this.model.questionnaire[questionType][j].question){
                    if(questions.get(key) === Constants.QUESTION_TYPES.CHECKBOX){
                        checkboxOptions = (this.model.questionnaire[questionType][j].options);
                    }
                }
                j++;
            }
            questionAndCheckboxOptions.set(key,checkboxOptions);
            checkboxOptions = [];
            j=0;
        }

        return questionAndCheckboxOptions;
    }

    getSliderOptionsForEachQuestion(questionType, questions) {
        const arrLength = this.model.questionnaire[questionType].length;
        let sliderOptions = {};
        let questionAndSliderOptions = new Map();
        let j=0;
        for (const key of questions.keys()) {
            while (j < arrLength){
                if(key === this.model.questionnaire[questionType][j].question){
                    if(questions.get(key) === Constants.QUESTION_TYPES.SLIDER){
                        sliderOptions ={
                            minLabel: this.model.questionnaire[questionType][j].minLabel,
                            maxLabel: this.model.questionnaire[questionType][j].maxLabel,
                            steps: this.model.questionnaire[questionType][j].steps,
                        }
                    }
                }
                j++;
            }
            questionAndSliderOptions.set(key,sliderOptions);
            sliderOptions = {};
            j=0;
        }

        return questionAndSliderOptions;
    }

}