const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();

function getChartOptions(data) {
    return {
        animation:false,
        responsive: true,
        transitions: {
            active: {
                animation: {
                    duration: 0
                }
            }
        },
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                display: false
            },
            title: {
                display: true,
                text: data.question
            },
        },
        scales: {
            yAxisID: {
                display: true,
                text: 'Number of People',
                fontSize: 15,
                fontWeight: 'bold',
                title: {
                    display: true,
                    text: 'Number of People'
                }
            },
            xAxisID: {
                display: true,
                text: 'Options Selected',
                fontSize: 15,
                fontWeight: 'bold',
                title: {
                    display: true,
                    text: 'Options Selected'
                }
            },
        }
    }
}


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
                this.model.noChartAvailable = false;
                this.buildChartCheckbox(dataCheckbox);
                break;

            case "slider":
                const dataSlider = {
                    question: prevState.question,
                    answers: prevState.answers,
                    minLabel: prevState.minLabel,
                    maxLabel: prevState.maxLabel,
                    steps: prevState.steps,
                };
                this.model.noChartAvailable = false;
                this.buildChartSlider(dataSlider);
                break;

            case "string":
                this.model.dataFreeText = {
                    question: prevState.question,
                    answers: prevState.answers.filter(answer => answer.trim() !== ""),
                };
                this.model.dataFreeText.hasAnswers = this.model.dataFreeText.answers.length > 0;

                this.model.noChartAvailable = true;
                break;
        }


    }

    buildChartCheckbox(data){

        let labelsProm = []

        for(let i = 0; i< data.options.length; i++){
            labelsProm.push(data.options[i].value);
        }

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
            console.log(key);
            for(let j = 0 ; j< data.answers.length; j++){
                console.log(data.answers[j]);
                if(data.answers[j] === mapAnswers.get(key)){
                    counter ++;
                }
            }
            AnswersCount.push(counter);
        }

        console.log(AnswersCount);


        const dataProm = {
            labels: labelsProm,
            datasets: [{
                label: 'Number of Patients',
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


        let barChartElement = document.getElementById('Chart').getContext('2d');
        let barChart = new Chart(barChartElement,{
            type: "bar",
            data: dataProm,
            options: getChartOptions(data)
        });
    }

    buildChartSlider(data){

        const minLabel = Number(data.minLabel);
        const maxLabel = Number(data.maxLabel);
        const steps = Number(data.steps);
        const stepTimes = (maxLabel - minLabel)/steps;

        console.log(maxLabel);
        console.log(minLabel);
        console.log(maxLabel-minLabel);
        console.log(steps);
        console.log(stepTimes);


        let option = minLabel;
        let options = [];
        options.push(option);

        for (let i = 1; i <= stepTimes; i++){
            console.log("entra");
            option = option + steps;
            options.push(option);
            console.log(option);
        }

        if(! options.includes(maxLabel)){
            console.log("entra");
            options.push(maxLabel);
        }
        console.log(options);

        const labels = options;
        let mapAnswers = new Map();
        let i = 1;
        for(let label in labels){
            mapAnswers.set (i, labels[label]);
            i ++;
        }
        console.log(mapAnswers);


        let counter = 0;
        let AnswersCount = [];
        for (const key of mapAnswers.keys()){
            counter = 0;
            for(let j = 0 ; j< data.answers.length; j++){
                if(data.answers[j] == mapAnswers.get(key)){
                    counter ++;
                }
            }
            AnswersCount.push(counter);
        }

        console.log(AnswersCount);

        const dataProm = {
            labels: options,
            datasets: [{
                label: 'Number of Patients',
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


        let barChartElement = document.getElementById('Chart').getContext('2d');
        let barChart = new Chart(barChartElement,{
            type: "bar",
            data: dataProm,
            options: getChartOptions(data)
        });
    }

    buildChartFreeText(data){

    }


}