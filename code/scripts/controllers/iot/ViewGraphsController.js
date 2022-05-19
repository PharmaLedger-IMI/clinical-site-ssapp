const { WebcController } = WebCardinal.controllers;
const commonServices = require("common-services");
const {QuestionnaireService} = commonServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class ViewPromPremGraphsController extends BreadCrumbManager  {
    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        console.log(prevState);

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Graph",
                tag: "view-graph"
            }
        );

        this.model = this.getState();
        this.model = {
            currentTable: "none"
        };


        switch(prevState.type) {
            case "checkbox":
                const dataCheckbox = {
                    question: prevState.question,
                    answers: prevState.answers,
                    options: prevState.options,
                };
                this.buildChartCheckbox(dataCheckbox);
                break;

            case "slider":
                const dataSlider = {
                    question: prevState.question,
                    answers: prevState.answers,
                    minLabel: prevState.minLabel,
                    maxLabel: prevState.minLabel,
                    steps: prevState.minLabel,
                };
                this.buildChartSlider(dataSlider);
                break;

            case "free text":
                const dataFreeText = {
                    question: prevState.question,
                    answers: prevState.answers,
                };
                this.buildChartFreeText(dataFreeText);
                break;
        }


    }

    buildChartCheckbox(data){

        const labelsProm = data.options;
        let mapAnswers = new Map();
        let i = 1;
        for(let label in labelsProm){
            mapAnswers.set (i, labelsProm[label]);
            i ++;
        }


        let counter = 0;
        let AnswersCount = [];
        for (const key of mapAnswers.keys()){
            counter = 0;
            for(let j = 0 ; j< data.answers.length; j++){
                if(data.answers[j] === key){
                    counter ++;
                }
            }
            AnswersCount.push(counter);
        }

        console.log(AnswersCount);


        const dataProm = {
            labels: labelsProm,
            datasets: [{
                data: AnswersCount,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 205, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(54, 162, 235, 0.2)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(255, 159, 64)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(54, 162, 235)'
                ],
                borderWidth: 1
            }]
        };

        //options
        const optionsProm = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: false
                },
                title: {
                    display: true,
                    text: data.question
                }
            }

        };

        let barChartElement = document.getElementById('Chart').getContext('2d');
        let barChart = new Chart(barChartElement,{
            type: "bar",
            data: dataProm,
            options: optionsProm
        });
    }

    buildChartSlider(data){

        // const labelsProm = ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"];
        const labelsProm = [data.minLabel, data.maxLabel];
        const dataProm = {
            labels: labelsProm,
            datasets: [{
                data: data.answers,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 205, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(54, 162, 235, 0.2)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(255, 159, 64)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(54, 162, 235)'
                ],
                borderWidth: 1
            }]
        };

        //options
        const optionsProm = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: false
                },
                title: {
                    display: true,
                    text: data.question
                }
            }

        };

        let barChartElement = document.getElementById('Chart').getContext('2d');
        let barChart = new Chart(barChartElement,{
            type: "scatter",
            data: dataProm,
            options: optionsProm
        });
    }

    buildChartFreeText(data){

    }


}