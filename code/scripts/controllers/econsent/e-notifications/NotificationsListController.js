const commonServices = require('common-services');
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class NotificationsListController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        const prevState = this.getState() || {};
        this.model.notificationType = prevState.notType;

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Notifications list",
                tag: "econsent-notifications-list"
            }
        );

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
            notType: '',
            ...this.getState()
        };
    }

}
