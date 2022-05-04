import DeviceAssignationService from "../../services/DeviceAssignationService.js";
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class TrialParticipantDevicesController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);
        this.model = this.getFormViewModel(this.getState());

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Participant Devices",
                tag: "trial-participant-devices"
            }
        );

        this._attachHandlerGoBack(this.model);
        this._attachHandlerSave();
    }


    getFormViewModel(prevState) {
        return {
            trialNumber: prevState.trialNumber,
            tpUid: prevState.tpUid,
            participantName: prevState.participantName,
            participantDID: prevState.participantDID,
            trialUid: prevState.trialUid,

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
            trial: this.model.trialUid,
            deviceId: this.model.device.value,
            patientDID: this.model.participantDID,
        };
    }

    _attachHandlerGoBack(prevState) {
        this.onTagClick('back', () => {
            let state = {
                participantDID: this.model.participantDID,
                participantName: this.model.participantName,
                tpUid: this.model.tpUid ,
                trialNumber: this.model.trialNumber,
                trialUid: this.model.trialUid,
                breadcrumb: this.model.toObject('breadcrumb')
            }

            this.navigateToPageTag('econsent-trial-participant-devices-list', state);
        });
    }

    _attachHandlerSave() {
        this.onTagEvent('save', 'click', (model, target, event) => {

            this.DeviceAssignationService = new DeviceAssignationService();
            this.DeviceAssignationService.assignDevice(this.preparePatientDeviceData(), (err, data) => {
                let message = {};

                if (err) {
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = `The device has been assigned to the patient successfully!`;
                    message.type = 'success'
                }

                let state = {
                    message: message,
                    participantDID: this.model.participantDID,
                    participantName: this.model.participantName,
                    tpUid: this.model.tpUid ,
                    trialNumber: this.model.trialNumber,
                    trialUid: this.model.trialUid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }

                this.navigateToPageTag('econsent-trial-participant-devices-list', state);
            });
        });
    }


}
