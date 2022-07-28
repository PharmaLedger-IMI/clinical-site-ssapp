import DeviceAssignationService from "../../services/DeviceAssignationService.js";
import DeviceServices from "../../services/DeviceServices.js";
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class TrialParticipantDevicesListController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        this.model = this.getState();

        this.model = {
            trialUid: prevState.trialUid,
            trialNumber: prevState.trialNumber,
            tpUid: prevState.tpUid,
            participantName: prevState.participantName,
            participantDID: prevState.participantDID,
            trialParticipantNumber: prevState.trialParticipantNumber
        };
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Participant Devices List",
                tag: "econsent-trial-participant-devices-list"
            }
        );

        this.model.devices = [];
        this.model.devices_this_trial = [];
        this.model.assignedDevices = [];
        this.model.AssignedDevicesForChosenPatient = [];
        this.model.available_devices_for_assignation = [];
        this.deviceList = [];

        this.onTagClick("view-iot-data", (model) => {

            this.navigateToPageTag('econsent-trial-participant-health-data', {
                breadcrumb: this.model.toObject('breadcrumb'),
                deviceId: model.deviceId,
                trialParticipantNumber: this.model.trialParticipantNumber
            });
        });

        this.getDevices();
        this.getAssignedDevices();
        this._attachHandlerAssignDevice();
    }
    

    getDevices() {
        this.DeviceServices = new DeviceServices();
        this.DeviceServices.getDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            this.model.devices = devices;
            this.model.devices_this_trial =  this.model.devices.filter(t => t.trialUid === this.model.trialUid);
        });
    }

    getAssignedDevices(){
        this.DeviceAssignationService = new DeviceAssignationService();
        this.DeviceAssignationService.getAssignedDevices( (err, assignedDevices) => {
            if (err) {
                return console.error(err);
            }
            let devices = this.model.devices;
            this.model.assignedDevices = assignedDevices;
            this.model.AssignedDevicesForChosenPatient = assignedDevices.filter(ad => ad.patientDID === this.model.participantDID);
            let tempAssignedDeviceList = this.model.AssignedDevicesForChosenPatient;
            for (let i = 0; i < tempAssignedDeviceList.length; i++) {
                let deviceAssignation = tempAssignedDeviceList[i];
                this.deviceList = this.deviceList.concat(devices.filter(device => device.deviceId === deviceAssignation.deviceId).map(device => {
                    return {
                        ...deviceAssignation,
                        isStillAssigned:typeof deviceAssignation.assignationCompleteDate === "undefined",
                        assignationDateString: new Date(deviceAssignation.assignationDate).toLocaleString(),
                        assignationCompleteDateString: deviceAssignation.assignationCompleteDate ? new Date(deviceAssignation.assignationCompleteDate).toLocaleString():"",
                        deviceId: device.deviceId,
                        modelNumber: device.modelNumber,
                        brand: device.brand,
                        status: device.status
                    }
                }));
            }
            this.model.AssignedDevicesForChosenPatientDataSource = DataSourceFactory.createDataSource(6, 10, this.deviceList);
            const { AssignedDevicesForChosenPatientDataSources } = this.model;
            this.onTagClick("assignedDevice-prev-page", () => AssignedDevicesForChosenPatientDataSources.goToPreviousPage());
            this.onTagClick("assignedDevice-next-page", () => AssignedDevicesForChosenPatientDataSources.goToNextPage());
            this.onTagClick("remove-assignation", (model) => {
                let assignation = {
                    deviceId: model.deviceId,
                    patientDID: model.patientDID,
                    trialParticipantNumber: model.trialParticipantNumber,
                    trial: model.trial,
                    uid: model.uid,
                    assignationDate:model.assignationDate,
                    assignationCompleteDate : Date.now(),
                    isStillAssigned:false,
                }
                this.removeAssignation(assignation);
            });

            this.model.hasAssignedDevices = this.model.AssignedDevicesForChosenPatient.length > 0;
        } );
    }

    getAvailableDevicesToAssign(){
        this.model.available_devices_for_assignation =  this.model.devices_this_trial.filter(device => device.isAssigned === false);
    }

    removeAssignation(deasignedDevice){
        window.WebCardinal.loader.hidden = false;
        let chosenDeviceIndex = this.model.devices.findIndex(device => device.sk === deasignedDevice.deviceId);
        this.model.devices[chosenDeviceIndex].isAssigned = false;
        this.DeviceServices.updateDevice(this.model.devices[chosenDeviceIndex], (err, data) => {
            if (err) {
                return console.error(err);
            }
            this.DeviceAssignationService.updateAssignedDevice(deasignedDevice, (err, data) => {
                if (err) {
                    console.log(err);
                }
                let message = {};
                if (err) {
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = `The device assignation has been removed. You can assign it to another patient!`;
                    message.type = 'success'
                }
                let state = {
                    message: message,
                    trialUid: this.model.trialUid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }
                window.WebCardinal.loader.hidden = true;
                this.navigateToPageTag('econsent-trial-participants', state);
            });
        });
    }

    _attachHandlerAssignDevice() {
        this.onTagClick('assign-device', () => {
            this.getAvailableDevicesToAssign();
            if (this.model.available_devices_for_assignation.length === 0 ){
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "There are no available devices to assign for this trial. Please register a new device for this trial or de-assign a current device from the devices menu.",
                    redirectPage: 'home',
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            }
            else{
                let ids = []
                this.model.available_devices_for_assignation.forEach(element =>
                    ids.push({
                        value: element.sk,
                        label: element.deviceName
                    })
                )
                let state = {
                    availableDevices: ids,
                    participantDID: this.model.participantDID,
                    participantName: this.model.participantName,
                    tpUid: this.model.tpUid,
                    trialParticipantNumber: this.model.trialParticipantNumber,
                    trialNumber: this.model.trialNumber,
                    trialUid: this.model.trialUid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }
                this.navigateToPageTag('econsent-trial-participant-devices', state);
            }
        });
    }


}
