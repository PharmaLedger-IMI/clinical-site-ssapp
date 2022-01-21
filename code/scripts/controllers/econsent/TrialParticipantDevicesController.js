const {WebcController} = WebCardinal.controllers;
import DeviceAssignationService from "../../services/DeviceAssignationService.js";
import DeviceServices from "../../services/DeviceServices.js";


export default class TrialParticipantDevicesController extends WebcController {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = this.getFormViewModel(prevState);
        console.log(this.model);


        // 1. search for assigned devices in DSU assignation service
        // 2. list available devices

        this.checkAvailableDevicesInGivenTrial();

        this._attachHandlerGoBack();
        this._attachHandlerSave();
        this._initHandlers();
    }

    getFormViewModel(prevState) {
        return {

            assigning: true,

            trialSSI: prevState.trialSSI,
            trialNumber: prevState.trialNumber,
            tpUid: prevState.tpUid,
            participantName: prevState.participantName,
            participantDID: prevState.participantDID,

            device: {
                label: "Device ID",
                required: true,
                options: [
                    {
                        label: "QC12345",
                        value: 'QC12345'
                    }
                ],
                value:  "QC12345"
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

    checkAvailableDevicesInGivenTrial(){
        let trial_ssi = this.model.trialSSI;
        this.deviceServices = new DeviceServices();
        this.deviceServices.searchDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            console.log(devices);
            this.model.allDevices = devices;
        });
        console.log(this.model.allDevices);
    }

    _initHandlers() {
        this._attachHandlerGoBack();
        this.on('openFeedback', (e) => {
            this.feedbackEmitter = e.detail;
        });
    }

    _attachHandlerGoBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.navigateToPageTag('econsent-trial-management');
        });
    }

    _attachHandlerSave() {
        this.onTagEvent('save', 'click', (model, target, event) => {
            console.log(this.preparePatientDeviceData())
            this.DeviceAssignationService = new DeviceAssignationService();
            this.DeviceAssignationService.saveDevice(this.preparePatientDeviceData(), (err, data) => {
                if (err) {
                    this.navigateToPageTag('confirmation-page', {
                        confirmationMessage: "An error has been occurred!",
                        redirectPage: "home"
                    });
                    return console.log(err);
                }
                console.log(data.uid);
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "The device has been assigned to the patient successfully.",
                    redirectPage: "home"
                });
            });
        });
    }



}
