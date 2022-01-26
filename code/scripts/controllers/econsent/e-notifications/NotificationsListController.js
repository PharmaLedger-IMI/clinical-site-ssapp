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
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS, this.DSUStorage);
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
                this.navigateToPageTag('econsent-trial-participants', model.ssi);
            }

            if (model.recommendedAction === 'view trial participants') {
                this.navigateToPageTag('econsent-trial-participants', model.ssi);
            }

            if (model.recommendedAction === 'view visits') {
                this.navigateToPageTag('econsent-visits-procedures', {
                    trialSSI: this.model.ssi,
                    tpUid: this.model.tpUid,
                });
            }

            if (model.recommendedAction === 'view questions') {
                this.navigateToPageTag('econsent-questions');
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
