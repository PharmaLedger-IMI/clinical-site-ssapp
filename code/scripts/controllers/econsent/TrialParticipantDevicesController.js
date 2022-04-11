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
            trial: this.model.trialSSI,
            deviceId: this.model.device.value,
            patientDID: this.model.participantDID,
        };
    }

    _attachHandlerGoBack(prevState) {
        this.onTagClick('back', () => {
            this.navigateToPageTag('econsent-trial-participants', {
                trialUid : prevState.trialSSI ,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerSave() {
        this.onTagEvent('save', 'click', (model, target, event) => {

            this.DeviceAssignationService = new DeviceAssignationService();
            this.DeviceAssignationService.assignDevice(this.preparePatientDeviceData(), (err, data) => {
                if (err) {
                    this.navigateToPageTag('confirmation-page', {
                        confirmationMessage: "An error has been occurred!",
                        redirectPage: "econsent-trial-management",
                        breadcrumb: this.model.toObject('breadcrumb')
                    });
                    return console.log(err);
                }
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "The device has been assigned to the patient successfully.",
                    redirectPage: "econsent-trial-management",
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            });
        });
    }


}
