const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class ManageDevicesController extends BreadCrumbManager {
    constructor(element, history) {
        super(element, history);
        this.model = {};

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Manage Devices",
                tag: "iot-manage-devices"
            }
        );

        this.attachHandlerAddDevice();
        this.attachHandlerSearchDevice();
        this.attachHandlerGoBack();

    }

    attachHandlerAddDevice() {
        this.onTagClick('devices:add', () => {
            this.navigateToPageTag('iot-add-device',{breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    attachHandlerSearchDevice() {
        this.onTagClick('devices:search', () => {
            this.navigateToPageTag('iot-list-all-devices',{breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    attachHandlerGoBack() {
        this.onTagClick('devices:back', () => {
            this.navigateToPageTag('home');
        });
    }
}