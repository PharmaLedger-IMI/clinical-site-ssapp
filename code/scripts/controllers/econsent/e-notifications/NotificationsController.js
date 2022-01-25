const commonServices = require('common-services');
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;

const {WebcController} = WebCardinal.controllers;

export default class NotificationsController extends WebcController {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        this.initServices();
        this.initNotifications();
        this.initHandlers();
    }

    initHandlers() {
        this.attachHandlerBack();
        this.attachHandlerNotificationsList();
    }

    initServices() {
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS, this.DSUStorage);
    }

    initNotifications() {
        this.model.notTypes.trialUpdates = true;
        this.model.notTypes.consentUpdates = true;

        this.NotificationsRepository.findAll((err, data) => {
            if (err) {
                return console.log(err);
            }

            this.model.notifications = data;
            this.model.notTypes.trialUpdates = this.model.notifications.filter(not => not.type === Constants.NOTIFICATIONS_TYPE.TRIAL_UPDATES)?.length > 0;
            this.model.notTypes.withdraws = this.model.notifications.filter(not => not.type === Constants.NOTIFICATIONS_TYPE.WITHDRAWS)?.length > 0;
            this.model.notTypes.consentUpdates = this.model.notifications.filter(not => not.type === Constants.NOTIFICATIONS_TYPE.CONSENT_UPDATES)?.length > 0;
            this.model.notTypes.milestones = this.model.notifications.filter(not => not.type === Constants.NOTIFICATIONS_TYPE.MILESTONES_REMINDERS)?.length > 0;
            this.model.notTypes.questions = this.model.notifications.filter(not => not.type === Constants.NOTIFICATIONS_TYPE.TRIAL_SUBJECT_QUESTIONS)?.length > 0;
        });
    }

    attachHandlerNotificationsList() {
        this.onTagClick('navigation:econsent-notifications-list', (model, target) => {
            this.navigateToPageTag('econsent-notifications-list', {notType: target.textContent});
        });
    }

    attachHandlerBack() {
        this.onTagClick('navigation:go-back', () => {
            this.history.goBack();
        });
    }

    getInitModel() {
        return {
            notifications: [],
            notTypes: {
                trialUpdates: false,
                withdraws: false,
                consentUpdates: false,
                milestones: false,
                questions: false
            }
        };
    }
}
