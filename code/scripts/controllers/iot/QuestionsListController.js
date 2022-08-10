import HCOService from '../../services/HCOService.js';

const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const {QuestionnaireService} = commonServices;
const DataSourceFactory = commonServices.getDataSourceFactory();
const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;
const Constants = commonServices.Constants;
const {getDidServiceInstance} = commonServices.DidService;


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
            pageIsInitialized:false,
            ...getInitModel(),
            trialSSI: prevState.trialSSI,
            prom: {
                hasQuestions: false
            },
            prem: {
                hasQuestions: false
            },
            currentTable: "prom",
            promSelected: true,
            premSelected: false
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

    initHandlers() {
        this._attachHandlerAddNewQuestion();
        this._attachHandlerEditQuestion();
        this._attachHandlerPromQuestions();
        this._attachHandlerPremQuestions();
        this._attachHandlerSetFrequency();
    }

    async initServices() {
        this.didService = getDidServiceInstance();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            this.model.trials = hcoDSU.volatile.trial;
            this.model.selected_trial = this.model.trials.find(t => t.uid === this.model.trialSSI);
            this.didService.getDID().then(did => {
                this.model.siteDID = did;
                this.getQuestionnaire();
            });
        });
    }

    _attachHandlerSetFrequency() {
        this.onTagEvent('set:frequency', 'click', (model, target, event) => {

            this.showModalFromTemplate(
                'set-frequency-questionnaire',
                (event) => {
                    const response = event.detail;
                    this.model.response = response;
                    this.questionnaire.schedule.startDate = this.model.response.startDate;
                    this.questionnaire.schedule.endDate = this.model.response.endDate;
                    this.questionnaire.schedule.frequencyType = this.model.response.frequencyType.value;
                    this.QuestionnaireService.updateQuestionnaire(this.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        console.log("Frequency has been set");
                        console.log(data);
                    });
                },
                (event) => {},
                {
                    controller: 'modals/SetFrequencyQuestionnaire',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    title: 'Set Frequency Questionnaire',
                    schedule: this.questionnaire.schedule
                }
            );

        });
    }

    _attachHandlerAddNewQuestion() {


        const addQuestionHandler = () => {
            this.showModalFromTemplate(
                'questionnaire/add-edit-question',
                async (event) => {
                    let question = event.detail;


                    question = Object.assign(question, {
                        task: this.model.currentTable
                    });

                    let questionnaireDatasource = this.model[this.model.currentTable].questionsDataSource;
                    this.questionnaire[this.model.currentTable].push(question);

                    this.QuestionnaireService.updateQuestionnaire(this.questionnaire, (err) => {
                        const message = {}

                        if (err) {
                            console.log(err);
                            message.content = "An error has been occurred!";
                            message.type = 'error';
                        } else {
                            message.content = "The question has been added!";
                            message.type = 'success';
                        }

                        this.model.message = message;

                        window.WebCardinal.loader.hidden = true;
                        questionnaireDatasource.updateRecords();
                    });
                },
                (event) => {},
                {
                    controller: 'modals/questionnaire/AddQuestionController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    action: 'Create',
                    questionType: this.model.currentTable.toUpperCase(),
                });

        }

        this.onTagEvent('new:prem-question', 'click', addQuestionHandler.bind(this))
        this.onTagEvent('new:prom-question', 'click', addQuestionHandler.bind(this))
    }

    _attachHandlerEditQuestion() {

        const editQuestionHandler = (model) => {
            this.showModalFromTemplate(
                'questionnaire/add-edit-question',
                async (event) => {
                    let updatedQuestion = event.detail;
                    updatedQuestion = Object.assign(updatedQuestion, {
                        task: this.model.currentTable
                    });

                    let questionnaireDatasource = this.model[this.model.currentTable].questionsDataSource;

                    let questionIndex = this.questionnaire[this.model.currentTable].findIndex(question => question.uid === updatedQuestion.uid)
                    this.questionnaire[this.model.currentTable][questionIndex] = updatedQuestion;

                    this.QuestionnaireService.updateQuestionnaire(this.questionnaire, (err) => {
                        const message = {}

                        if (err) {
                            console.log(err);
                            message.content = "An error has been occurred!";
                            message.type = 'error';
                        } else {
                            message.content = "The question has been updated!";
                            message.type = 'success';
                        }

                        this.model.message = message;

                        window.WebCardinal.loader.hidden = true;
                        questionnaireDatasource.updateRecords();
                    });
                },
                (event) => {},
                {
                    controller: 'modals/questionnaire/EditQuestionController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    questionType: this.model.currentTable.toUpperCase(),
                    action: 'Edit',
                    state: {
                        questionID: model[0].uid,
                        trialSSI: this.model.selected_trial.uid,
                        trialName: this.model.selected_trial.name,
                    }
                });

        }

        this.onTagEvent('question-edit"', 'click',(model) => {
            editQuestionHandler.call(this,[model])
        })
    }

    _attachHandlerPromQuestions() {
        this.onTagEvent('view:prom', 'click', (model, target, event) => {
            this.model.currentTable = "prom";
            this.model.promSelected = true;
            this.model.premSelected = false;
        });
    }

    _attachHandlerPremQuestions() {
        this.onTagEvent('view:prem', 'click', (model, target, event) => {
            this.model.currentTable = "prem";
            this.model.promSelected = false;
            this.model.premSelected = true;
        });
    }

    generateInitialQuestionnaire(callback) {
        window.WebCardinal.loader.hidden = false;
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
            prom: [],
            prem: [],
            schedule: {
                startDate: "",
                endDate: "",
                frequencyType: ""
            },
            trialSSI: this.model.trialSSI,
            trialId: this.model.selected_trial.id,
            siteDID: this.model.siteDID
        }
        this.QuestionnaireService.saveQuestionnaire(questionnaire, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log("Initial Questionnaire Generated!")
            this.questionnaire = data;

            this.TrialParticipantRepository.findAll((err, tps) => {
                if (err) {
                    return console.log(err);
                }
                let trialTps = tps.filter(tp => tp.trialId === this.model.selected_trial.id);
                trialTps.forEach(participant => {
                    this.sendMessageToPatient(participant.did, Constants.MESSAGES.HCO.CLINICAL_SITE_QUESTIONNAIRE, data.sReadSSI, "");
                    console.log("Questionnaire sent to: " + participant.name)
                });
                window.WebCardinal.loader.hidden = true;
                callback();
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

    getQuestionnaire() {

        this.QuestionnaireService = new QuestionnaireService();
        const getQuestions = () => {
            return new Promise((resolve, reject) => {
                this.QuestionnaireService.getAllQuestionnaires((err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                })
            })
        }

        getQuestions().then(data => {

            const createDataSourceHandlers = () =>{
                this.onTagClick("question-delete", (model) => {
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

                            let index = this.questionnaire[this.model.currentTable].findIndex(element => element.uid === model.uid);
                            this.questionnaire[this.model.currentTable].splice(index, 1);
                            this.QuestionnaireService.updateQuestionnaire(this.questionnaire, (err, data) => {
                                if (err) {
                                    console.log(err);
                                }
                                this.model[this.model.currentTable].questionsDataSource.updateRecords();
                            });
                        },
                        (event) => {
                            console.log("cancel");
                        },
                        modalConfig);
                });
            }

            const createDataSources = () => {

                const generateDataSource = (modelChain, questions)=>{
                    const self = this;
                    this.model[modelChain].hasQuestions = questions.length !== 0;
                    this.model[modelChain].questionsDataSource = DataSourceFactory.createDataSource(3, 6, questions);
                    this.model[modelChain].questionsDataSource.updateRecords = function () {
                        self.model[modelChain].hasQuestions = questions.length !== 0;
                        if (typeof this.getElement === "function") {
                            this.getElement().dataSize = questions.length;
                            this.forceUpdate(true);
                        }
                    }

                }
                generateDataSource("prom",this.questionnaire.prom);
                generateDataSource("prem",this.questionnaire.prem);

                this.model.pageIsInitialized = true;
                createDataSourceHandlers();
            }


            this.questionnaire = data.find(data => data.trialSSI === this.model.trialSSI);
            if (!this.questionnaire) {
                console.log("Initial Questionnaire is not created. Generating now the initial questionnaire for this trial.");
                this.generateInitialQuestionnaire(createDataSources);
            } else {
                console.log("Initial Questionnaire is loaded.")
                createDataSources();

            }
        })

    }

}
