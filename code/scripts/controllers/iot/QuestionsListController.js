import HCOService from '../../services/HCOService.js';
import {QUESTION_ACTIONS} from "../../utils/utils.js";

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
                    this.questionnaire.schedule.startDate = response.startDate;
                    this.questionnaire.schedule.endDate = response.endDate;
                    this.questionnaire.schedule.frequencyType = response.frequencyType.value;

                    this.model.frequencyIsSet = true;
                    const { startDate, endDate } = this.questionnaire.schedule;
                    this.model.schedule = {
                        startDate: (new Date(startDate)).toLocaleDateString(Constants.DATE_UTILS.DATE_LOCALE),
                        endDate: (new Date(endDate)).toLocaleDateString(Constants.DATE_UTILS.DATE_LOCALE),
                        frequencyType: this.questionnaire.schedule.frequencyType
                    }

                    this.QuestionnaireService.updateQuestionnaire(this.questionnaire, (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        if(this.questionnaire.prom.length || this.questionnaire.prem.length) {
                            this.updateTpsQuestionnaire();
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
        this.onTagEvent('new:question', 'click', this.openQuestionModal.bind(this)(QUESTION_ACTIONS.CREATE))
        this.onTagEvent('edit:question', 'click', (model) => {
            this.openQuestionModal.bind(this)(QUESTION_ACTIONS.EDIT, model.uid)();
        })
    }

    openQuestionModal(type,questionUid){

        const getModel = () => {
            switch (type) {
                case QUESTION_ACTIONS.CREATE:
                    return {
                        action: QUESTION_ACTIONS.CREATE,
                        questionType: this.model.currentTable.toUpperCase(),
                    }
                case QUESTION_ACTIONS.EDIT:
                    return {
                        action: QUESTION_ACTIONS.EDIT,
                        questionType: this.model.currentTable.toUpperCase(),
                        questionID: questionUid,
                        trialSSI: this.model.selected_trial.uid,
                        trialName: this.model.selected_trial.name,
                    }
            }
        }



        return () => {
            const handleQuestionModalResponse = async (event) => {
                let question = event.detail;
                question = Object.assign(question, {
                    task: this.model.currentTable
                });

                let questionnaireDatasource = this.model[this.model.currentTable].questionsDataSource;

                let questionIndex = this.questionnaire[this.model.currentTable].findIndex(q => q.uid === question.uid)
                if (questionIndex === -1) {
                    this.questionnaire[this.model.currentTable].push(question);
                }
                else{
                    this.questionnaire[this.model.currentTable][questionIndex] = question;
                }

                this.QuestionnaireService.updateQuestionnaire(this.questionnaire, (err) => {
                    const message = {}

                    if (err) {
                        console.log(err);
                        message.content = "An error has been occurred!";
                        message.type = 'error';
                    } else {
                        message.content = `The question has been ${type === QUESTION_ACTIONS.CREATE ? "added" : "updated"}!`;
                        message.type = 'success';
                    }

                    this.model.message = message;

                    this.updateTpsQuestionnaire();
                    window.WebCardinal.loader.hidden = true;
                    questionnaireDatasource.updateRecords();
                });
            };
            this.showModalFromTemplate(
                'questionnaire/add-edit-question',
                handleQuestionModalResponse,
                (event) => {},
                {
                    controller: 'modals/questionnaire/AddOrEditQuestionController',
                    disableExpanding: false,
                    disableBackdropClosing: true,
                    model: getModel()
                });

        }
   }

    updateTpsQuestionnaire() {
        window.WebCardinal.loader.hidden = false;
        this.TrialParticipantRepository.findAll((err, tps) => {
            if (err) {
                return console.log(err);
            }
            let trialTps = tps.filter(tp => tp.trialId === this.model.selected_trial.id && tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED);
            trialTps.forEach(participant => {
                this.sendMessageToPatient(participant.did, Constants.MESSAGES.HCO.CLINICAL_SITE_QUESTIONNAIRE_UPDATE, null, "");
                console.log("Questionnaire sent to: " + participant.name)
            });
            window.WebCardinal.loader.hidden = true;
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
                let trialTps = tps.filter(tp => tp.trialId === this.model.selected_trial.id && tp.status === Constants.TRIAL_PARTICIPANT_STATUS.ENROLLED);
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
                                this.updateTpsQuestionnaire();
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
                this.model.frequencyIsSet = this.questionnaire.schedule.frequencyType !== "";
                if(this.model.frequencyIsSet){
                    const { startDate, endDate } = this.questionnaire.schedule;
                    this.model.schedule = {
                        startDate: (new Date(startDate)).toLocaleDateString(Constants.DATE_UTILS.DATE_LOCALE),
                        endDate: (new Date(endDate)).toLocaleDateString(Constants.DATE_UTILS.DATE_LOCALE),
                        frequencyType: this.questionnaire.schedule.frequencyType
                    }
                }

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
