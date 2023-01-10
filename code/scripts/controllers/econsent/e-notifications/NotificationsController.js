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

            let notifications = data;

            let notificationsMap = {};
            Object.keys(Constants.HCO_NOTIFICATIONS_TYPE).forEach(notificationType => {
                notificationsMap[Constants.HCO_NOTIFICATIONS_TYPE[notificationType].notificationTitle] = [];
            })

            notifications.forEach((notification)=>{
                if(notificationsMap[notification.type]){
                    notificationsMap[notification.type].push(notification);
                }
            })

            this.model.notifications = Object.keys(notificationsMap).map(key=>{
                return {
                    notificationType:key,
                    unreadNotifications:notificationsMap[key].filter((x) => !x.read).length > 0 ? notificationsMap[key].filter((x) => !x.read).length : null
                }
            })
        });
    }

    attachHandlerNotificationsList() {
        this.onTagClick('view-notifications-list', (model) => {
            this.navigateToPageTag('econsent-notifications-list', {
                notificationType: model.notificationType,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    getInitModel() {
        return {
            notifications: [],
        };
    }
}
