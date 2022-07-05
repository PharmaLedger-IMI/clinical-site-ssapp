const { WebcController } = WebCardinal.controllers;
const commonServices = require("common-services");
const {ResponsesService} = commonServices;
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class ViewPromPremGraphsController extends BreadCrumbManager  {
    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "View Graphs",
                tag: "prom-prem-graphs"
            }
        );

        this.model = this.getState();
        this.model = {
            currentTable: "none",
            hasProms: false,
            hasPrems: false,
        };

        this.model.questionnaire = {
            resourceType: "Questionnaire",
            prom: [],
            prem: [],
        }

        this.initServices();
        this.initHandlers();
    }

    initServices() {
        this.ResponsesService = new ResponsesService();
        this.ResponsesService.getResponses((err, data) => {
            if (err) {
                return console.log(err);
            }
            console.log(data);
            data.forEach(response => {
                response.forEach(answer => {
                    console.log(answer);
                    //let task = "prom";
                    if(answer.question.type ==="range"){
                        let type = "slider";
                        if(answer.question.task === "prom"){
                            //if(task === "prom"){
                            let prom = {
                                question: answer.question.title,
                                type: type,
                                uid: answer.question.uid,
                                minLabel:answer.question.range.minLabel,
                                maxLabel:answer.question.range.maxLabel,
                                steps: answer.question.range.steps,
                                task: "prom",
                                answer:answer.answer
                            }
                            this.model.questionnaire.prom.push(prom);

                        }else if(answer.question.task === "prem"){
                            //}else if(task === "prem"){
                            let prem = {
                                question: answer.question.title,
                                type: type,
                                uid: answer.question.uid,
                                minLabel:answer.question.range.minLabel,
                                maxLabel:answer.question.range.maxLabel,
                                steps: answer.question.range.steps,
                                task: "prem",
                                answer:answer.answer
                            }
                            this.model.questionnaire.prem.push(prem);
                        }
                    } else if (answer.question.type ==="radio"){
                        let type = "checkbox";
                        if(answer.question.task === "prom"){
                            //if(task === "prom"){
                            let prom = {
                                question: answer.question.title,
                                type: type,
                                uid: answer.question.uid,
                                options: answer.question.options,
                                task: "prom",
                                answer:answer.answer
                            }
                            this.model.questionnaire.prom.push(prom);

                        }else if(answer.question.task === "prem"){
                            //}else if(task === "prem"){
                            let prem = {
                                question: answer.question.title,
                                type: type,
                                uid: answer.question.uid,
                                options: answer.question.options,
                                task: "prem",
                                answer:answer.answer
                            }
                            this.model.questionnaire.prem.push(prem);
                        }
                    } else if (answer.question.type ==="string"){
                        let type = "free text";
                        if(answer.question.task === "prom"){
                            //if(task === "prom"){
                            let prom = {
                                question: answer.question.title,
                                type: type,
                                uid: answer.question.uid,
                                task: "prom",
                                answer:answer.answer
                            }
                            this.model.questionnaire.prom.push(prom);

                        }else if(answer.question.task === "prem"){
                            //}else if(task === "prem"){
                            let prem = {
                                question: answer.question.title,
                                type: type,
                                uid: answer.question.uid,
                                task: "prem",
                                answer:answer.answer
                            }
                            this.model.questionnaire.prem.push(prem);
                        }
                    }
                })
            })


            console.log(this.model.questionnaire);


            //PROM
            const promQuestions = this.getPossibleProms(this.model.questionnaire); // Map -> Question and Type
            const promAnswers = this.getAnswersForEachProm(this.model.questionnaire, promQuestions);
            const promCheckboxOptions = this.getCheckboxOptionsForEachProm(this.model.questionnaire, promQuestions);
            const promSliderOptions = this.getSliderOptionsForEachProm(this.model.questionnaire, promQuestions);

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
            const premQuestions = this.getPossiblePrems(this.model.questionnaire); // Map -> Question and Type
            const premAnswers = this.getAnswersForEachPrem(this.model.questionnaire, premQuestions);
            const premCheckboxOptions = this.getCheckboxOptionsForEachPrem(this.model.questionnaire, premQuestions);
            const premSliderOptions = this.getSliderOptionsForEachPrem(this.model.questionnaire, premQuestions);

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
        });
    }

    buildDataSources(){
        this.model.PromsDataSource = DataSourceFactory.createDataSource(2, 10, this.model.promInfo);
        this.model.hasProms = true;
        this.model.PremsDataSource = DataSourceFactory.createDataSource(2, 10, this.model.premInfo);
        this.model.hasPrems = true;
    }

    initHandlers(){
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerView();
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('charts:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms"
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('charts:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems"
        });
    }

    _attachHandlerView(){
        this.onTagClick("data-analysis", (model) => {
            let state = {};
            switch(model.type) {
                case "checkbox":
                    state =
                        {
                            question: model.question,
                            answers: model.answers,
                            type: model.type,
                            options:model.options,
                            breadcrumb: this.model.toObject('breadcrumb')
                        }
                    break;

                case "slider":
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

                case "free text":
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

    getPossibleProms(questionnaire){
        // We get an array with all the different prom questions (without repetition)
        const ArrayLen = questionnaire.prom.length;
        //let promQuestions = [];
        let promQuestions = new Map();
        let i=0;
        while (i < ArrayLen) {
            if(! promQuestions.has(questionnaire.prom[i].question)){
                promQuestions.set(questionnaire.prom[i].question, questionnaire.prom[i].type);
            }
            i++;
        }
        this.model.promQuestions = promQuestions;
        return promQuestions;
    }

    getPossiblePrems(questionnaire){
        // We get an array with all the different prom questions (without repetition)
        const ArrayLen = questionnaire.prem.length;
        //let promQuestions = [];
        let premQuestions = new Map();
        let i=0;
        while (i < ArrayLen) {
            if(! premQuestions.has(questionnaire.prem[i].question)){
                premQuestions.set(questionnaire.prem[i].question, questionnaire.prem[i].type);
            }
            i++;
        }
        this.model.promQuestions = premQuestions;
        return premQuestions;
    }

    getAnswersForEachProm(questionnaire, promQuestions){
        // We get a map with all prom questions with all the answers to that question

        const ArrayLenQuestionnaire = questionnaire.prom.length;
        let answers = [];
        let QuestionAndAnswer = new Map();
        let j=0;
        for (const key of promQuestions.keys()) {
            while (j < ArrayLenQuestionnaire){
                if(key === questionnaire.prom[j].question){
                    answers.push(questionnaire.prom[j].answer);
                }
                j++;
            }
            QuestionAndAnswer.set(key,answers);
            answers = [];
            j=0;
        }

        this.model.promAnswers = QuestionAndAnswer;
        return QuestionAndAnswer;
    }

    getAnswersForEachPrem(questionnaire, premQuestions){
        // We get a map with all prom questions with all the answers to that question

        const ArrayLenQuestionnaire = questionnaire.prem.length;
        let answers = [];
        let QuestionAndAnswer = new Map();
        let j=0;
        for (const key of premQuestions.keys()) {
            while (j < ArrayLenQuestionnaire){
                if(key === questionnaire.prem[j].question){
                    answers.push(questionnaire.prem[j].answer);
                }
                j++;
            }
            QuestionAndAnswer.set(key,answers);
            answers = [];
            j=0;
        }

        this.model.premAnswers = QuestionAndAnswer;
        return QuestionAndAnswer;
    }

    getCheckboxOptionsForEachProm(questionnaire, promQuestions){
        const ArrayLenQuestionnaire = questionnaire.prom.length;
        let checkboxOptions = [];
        let QuestionAndCheckboxOptions = new Map();
        let j=0;
        for (const key of promQuestions.keys()) {
            while (j < ArrayLenQuestionnaire){
                if(key === questionnaire.prom[j].question){
                    if(promQuestions.get(key) === "checkbox"){
                        checkboxOptions = (questionnaire.prom[j].options);
                    }
                }
                j++;
            }
            QuestionAndCheckboxOptions.set(key,checkboxOptions);
            checkboxOptions = [];
            j=0;
        }

        this.model.promOptions = QuestionAndCheckboxOptions;
        return QuestionAndCheckboxOptions;
    }

    getCheckboxOptionsForEachPrem(questionnaire, premQuestions){
        const ArrayLenQuestionnaire = questionnaire.prem.length;
        let checkboxOptions = [];
        let QuestionAndCheckboxOptions = new Map();
        let j=0;
        for (const key of premQuestions.keys()) {
            while (j < ArrayLenQuestionnaire){
                if(key === questionnaire.prem[j].question){
                    if(premQuestions.get(key) === "checkbox"){
                        checkboxOptions = (questionnaire.prem[j].options);
                    }
                }
                j++;
            }
            QuestionAndCheckboxOptions.set(key,checkboxOptions);
            checkboxOptions = [];
            j=0;
        }

        this.model.premOptions = QuestionAndCheckboxOptions;
        return QuestionAndCheckboxOptions;
    }

    getSliderOptionsForEachProm(questionnaire, promQuestions){
        const ArrayLenQuestionnaire = questionnaire.prom.length;
        let sliderOptions = {};
        let QuestionAndSliderOptions = new Map();
        let j=0;
        for (const key of promQuestions.keys()) {
            while (j < ArrayLenQuestionnaire){
                if(key === questionnaire.prom[j].question){
                    if(promQuestions.get(key) === "slider"){
                        sliderOptions ={
                            minLabel: questionnaire.prom[j].minLabel,
                            maxLabel: questionnaire.prom[j].maxLabel,
                            steps: questionnaire.prom[j].steps,
                        }
                    }
                }
                j++;
            }
            QuestionAndSliderOptions.set(key,sliderOptions);
            sliderOptions = {};
            j=0;
        }

        this.model.promOptions = QuestionAndSliderOptions;
        return QuestionAndSliderOptions;
    }

    getSliderOptionsForEachPrem(questionnaire, premQuestions){
        const ArrayLenQuestionnaire = questionnaire.prem.length;
        let sliderOptions = {};
        let QuestionAndSliderOptions = new Map();
        let j=0;
        for (const key of premQuestions.keys()) {
            while (j < ArrayLenQuestionnaire){
                if(key === questionnaire.prem[j].question){
                    if(premQuestions.get(key) === "slider"){
                        sliderOptions ={
                            minLabel: questionnaire.prem[j].minLabel,
                            maxLabel: questionnaire.prem[j].maxLabel,
                            steps: questionnaire.prem[j].steps,
                        }
                    }
                }
                j++;
            }
            QuestionAndSliderOptions.set(key,sliderOptions);
            sliderOptions = {};
            j=0;
        }

        this.model.premOptions = QuestionAndSliderOptions;
        return QuestionAndSliderOptions;
    }

}