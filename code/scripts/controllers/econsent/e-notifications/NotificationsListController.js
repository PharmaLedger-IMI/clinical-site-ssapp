import {getNotificationsService} from "../../../services/NotificationsService.js";
const commonServices = require('common-services');
const DataSourceFactory = commonServices.getDataSourceFactory();
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const momentService = commonServices.momentService;
const Constants = commonServices.Constants;

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

        this.initServices().then(async () => {
            await this.initNotifications();
        });
        this.initNotifications();
        this.initHandlers();
    }

    initHandlers() {
        this.attachActionsHandlers();
    }

    async initServices() {
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
    }

    async initNotifications() {
        let fetchedNotifications = await this.notificationService.getNotifications();
        let notifications = fetchedNotifications.filter(notification => this.model.notificationType.indexOf(notification.type.trim()) > 1);
        notifications.forEach(notification => {
            notification.toShowDate = momentService(notification.date).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
        });
        notifications.sort((a, b) => b.date - a.date);
        this.model.notificationsListEmpty = notifications.length === 0;
        this.model.notificationsDatasource = DataSourceFactory.createDataSource(2, 10, notifications);
    }

    async markNotificationHandler(model) {
        window.WebCardinal.loader.hidden = false;
        await this.notificationService.changeNotificationStatus(model.pk);
        window.WebCardinal.loader.hidden = true;
    }

    attachActionsHandlers() {
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
                this.navigateToPageTag('trial-participant-answers', {
                    ...model.state,
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            }

            this.initNotifications();
        });
    }

    getInitModel() {
        return {
            notifications: [],
            notType: '',
            ...this.getState()
        };
    }

}
