const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;

const {WebcController} = WebCardinal.controllers;

export default class QuestionsController extends WebcController {
    constructor(...props) {
        super(...props);

        this.model = {};

        this.initServices();
        this.attachQuestionAnswer();
        this.initQuestions();
        this.attachHandlerBack();
    }

    emptyCallback() {
    }

    initServices() {
        this.QuestionsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.QUESTIONS, this.DSUStorage);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
    }

    initQuestions() {
        this.model.questions = [];
        this.QuestionsRepository.findAll((err, data) => {
            if (err) {
                return console.log(err);
            }

            this.model.questions.push(...data);
        });
    }

    attachHandlerBack() {
        this.onTagClick("navigation:go-back", () => {
            this.history.goBack();
        });
    }

    attachQuestionAnswer() {
        this.onTagClick("question:answer", (model) => {
            const modalConfig = {
                controller: "modals/AnswerQuestionController",
                disableExpanding: false,
                disableBackdropClosing: true,
                title: model.question,
            };

            this.showModalFromTemplate(
                "answer-question",
                (event) => {
                    const response = event.detail;
                    if (response) {
                        model.answer = response;
                        this.updateQuestion(model);
                    }
                }, this.emptyCallback, modalConfig);
        });
    }

    updateQuestion(response) {
        this.QuestionsRepository.update(response.pk, response, (err, data) => {
            if (err) {
                return console.log(err);
            }

            this.TrialParticipantRepository.findAll((err, tps) => {
                if (err) {
                    return console.log(err);
                }

                tps.forEach(tp => {
                    this.sendMessageToPatient(tp.did, data);
                });
            })
        })
    }

    sendMessageToPatient(did, question) {
        this.CommunicationService.sendMessage(did, {
            operation: Constants.MESSAGES.PATIENT.QUESTION_RESPONSE,
            useCaseSpecifics: {
                question: {
                    ...question
                },
            },
            shortDescription: "Hco answered to question ",
        });
    }
}
