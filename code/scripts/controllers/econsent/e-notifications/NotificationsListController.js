const {WebcController} = WebCardinal.controllers;
const commonServices = require('common-services');
const BaseRepository = commonServices.BaseRepository;

export default class NotificationsListController extends WebcController {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();
        this.model.notificationType = this.getState().notType;

        this.initServices();
        this.initNotifications();
        this.initHandlers();
    }

    initHandlers() {
        this.attachHandlerBack();
        this.attachHandlerTrialParticipants();
    }

    initServices() {
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
    }

    initNotifications() {

        this.NotificationsRepository.findAll((err, data) => {
            if (err) {
                return console.log(err);
            }

            this.model.notifications = data.filter(not => not.type.trim() === this.model.notificationType.trim())
        });
    }

    attachHandlerBack() {
        this.onTagClick('navigation:go-back', () => {
            this.history.goBack();
        });
    }

    attachHandlerTrialParticipants() {
        this.onTagClick('goToAction', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            if (model.recommendedAction === 'view trial') {
                this.navigateToPageTag('trial-participants', model.ssi);
            }

            if (model.recommendedAction === 'view trial participants') {
                this.navigateToPageTag('trial-participants', model.ssi);
            }

            if (model.recommendedAction === 'view visits') {
                this.navigateToPageTag('visits-procedures', {
                    trialSSI: this.model.ssi,
                    tpUid: this.model.tpUid,
                });
            }

            if (model.recommendedAction === 'view questions') {
                this.navigateToPageTag('questions');
            }

        });
    }

    getInitModel() {
        return {
            notifications: [],
            notType: ''
        };
    }

}
