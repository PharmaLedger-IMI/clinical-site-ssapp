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


        const labelsProm = ["I have no problems in walking about", "I have slight problems in walking about", "I have moderate problems in walking about", "I have severe problems in walking about", "I am unable to walk about"];
        const dataProm = {
            labels: labelsProm,
            datasets: [{
                data: [10, 5, 23, 3, 10],
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
                    text: 'Mobility Question'
                }
            }

        };

        let barChartElement = document.getElementById('barChart').getContext('2d');
        let barChart = new Chart(barChartElement,{
            type: "bar",
            data: dataProm,
            options: optionsProm
        });

        const labelsPrem = ["Yes, Always", "Yes, Sometimes", "No"];
        const dataPrem = {
            labels: labelsPrem,
            datasets: [{
                data: [40, 6, 4],
                backgroundColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 205, 86)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 205, 86)'
                ],
                hoverOffset: 4
            }]
        };

        //options
        const optionsPrem = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: false
                },
                title: {
                    display: true,
                    text: 'Did you feel you were treated with respect and dignity by healthcare professionals?'
                }
            }

        };


        let pieChartElement = document.getElementById('pieChart').getContext('2d');
        let pieChart = new Chart(pieChartElement,{
            type: "pie",
            data: dataPrem,
            options: optionsPrem
        });

    }
}