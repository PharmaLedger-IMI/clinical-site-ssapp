import {getNotificationsService} from "../../../services/NotificationsService.js";
const commonServices = require('common-services');
const DataSourceFactory = commonServices.getDataSourceFactory();
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
        this.attachActionsHandlers();
    }

    initServices() {
        this.NotificationsRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.NOTIFICATIONS);
    }

    initNotifications() {
        this.NotificationsRepository.findAll((err, data) => {
            if (err) {
                return console.log(err);
            }

            const notifications = data.filter(notification => this.model.notificationType.indexOf(notification.type.trim()) > 1);
            this.model.notificationsListEmpty = notifications.length === 0;
            this.model.notificationsDatasource = DataSourceFactory.createDataSource(2, 10, notifications);
        });
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
                this.navigateToPageTag('econsent-questions', {
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            }
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
