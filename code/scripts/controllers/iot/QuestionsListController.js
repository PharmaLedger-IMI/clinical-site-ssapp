import HCOService from '../../services/HCOService.js';
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const {QuestionnaireService} = commonServices;
const DataSourceFactory = commonServices.getDataSourceFactory();

let getInitModel = () => {
    return {
        trials: {},
        selected_trial: {}
    };
};


export default class QuestionsListController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = this.getState();
        this.model = {
            ...getInitModel(),
            trialSSI: prevState.trialSSI
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "IoT Questions",
                tag: "questions-list"
            }
        );
        this.model.message = "";

        this.model.hasProms = false;
        this.model.hasPrems = false;
        this.model.currentTable = "none"
        this.initHandlers();
        this.initServices();
    }

    initHandlers(){
        this._attachHandlerAddNewQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerSetFrequency();
    }

    initServices() {
        this.getQuestionnaire();
        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            this.model.trials = hcoDSU.volatile.trial;
            this.model.selected_trial = this.model.trials.find(t => t.uid === this.model.trialSSI);
        });
    }

    _attachHandlerSetFrequency() {
        this.onTagEvent('set:frequency', 'click', (model, target, event) => {
            console.log("set frequency page/modal")

            this.showModalFromTemplate(
                'set-frequency-questionnaire',
                (event) => {
                    const response = event.detail;
                    this.model.response = response;
                    this.model.questionnaire.schedule.startDate = this.model.response.startDate;
                    this.model.questionnaire.schedule.endDate = this.model.response.endDate;
                    this.model.questionnaire.schedule.repeatAppointment = this.model.response.frequencyType.value;
                    this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        console.log("Frequency has been set");
                        console.log(data);
                    });
                },
                (event) => {
                    const response = event.detail;
                },
                {
                    controller: 'modals/SetFrequencyQuestionnaire',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Set Frequency Questionnaire',
                    schedule: this.model.questionnaire.schedule
                }
            );

        });
    }

    _attachHandlerAddNewQuestion() {
        this.onTagEvent('new:question', 'click', (model, target, event) => {
            let state = {
                trialSSI: this.model.selected_trial.uid,
                trialName: this.model.selected_trial.name,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('add-questions', state);
        });
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('new:prom', 'click', (model, target, event) => {
            this.model.currentTable = "proms"
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('new:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prems"
        });
    }

    getQuestionnaire(){
        this.QuestionnaireService = new QuestionnaireService();
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
            if (!this.model.questionnaire){
                console.log("Initial Questionnaire is not created!");
            }
            else{
                console.log("Initial Questionnaire is created!")
                this.model.hasProms = this.model.questionnaire.prom.length !== 0;
                this.model.PromsDataSource = DataSourceFactory.createDataSource(3, 6, this.model.questionnaire.prom);
                const { PromsDataSource } = this.model;
                this.onTagClick("prom-prev-page", () => PromsDataSource.goToPreviousPage());
                this.onTagClick("prom-next-page", () => PromsDataSource.goToNextPage());
                this.onTagClick("prom-edit", (model) => {
                    console.log(model);
                    let state =
                        {
                            questionID: model.uid,
                            trialSSI: this.model.selected_trial.uid,
                            trialName: this.model.selected_trial.name,
                            breadcrumb: this.model.toObject('breadcrumb')
                        }
                    this.navigateToPageTag('edit-questions', state)
                });
                this.onTagClick("prom-delete", (model) => {
                    console.log(model);
                    const modalConfig = {
                        controller: "modals/ConfirmationAlertController",
                        disableExpanding: false,
                        disableBackdropClosing: true,
                        question: "Are you sure that you want to delete this question? ",
                        title: "Delete question",
                    };
                    this.showModalFromTemplate(
                        "confirmation-alert",
                        (event) => {
                            let index = this.model.questionnaire.prom.findIndex(element => element.uid === model.uid);
                            this.model.questionnaire.prom.splice(index, 1);
                            console.log(this.model.questionnaire.prom)
                            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                                if (err) {
                                    console.log(err);
                                }
                                console.log("deleted");
                            });
                        },
                        (event) => {
                            console.log("cancel");
                        },
                        modalConfig);
                    // let state = {
                    //     breadcrumb: this.model.toObject('breadcrumb')
                    // }
                    // this.navigateToPageTag('questions-list', state);
                });
                this.model.hasPrems = this.model.questionnaire.prem.length !== 0;
                this.model.PremsDataSource = DataSourceFactory.createDataSource(3, 6, this.model.questionnaire.prem);
                const { PremsDataSource } = this.model;
                this.onTagClick("prem-prev-page", () => PremsDataSource.goToPreviousPage());
                this.onTagClick("prem-next-page", () => PremsDataSource.goToNextPage());
                this.onTagClick("prem-edit", (model) => {
                    console.log(model);
                });
                this.onTagClick("prem-delete", (model) => {
                    const modalConfig = {
                        controller: "modals/ConfirmationAlertController",
                        disableExpanding: false,
                        disableBackdropClosing: true,
                        question: "Are you sure that you want to delete this question? ",
                        title: "Delete question",
                    };
                    this.showModalFromTemplate(
                        "confirmation-alert",
                        (event) => {
                            let index = this.model.questionnaire.prem.findIndex(element => element.uid === model.uid);
                            this.model.questionnaire.prem.splice(index, 1);
                            console.log(this.model.questionnaire.prem)
                            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                                if (err) {
                                    console.log(err);
                                }
                                window.WebCardinal.loader.hidden = true;
                                console.log("deleted");
                                console.log(data);
                            });
                        },
                        (event) => {
                            console.log("cancel");
                        },
                        modalConfig);
                });
            }
        })
    }








}
