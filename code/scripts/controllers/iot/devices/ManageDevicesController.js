const {WebcController} = WebCardinal.controllers;

export default class ManageDevicesController extends WebcController {
    constructor(element, history) {
        super(element, history);
        this.model = {};

        const prevState = this.getState() || {};
        const {breadcrumb, ...state} = prevState;
        
        this.model = prevState;        

        this.model.breadcrumb.push({
            label:"Manage Devices",
            tag:"iot-manage-devices",
            state: state
        });

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