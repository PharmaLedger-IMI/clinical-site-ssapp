const {WebcController} = WebCardinal.controllers;
import DeviceAssignationService from "../../services/DeviceAssignationService.js";


export default class TrialParticipantDevicesController extends WebcController {

    constructor(...props) {
        super(...props);
        const prevState = this.getState();
        this._attachHandlerGoBack(prevState);
        this._attachHandlerSave();
        this.model = this.getFormViewModel(prevState);
    }


    getFormViewModel(prevState) {
        return {
            trialNumber: prevState.trialNumber,
            tpUid: prevState.tpUid,
            participantName: prevState.participantName,
            participantDID: prevState.participantDID,
            trialSSI: prevState.trialSSI,

            device: {
                label: "Device ID",
                required: true,
                options: prevState.availableDevices,
                value: prevState.availableDevices[0].value
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
                value: prevState.participantName || ""
            }
        }
    }

    preparePatientDeviceData() {
        return {
            trial: this.model.trialSSI,
            deviceId: this.model.device.value,
            patientDID: this.model.participantDID,
        };
    }

    _attachHandlerGoBack(prevState) {
        this.onTagClick('back', () => {
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
