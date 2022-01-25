const {WebcController} = WebCardinal.controllers;
import DeviceAssignationService from "../../services/DeviceAssignationService.js";
import DeviceServices from "../../services/DeviceServices.js";


export default class TrialParticipantDevicesController extends WebcController {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.checkIfDeviceAlreadyAssigned(prevState);

        this._attachHandlerGoBack(prevState);
        this._attachHandlerSave();
        this._initHandlers();
    }

    getFormViewModel(prevState, deviceOptions) {
        return {

            trialSSI: prevState.trialSSI,
            trialNumber: prevState.trialNumber,
            tpUid: prevState.tpUid,
            participantName: prevState.participantName,
            participantDID: prevState.participantDID,

            device: {
                label: "Device ID",
                required: true,
                options: deviceOptions,
                value: deviceOptions[0].value
            },
            patient: {
                label: "Patient Name",
                required: true,
                options: [
                    {
                        label: prevState.participantName,
                        value: prevState.participantName
                    }
                ],
                value: prevState.participantName || "",
                did: prevState.participantDID || ""
            },
            trial: {
                label: "Trial ID",
                required: true,
                options: [
                    {
                        label: prevState.trialSSI,
                        value: prevState.trialSSI
                    }
                ],
                value: prevState.trialSSI || ""
            }
        }
    }

    preparePatientDeviceData() {
        return {
            trial: this.model.trial.value,
            deviceId: this.model.device.value,
            patientDID: this.model.participantDID,
        };
    }

    getDevices(prevState){
        this.deviceServices = new DeviceServices();
        this.deviceServices.searchDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            this.model.allDevices = devices;
            this.model.foundRegisteredDevices = this.model.allDevices.filter(t => t.trialSSI === prevState.trialSSI);
            if (this.model.foundRegisteredDevices.length>0){
                this.model.assigning = true;
                let deviceOptions = []
                for (const [key, value] of Object.entries(this.model.foundRegisteredDevices)) {
                    deviceOptions.push(
                        {
                            label: value.deviceName,
                            value: value.sk
                        }
                    )
                }
                this.model = this.getFormViewModel(prevState, deviceOptions);
            }
            if (this.model.foundRegisteredDevices.length == 0){
                this.model.message = "Error: There are no registered devices in this trial."
                this.model.assigning = false;
            }
        });
    }

    findAvailableDevicesInGivenTrial(){
        return this.model.allDevices.filter(t => t.trialSSI === this.model.trialSSI);
    }

    checkIfDeviceAlreadyAssigned(prevState){
        this.DeviceAssignationService = new DeviceAssignationService();
        this.DeviceAssignationService.getAssignedDevices( (err, assignedDevices) => {
            if (err) {
                return console.error(err);
            }
            this.model.foundAssignedDevices = assignedDevices.filter(ad => ad.patientDID === prevState.participantDID);
            if (this.model.foundAssignedDevices.length>0) {
                console.log(this.model.foundAssignedDevices);
                this.model.message = "Error: The user has already an assigned device."
                this.model.assigning = false;
            }
            else{
                this.model.assigning = true;
                this.getDevices(prevState);
            }
        } );
    }

    _initHandlers() {
        this._attachHandlerGoBack();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    _attachHandlerGoBack(prevState) {
        this.onTagEvent('back', 'click', (model, target, event) => {
            // this.navigateToPageTag('econsent-trial-management');
            this.navigateToPageTag('econsent-trial-participants', prevState.trialSSI);
        });
    }

    _attachHandlerSave() {
        this.onTagEvent('save', 'click', (model, target, event) => {

            this.DeviceAssignationService = new DeviceAssignationService();
            this.DeviceAssignationService.assignDevice(this.preparePatientDeviceData(), (err, data) => {
                if (err) {
                    this.navigateToPageTag('confirmation-page', {
                        confirmationMessage: "An error has been occurred!",
                        redirectPage: "econsent-trial-management"
                    });
                    return console.log(err);
                }
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "The device has been assigned to the patient successfully.",
                    redirectPage: "econsent-trial-management"
                });
            });
        });
    }



}
