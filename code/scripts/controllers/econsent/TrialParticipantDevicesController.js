import DeviceAssignationService from "../../services/DeviceAssignationService.js";
import DeviceServices from "../../services/DeviceServices.js";
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const {getDidServiceInstance} = commonServices.DidService;
const CommunicationService = commonServices.CommunicationService;
const COMMUNICATION_MESSAGES = {
    DEVICE_ASSIGNATION: "device_assignation"
}


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

        this._attachHandlerGoBack();
        this._attachHandlerSave();
        this.initServices();
    }

    initServices(){
        this.didService = getDidServiceInstance();
        this.didService.getDID().then(did => {
            this.model.clinicalSiteDID = did;
        });
        this.getAllDevices();
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
    }

    getAllDevices(){
        this.DeviceServices = new DeviceServices();
        this.DeviceServices.getDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            this.model.allDevices = devices;
        });
    }

    getFormViewModel(prevState) {
        return {
            trialNumber: prevState.trialNumber,
            tpUid: prevState.tpUid,
            participantName: prevState.participantName,
            participantDID: prevState.participantDID,
            trialUid: prevState.trialUid,
            trialParticipantNumber: prevState.trialParticipantNumber,

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

    preparePatientDeviceAssignationData() {

        let chosenDeviceIndex = this.model.allDevices.findIndex(device => device.sk === this.model.device.value);
        this.model.allDevices[chosenDeviceIndex].isAssigned = true;
        this.DeviceServices.updateDevice(this.model.allDevices[chosenDeviceIndex], (err, data) => {
            if (err) {
                return console.error(err);
            }
        });

        return {
            trial: this.model.trialUid,
            deviceId: this.model.device.value,
            patientDID: this.model.participantDID,
            clinicalSiteDID: this.model.clinicalSiteDID,
            trialParticipantNumber: this.model.trialParticipantNumber
        };
    }

    _attachHandlerGoBack() {
        this.onTagClick('back', () => {
            let state = {
                participantDID: this.model.participantDID,
                participantName: this.model.participantName,
                tpUid: this.model.tpUid ,
                trialParticipantNumber: this.model.trialParticipantNumber,
                trialNumber: this.model.trialNumber,
                trialUid: this.model.trialUid,
                breadcrumb: this.model.toObject('breadcrumb')
            }

            this.navigateToPageTag('econsent-trial-participant-devices-list', state);
        });
    }

    _attachHandlerSave() {
        this.onTagEvent('save', 'click', (model, target, event) => {
            window.WebCardinal.loader.hidden = false;

            this.DeviceAssignationService = new DeviceAssignationService();
            this.DeviceAssignationService.assignDevice(this.preparePatientDeviceAssignationData(), (err, data) => {
                let message = {};

                if (err) {
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = `The device has been assigned to the patient successfully!`;
                    message.type = 'success'
                }

                this.CommunicationService.sendMessageToIotAdapter({
                    operation:  COMMUNICATION_MESSAGES.DEVICE_ASSIGNATION,
                    ssi:        data.sReadSSI
                })

                let state = {
                    message: message,
                    participantDID: this.model.participantDID,
                    participantName: this.model.participantName,
                    tpUid: this.model.tpUid ,
                    trialParticipantNumber: this.model.trialParticipantNumber,
                    trialNumber: this.model.trialNumber,
                    trialUid: this.model.trialUid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }
                window.WebCardinal.loader.hidden = true;
                this.navigateToPageTag('econsent-trial-participant-devices-list', state);
            });
        });
    }


}
