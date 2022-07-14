import {getNotificationsService} from "../../../services/NotificationsService.js";
const commonServices = require('common-services');
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class NotificationsListController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getInitModel();

        const prevState = this.getState() || {};
        this.model.notificationType = prevState.notType;
        this.notificationService = getNotificationsService();

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

            this.model.notifications = data.filter(not => this.model.notificationType.indexOf(not.type.trim()) > 1);
        });
    }

    async markNotificationHandler(model) {
        window.WebCardinal.loader.hidden = false;
        await this.notificationService.changeNotificationStatus(model.pk);
        window.WebCardinal.loader.hidden = true;
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
        this.onTagClick('navigation:goToAction', async (model) => {
            await this.markNotificationHandler(model);

            if (model.recommendedAction === 'view trial') {
                this.navigateToPageTag('econsent-trial-participants', {
                    breadcrumb: this.model.toObject('breadcrumb'),
                    trialUid: model.trialUid,
                    });
            }

            if (model.recommendedAction === 'view trial participants') {
                this.navigateToPageTag('econsent-trial-participants', {
                    trialUid: model.useCaseSpecifics.trialSSI,
                    breadcrumb: this.model.toObject('breadcrumb')});
            }

            if (model.recommendedAction === 'view visits') {
            //     this.navigateToPageTag('econsent-visits-procedures', {
            //         breadcrumb: this.model.toObject('breadcrumb')
            // });
            }

            if (model.recommendedAction === 'view questions') {
                this.navigateToPageTag('econsent-questions', {
                    breadcrumb: this.model.toObject('breadcrumb')
                });
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
