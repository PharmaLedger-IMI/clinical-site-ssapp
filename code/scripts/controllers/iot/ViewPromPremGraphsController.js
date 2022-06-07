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
            currentTable: "none"
        };

        this.initHandlers();

        const questionnaire = this.generateInitialQuestionnaire();

        //PROM
        const promQuestions = this.getPossibleProms(questionnaire); // Map -> Question and Type
        const promAnswers = this.getAnswersForEachProm(questionnaire, promQuestions);
        const promCheckboxOptions = this.getCheckboxOptionsForEachProm(questionnaire, promQuestions);
        const promSliderOptions = this.getSliderOptionsForEachProm(questionnaire, promQuestions);

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

        this.model.promInfo = promInfo;

        this.model.PromsDataSource = DataSourceFactory.createDataSource(2, 10, this.model.promInfo);

        //PREM
        const premQuestions = this.getPossiblePrems(questionnaire); // Map -> Question and Type
        const premAnswers = this.getAnswersForEachPrem(questionnaire, premQuestions);
        const premCheckboxOptions = this.getCheckboxOptionsForEachPrem(questionnaire, premQuestions);
        const premSliderOptions = this.getSliderOptionsForEachPrem(questionnaire, premQuestions);

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

        this.model.premInfo = premInfo;

        this.model.PremsDataSource = DataSourceFactory.createDataSource(2, 10, this.model.premInfo);


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

    generateInitialQuestionnaire() {
        let questionnaire = {
            resourceType: "Questionnaire",
            id: "bb",
            text: {
                status: "generated",
                div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"></div>"
            },
            url: "http://hl7.org/fhir/Questionnaire/bb",
            title: "NSW Government My Personal Health Record",
            status: "draft",
            subjectType: [
                "Patient"
            ],
            date: Date.now(),
            publisher: "New South Wales Department of Health",
            jurisdiction: [
                {
                    coding: [
                        {
                            system: "urn:iso:std:iso:3166",
                            code: "AU"
                        }
                    ]
                }
            ],
            prom: [
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 353454635301,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prom",
                    answer: 1
                },
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 353454635302,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prom",
                    answer: 5
                },
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 353454635303,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prom",
                    answer: 3
                },
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 353454635303235,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prom",
                    answer: 3
                },
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 353454635303535,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prom",
                    answer: 3
                },
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 353454635303555,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prom",
                    answer: 3
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 353453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prom",
                    answer: 5
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 353453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prom",
                    answer: 5
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 353453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prom",
                    answer: 5
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 353453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prom",
                    answer: 7
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 353453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prom",
                    answer: 7
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 353453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prom",
                    answer: 10
                },
                {
                    question: "Were you involved, as much as you wanted to be, in decisions about your care and treatment?",
                    type: "free text",
                    uid: 35345344353,
                    task: "prom",
                    answer: "free answer text here"
                }
            ],
            prem: [
                {
                    question: "Question Prem 1",
                    type: "checkbox",
                    uid: 35334546353,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prem",
                    answer: 1
                },
                {
                    question: "Question Prem 2",
                    type: "slider",
                    uid: 3523453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prem",
                    answer: 5
                },
                {
                    question: "Question Prem 3",
                    type: "free text",
                    uid: 315345344353,
                    task: "prem",
                    answer: "free answer text here"
                }
            ],
            schedule: {
                startDate: "",
                endDate: "",
                repeatAppointment: ""
            },
            trialSSI: "WMvPUMnD8ytotsofd5oK7ZtdV52BbXWJ1a1eLtob4L7BpSLsjnTp7PHSkUKwneP5haoNW1iPiynT4zZeeBmhAHDoXVa1X3kWsjrsVrmDCifgeeuYeUKJ3FnjXqkymVe9BiQFm7r9mfezXy"
        }

        return questionnaire;

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