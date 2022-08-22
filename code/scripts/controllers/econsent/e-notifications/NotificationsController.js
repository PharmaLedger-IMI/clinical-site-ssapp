const commonServices = require('common-services');
const Constants = commonServices.Constants;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class NotificationsController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Notifications",
                tag: "econsent-notifications"
            }
        );

        this.initServices();
        this.initNotifications();
        this.initHandlers();
    }

    initHandlers() {
        this.attachHandlerNotificationsList();
    }

    initServices() {
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
    }

    initNotifications() {
        this.NotificationsRepository.findAll((err, data) => {
            if (err) {
                return console.log(err);
            }

            this.model.notifications = data;

            let trialUpdates = this.model.notifications.filter(not => not.type === Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_UPDATES.notificationTitle);
            this.model.unreadTrialUpdates = trialUpdates.filter((x) => !x.read).length > 0 ? trialUpdates.filter((x) => !x.read).length : null;

            let withdraws = this.model.notifications.filter(not => not.type === Constants.HCO_NOTIFICATIONS_TYPE.WITHDRAWS.notificationTitle);
            this.model.unreadWithdraws = withdraws.filter((x) => !x.read).length > 0 ? withdraws.filter((x) => !x.read).length : null;

            let consentUpdates = this.model.notifications.filter(not => not.type === Constants.HCO_NOTIFICATIONS_TYPE.CONSENT_UPDATES.notificationTitle);
            this.model.unreadConsentUpdates = consentUpdates.filter((x) => !x.read).length > 0 ? consentUpdates.filter((x) => !x.read).length : null;

            let milestones = this.model.notifications.filter(not => not.type === Constants.HCO_NOTIFICATIONS_TYPE.MILESTONES_REMINDERS.notificationTitle);
            this.model.unreadMilestones = milestones.filter((x) => !x.read).length > 0 ? milestones.filter((x) => !x.read).length : null;

            let questions = this.model.notifications.filter(not => not.type === Constants.HCO_NOTIFICATIONS_TYPE.TRIAL_SUBJECT_QUESTIONNAIRE_RESPONSES.notificationTitle);
            this.model.unreadQuestionnaireResponses = questions.filter((x) => !x.read).length > 0 ? questions.filter((x) => !x.read).length : null;
        });
    }

    attachHandlerNotificationsList() {
        this.onTagClick('navigation:econsent-notifications-list', (model, target) => {
            this.navigateToPageTag('econsent-notifications-list', { notType: target.textContent, breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    getInitModel() {
        return {
            notifications: [],
        };
    }
}
