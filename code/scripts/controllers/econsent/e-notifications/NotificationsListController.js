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
        this.attachModelHandlers();
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

            this.model.notifications = data.filter(not => not.type.trim() === this.model.notificationType.trim());
        });
    }

    attachModelHandlers() {
        this.model.addExpression(
            'notificationsListEmpty',
            () => this.model.notifications && this.model.notifications.length > 0,
            'notifications');
    }

    attachHandlerBack() {
        this.onTagClick('navigation:go-back', () => {
            this.history.goBack();
        });
    }

    attachHandlerTrialParticipants() {
        this.onTagClick('navigation:goToAction', (model) => {
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
            notificationsListEmpty: true,
            notType: ''
        };
    }

}
