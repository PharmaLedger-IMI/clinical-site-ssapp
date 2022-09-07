import DeviceAssignationService from "../../services/DeviceAssignationService.js";
import DeviceServices from "../../services/DeviceServices.js";
const commonServices = require("common-services");
const Constants = commonServices.Constants;
const CommunicationService = commonServices.CommunicationService;
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

        this.devices = [];
        this.assignedDevicesForChosenPatient = [];
        this.available_devices_for_assignation = [];

        this.getDevices((err, devicesList) => {
            if (err) {
                return console.error(err);
            }
            this.model.AssignedDevicesForChosenPatientDataSource = DataSourceFactory.createDataSource(6, 5, devicesList);
            this.model.hasAssignedDevices = devicesList.length > 0;
        });
        this._attachHandlers();
    }
    

    getDevices(callback) {
        this.DeviceServices = new DeviceServices();
        this.DeviceServices.getDevices((err, devices) => {
            if (err) {
                return callback(err);
            }
            this.devices = devices;
            this.getAssignedDevices(this.devices, callback);
        });
    }

    getAssignedDevices(devices, callback){
        this.DeviceAssignationService = new DeviceAssignationService();
        this.DeviceAssignationService.getAssignedDevices( (err, assignedDevices) => {
            if (err) {
                return callback(err);
            }

            this.assignedDevicesForChosenPatient = assignedDevices.filter(ad => ad.patientDID === this.model.participantDID);
            let tempAssignedDeviceList = this.assignedDevicesForChosenPatient;
            this.deviceList = [];
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

            callback(undefined,this.deviceList);

        } );
    }

    removeAssignation(deasignedDevice){
        window.WebCardinal.loader.hidden = false;
        let chosenDeviceIndex = this.devices.findIndex(device => device.sk === deasignedDevice.deviceId);
        this.devices[chosenDeviceIndex].isAssigned = false;
        this.DeviceServices.updateDevice(this.devices[chosenDeviceIndex], (err, data) => {
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

                let communicationService =CommunicationService.getCommunicationServiceInstance()
                const {uid, patientDID,...assignationData} = data;
                communicationService.sendMessage(patientDID,{
                    operation:  Constants.MESSAGES.HCO.DEVICE_DEASSIGNATION,
                    data:assignationData
                })

                this.getDevices((err, devices)=>{
                    this.model.AssignedDevicesForChosenPatientDataSource.updateTable(devices)
                    this.model.hasAssignedDevices = devices.length > 0;
                    this.model.message = message;
                    window.WebCardinal.loader.hidden = true;
                });
            });
        });
    }

    _attachHandlers() {
        this.onTagClick('assign-device', () => {
            this.available_devices_for_assignation =  this.devices.filter(device => device.isAssigned === false && device.status==="Active" && device.trialUid === this.model.trialUid);
            if (this.available_devices_for_assignation.length === 0 ){
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "There are no available devices to assign for this trial. Please register a new device for this trial or de-assign a current device from the devices menu.",
                    redirectPage: 'home',
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            }
            else{
                let ids = []
                this.available_devices_for_assignation.forEach(element =>
                    ids.push({
                        value: element.sk,
                        name: element.deviceName
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

        this.onTagClick("view-iot-data", (model) => {

            this.navigateToPageTag('econsent-trial-participant-health-data', {
                breadcrumb: this.model.toObject('breadcrumb'),
                deviceId: model.deviceId,
                trialParticipantNumber: this.model.trialParticipantNumber
            });
        });

    }


}
