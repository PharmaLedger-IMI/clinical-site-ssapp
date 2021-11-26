const {WebcController} = WebCardinal.controllers;

import DeviceService from "../../../services/DeviceService.js"

export default class ListDevicesController extends WebcController {
    constructor(element, history) {
        super(element, history);

        this.model = {allDevices: []};
        this.DeviceService = new DeviceService();

        this.attachModelHandlers();
        this.attachHandlerGoBack();
        this.attachHandlerViewDevice();
        this.attachHandlerEditDevice();

        this.init();
    }

    init() {
        this.DeviceService.searchDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }

            this.model.allDevices = devices;
        });
    }

    attachModelHandlers() {
        this.model.addExpression(
            'deviceListNotEmpty',
            () => this.model.allDevices && this.model.allDevices.length > 0,
            'allDevices');
    }

    attachHandlerGoBack() {
        this.onTagClick('go-back', () => {
            console.log("Go Back button pressed");
            this.navigateToPageTag('iot-manage-devices');
        });
    }

    attachHandlerViewDevice() {
        this.onTagClick('view', (model) => {
            console.log("Patient Status button pressed", model);
            this.navigateToPageTag('patient-status', model);
        });
    }

    attachHandlerEditDevice() {
        this.onTagClick('edit', (model) => {
            console.log("Edit Device button pressed", model);
            this.navigateToPageTag('patient-status', model);
        });
    }
}