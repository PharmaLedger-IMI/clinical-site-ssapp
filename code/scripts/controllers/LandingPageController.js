const {WebcController} = WebCardinal.controllers;
const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
import ResponsesService from '../services/ResponsesService.js';
import TrialParticipantRepository from '../repositories/TrialParticipantRepository.js';
import TrialRepository from '../repositories/TrialRepository.js';

// TODO: Landing Controller will listen to all messages: incoming trials, questionnaires, consent updates, withdraws and so on...
export default class LandingPageController extends WebcController {
    constructor(element, history) {
        super(element, history);

        this.model = {};

        this.initServices();
        this.initHandlers();
    }

    initServices() {
        this.ResponsesService = new ResponsesService(this.DSUStorage);
        this.TrialParticipantRepository = TrialParticipantRepository.getInstance(this.DSUStorage);
        this.TrialRepository = TrialRepository.getInstance(this.DSUStorage);
        this.CommunicationService = CommunicationService.getInstance(CommunicationService.identities.IOT.PROFESSIONAL_IDENTITY);
    }

    initHandlers() {
        this.attachHandlerManageDevices();
        this.attachHandlerTrialManagement();
        this.attachHandlerListOfPatients();
        this.attachHandlerVisits();
        this.attachHandlerEconsentTrialManagement();
        this.attachDidMessagesListener();
    }

    attachDidMessagesListener() {
        this.CommunicationService.listenForMessages((err, data) => {
            if (err) {
                return console.error(err);
            }
            data = JSON.parse(data);
            switch (data.domain) {
                case 'iot': {
                    this.handleIotMessages(data);
                    break;
                }
                case 'eco': {
                    this.handleEcoMessages(data);
                    break;
                }
            }
        });
    }

    attachHandlerManageDevices() {
        this.onTagClick('navigation:iot-manage-devices', () => {
            this.navigateToPageTag('iot-manage-devices');
        });
    }

    attachHandlerTrialManagement() {
        this.onTagClick('navigation:trial-management', () => {
            this.navigateToPageTag('trial-management');
        });
    }

    attachHandlerListOfPatients() {
        this.onTagClick('navigation:econsent-notifications', () => {
            this.navigateToPageTag('econsent-notifications');
        });
    }

    attachHandlerVisits() {
        this.onTagClick('navigation:econsent-visits', () => {
            this.navigateToPageTag('econsent-visits');
        });
    }

    attachHandlerEconsentTrialManagement() {
        this.onTagClick('navigation:econsent-trial-management', () => {
            this.navigateToPageTag('econsent-trial-management');
        });
    }

    handleIotMessages(data) {
        switch (data.message.operation) {
            case 'questionnaire-response': {
                console.log('Received message', data.message);
                this.ResponsesService.mount(data.message.ssi, (err, data) => {
                    if (err) {
                        return console.log(err);
                    }
                    this.ResponsesService.getResponses((err, data) => {
                        if (err) {
                            return console.log(err);
                        }
                        console.log('ProfessionalSSAPPHomeController');
                        data.forEach(response => {
                            response.item.forEach(item => {
                                console.log(item.answer[0], item.linkId, item.text)
                            })
                        })
                    })
                });
                break;
            }
        }
    }

    async handleEcoMessages(data) {
        switch (data.did) {
            case CommunicationService.identities.ECO.HCO_IDENTITY.did: {
                switch (data.message.operation) {
                    case 'add-trial-subject': {
                        let useCaseSpecifics = data.message.useCaseSpecifics;
                        let trial = useCaseSpecifics.trial;
                        let participant = useCaseSpecifics.participant;
                        let trials = await this.TrialRepository.filterAsync(`id == ${trial.id}`, 'ascending', 30);
                        if (trials.length === 0) {
                            await this.TrialRepository.createAsync(trial);
                        }
                        participant.trialId = trial.id;
                        await this.TrialParticipantRepository.createAsync(participant);
                        break;
                    }
                }
                break;
            }
        }
    }


    // async attachHandlerListOfPatients() {
    //     this.onTagClick('home:list-of-patients', () => {
    //         this.IotAdaptorApi = new IotAdaptorApi();
    //         let observations = [];
    //         this.IotAdaptorApi.searchResource("Observation", function (err, result) {
    //             result.forEach(value => {
    //                 let initData = {
    //                     name: value.code.text,
    //                     value: value.valueQuantity.value,
    //                     unit: value.valueQuantity.unit
    //                 };
    //                 observations.push(initData);
    //             });
    //         });
    //
    //         this.navigateToPageTag('patient-status', {allData: observations});
    //     });
    // }


}