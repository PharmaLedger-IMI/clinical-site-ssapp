import HCOService from "../../../services/HCOService.js"
import DeviceAssignationService from "../../../services/DeviceAssignationService.js";
const commonServices = require("common-services");
const DeviceServices = commonServices.DeviceServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
import {modelSetter, prepareDeviceData} from "./deviceModel/deviceViewModel.js";


export default class EditDeviceController extends BreadCrumbManager {
    constructor(element, history) {

        super(element, history);

        const prevState = this.getState() || {};
        this.model = this.getState();

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Edit Device",
                tag: "iot-edit-device"
            }
        );

        this.deviceServices = new DeviceServices();
        this.deviceAssignationService = new DeviceAssignationService();

        if (this.model.data.isAssigned) {

            this.deviceAssignationService.getAssignedDevices((err, assignationDevices) => {
                const assignationDevice = assignationDevices.find(assignationDevice => assignationDevice.deviceId === this.model.data.deviceId);
                this.model.trialParticipantNumber = assignationDevice.trialParticipantNumber;
            })
        }

        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            let listTrials = hcoDSU.volatile.trial;

            let allTrials = listTrials.filter(trial => {
                if (!this.model.data.isAssigned) {
                    return true;
                }
                return this.model.data.trialID === trial.id
            }).map(trial => {
                return {
                    label: trial.name + " - " + trial.id,
                    value: trial.id,
                    ssi: trial.uid,
                    name: trial.name
                };
            })

            let trialsState = {prevState: prevState.data, trials: allTrials}
            this.model = modelSetter(trialsState, true);
            this.model.trials = allTrials;
        });

        this.attachHandlerUpdateButton();

    }


    attachHandlerUpdateButton() {
        this.onTagClick('devices:update', () => {
            window.WebCardinal.loader.hidden = false;
            const deviceData = prepareDeviceData(this.model.trials, this.model.form);
            deviceData.uid = this.model.data.uid;
            deviceData.isAssigned = this.model.isAssigned;
            this.deviceServices.updateDevice(deviceData, (err, data) => {
                let message = {};

                if (err) {
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = `The device has been updated!`;
                    message.type = 'success'
                }

                window.WebCardinal.loader.hidden = true;
                this.navigateToPageTag('iot-manage-devices', {
                    message: message,
                    breadcrumb: this.model.toObject('breadcrumb')
                });

            });
        });
    }

}
