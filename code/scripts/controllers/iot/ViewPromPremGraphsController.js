const { WebcController } = WebCardinal.controllers;
const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class ViewPromPremGraphsController extends BreadCrumbManager  {
    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "View Graphs",
                tag: "view-graphs"
            }
        );

        this.model = this.getState();
        this.model = {
            currentTable: "none"
        };

        this.initHandlers();
        const questionnaire = this.generateInitialQuestionnaire();
        const promQuestions = this.getPossibleProms(questionnaire);
        const premQuestions = this.getPossiblePrems(questionnaire);

        promQuestions.forEach(this.buildPromCharts);
        premQuestions.forEach(this.buildPremCharts);

    }

    initHandlers(){
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
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
                    question: "Were you involved, as much as you wanted to be, in decisions about your care and treatment?",
                    type: "free text",
                    uid: 35345344353,
                    task: "prom",
                    answer: "free answer text here"
                }
            ],
            prem: [
                {
                    question: "Mobility question",
                    type: "checkbox",
                    uid: 35334546353,
                    options: ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"],
                    task: "prem",
                    answer: 1
                },
                {
                    question: "Indicate how your health is TODAY",
                    type: "slider",
                    uid: 3523453242344353,
                    minLabel: 4,
                    maxLabel: 10,
                    steps: 1,
                    task: "prem",
                    answer: 5
                },
                {
                    question: "Were you involved, as much as you wanted to be, in decisions about your care and treatment?\n",
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

    ArrayAvg(myArray){
        var i = 0, summ = 0, ArrayLen = myArray.length;
        while (i < ArrayLen) {
            summ = summ + myArray[i++];
        }
        return summ / ArrayLen;
    }

    getAverage(questionnaire){
        const ArrayLen = questionnaire.prom.length;
        let answers = [];
        let i=0;
        while (i < ArrayLen) {
            if(questionnaire.prom[i].question === "Mobility question"){
                answers.push(questionnaire.prom[i].answer);
            }
            i++;
        }
        console.log(answers);
        console.log(this.ArrayAvg(answers));
        return this.ArrayAvg(answers);

    }

    getPossibleProms(questionnaire){
        // We get an array with all the different prom questions (without repetition)
        const ArrayLen = questionnaire.prom.length;
        let promQuestions = [];
        let i=0;
        while (i < ArrayLen) {
            if(! promQuestions.includes(questionnaire.prom[i].question)){
                promQuestions.push(questionnaire.prom[i].answer);
            }
            i++;
        }
        this.model.promQuestions = promQuestions;
        return promQuestions;
    }

    getPossiblePrems(questionnaire){
        // We get an array with all the different prem questions (without repetition)
        const ArrayLen = questionnaire.prem.length;
        let premQuestions = [];
        let i=0;
        while (i < ArrayLen) {
            if(! premQuestions.includes(questionnaire.prem[i].question)){
                premQuestions.push(questionnaire.prem[i].answer);
            }
            i++;
        }
        this.model.premQuestions = premQuestions;
        return premQuestions;
    }

    buildPromCharts(){

        //const labelsProm =
        //const labelsProm = ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"];
        // const dataProm = {
        //     labels: labelsProm,
        //     datasets: [{
        //         data: [10, 5, 23, 3, 10],
        //         backgroundColor: [
        //             'rgba(255, 99, 132, 0.2)',
        //             'rgba(255, 159, 64, 0.2)',
        //             'rgba(255, 205, 86, 0.2)',
        //             'rgba(75, 192, 192, 0.2)',
        //             'rgba(54, 162, 235, 0.2)'
        //         ],
        //         borderColor: [
        //             'rgb(255, 99, 132)',
        //             'rgb(255, 159, 64)',
        //             'rgb(255, 205, 86)',
        //             'rgb(75, 192, 192)',
        //             'rgb(54, 162, 235)'
        //         ],
        //         borderWidth: 1
        //     }]
        // };
        //
        // //options
        // const optionsProm = {
        //     responsive: true,
        //     plugins: {
        //         legend: {
        //             position: 'top',
        //             display: false
        //         },
        //         title: {
        //             display: true,
        //             text: 'Mobility Question'
        //         }
        //     }
        //
        // };
        //
        // let barChartElement = document.getElementById('barChart').getContext('2d');
        // let barChart = new Chart(barChartElement,{
        //     type: "bar",
        //     data: dataProm,
        //     options: optionsProm
        // });
    }

    buildPremCharts(){

    }
}