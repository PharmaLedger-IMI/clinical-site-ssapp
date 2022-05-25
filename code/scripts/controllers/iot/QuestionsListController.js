import HCOService from '../../services/HCOService.js';
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const {QuestionnaireService} = commonServices;
const DataSourceFactory = commonServices.getDataSourceFactory();
const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;


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
            trialSSI: prevState.trialSSI,
            hasProms: false,
            hasPrems: false,
            currentTable: "none"
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "IoT Questions",
                tag: "questions-list"
            }
        );

        this.initHandlers();
        this.initServices();
    }

    initHandlers(){
        this._attachHandlerAddNewQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerSetFrequency();
    }

    async initServices() {
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS, this.DSUStorage);
        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            this.model.trials = hcoDSU.volatile.trial;
            this.model.selected_trial = this.model.trials.find(t => t.uid === this.model.trialSSI);
            this.getQuestionnaire();
        });
    }

    _attachHandlerSetFrequency() {
        this.onTagEvent('set:frequency', 'click', (model, target, event) => {

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
            ],
            prem: [
            ],
            schedule: {
                startDate: "",
                endDate: "",
                repeatAppointment: ""
            },
            trialSSI: this.model.trialSSI,
            trialId: this.model.selected_trial.id
        }
        this.QuestionnaireService.saveQuestionnaire(questionnaire, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log("Initial Questionnaire Generated!")
            this.model.questionnaire = data;

            this.TrialParticipantRepository.findAll((err, tps) => {
                if (err) {
                    return console.log(err);
                }
                let tps_this_trial = tps.filter(tp => tp.trialId === this.model.selected_trial.id);
                tps_this_trial.forEach(participant => {
                    this.sendMessageToPatient(participant.did, "CLINICAL-SITE-QUESTIONNAIRE", data.sReadSSI, "");
                    console.log("Questionnaire sent to: " + participant.name)
                });
            })
        });
    }

    sendMessageToPatient(trialParticipant, operation, ssi, shortMessage) {
        this.CommunicationService.sendMessage(trialParticipant, {
            operation: operation,
            ssi: ssi,
            useCaseSpecifics: {
                did: trialParticipant.did,
                trialSSI: this.model.trialSSI
            },
            shortDescription: shortMessage,
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
                console.log("Initial Questionnaire is not created. Generating now the initial questionnaire for this trial.");
                this.generateInitialQuestionnaire();
            }
            else{
                console.log("Initial Questionnaire is loaded.")
                this.model.hasProms = this.model.questionnaire.prom.length !== 0;
                this.model.PromsDataSource = DataSourceFactory.createDataSource(3, 6, this.model.questionnaire.prom);
                this.model.PromsDataSource.__proto__.updateRecords = function() {
                    this.forceUpdate(true);
                }
                const { PromsDataSource } = this.model;
                this.onTagClick("prom-prev-page", () => PromsDataSource.goToPreviousPage());
                this.onTagClick("prom-next-page", () => PromsDataSource.goToNextPage());
                this.onTagClick("prom-edit", (model) => {
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
                            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                                if (err) {
                                    console.log(err);
                                }
                                this.model.PromsDataSource.updateRecords();
                            });
                        },
                        (event) => {
                            console.log("cancel");
                        },
                        modalConfig);
                });
                this.model.hasPrems = this.model.questionnaire.prem.length !== 0;
                this.model.PremsDataSource = DataSourceFactory.createDataSource(3, 6, this.model.questionnaire.prem);
                this.model.PremsDataSource.__proto__.updateRecords = function() {
                    this.forceUpdate(true);
                }
                const { PremsDataSource } = this.model;
                this.onTagClick("prem-prev-page", () => PremsDataSource.goToPreviousPage());
                this.onTagClick("prem-next-page", () => PremsDataSource.goToNextPage());
                this.onTagClick("prem-edit", (model) => {
                    let state =
                        {
                            questionID: model.uid,
                            trialSSI: this.model.selected_trial.uid,
                            trialName: this.model.selected_trial.name,
                            breadcrumb: this.model.toObject('breadcrumb')
                        }
                    this.navigateToPageTag('edit-questions', state)
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
                            this.QuestionnaireService.updateQuestionnaire(this.model.questionnaire, (err, data) => {
                                if (err) {
                                    console.log(err);
                                }
                                this.model.PremsDataSource.updateRecords();
                            });
                        },
                        (event) => {
                            console.log("cancel");
                        },
                        modalConfig);
                });
                this.TrialParticipantRepository.findAll((err, tps) => {
                    if (err) {
                        return console.log(err);
                    }
                    let tps_this_trial = tps.filter(tp => tp.trialId === this.model.selected_trial.id);
                    tps_this_trial.forEach(participant => {
                        this.sendMessageToPatient(participant.did, "CLINICAL-SITE-QUESTIONNAIRE", this.model.questionnaire.sReadSSI, "");
                        console.log("Questionnaire sent to: " + participant.name)
                    });
                })
            }
        })

    }








}
