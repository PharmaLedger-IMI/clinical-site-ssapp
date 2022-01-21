const {WebcController} = WebCardinal.controllers;
import DeviceServices from "../../../services/DeviceServices.js";

export default class AddDeviceSummaryController extends WebcController {
    constructor(element, history) {
        super(element, history);

        this.model = this.getState();
        this.deviceServices = new DeviceServices();
        this.attachHandlerEditButton();
        this.attachHandlerAcceptButton();
    }

    attachHandlerEditButton() {
        this.onTagClick('summary:edit', () => {
            console.log("Edit button pressed");
            this.navigateToPageTag('iot-add-device', this.model.toObject());
        });
    }

    attachHandlerAcceptButton() {
        this.onTagClick('summary:accept', () => {
            
            this.deviceServices.saveDevice(this.model.toObject(), (err) => {
                if (err) {
                    console.error(err);
                }

                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "Device included!",
                    redirectPage: "iot-manage-devices"
                });
            });
        });
    }
}