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
        this.model.hasAssignedDevices = false;
        this.model.available_devices_for_assignation = [];

        console.log(this.model);

        this.getDevices();
        this.getAssignedDevices();

        this._attachHandlerGoBack();
        this._attachHandlerAssignDevice();
    }

    getDevices() {
        this.DeviceServices = new DeviceServices();
        this.DeviceServices.getDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            this.model.devices = devices;

            console.log("all devices are: ");
            console.log(this.model.devices);

            this.model.devices_this_trial =  this.model.devices.filter(t => t.trialUid === this.model.trialUid);
            console.log("all devices for this trial are: " );
            console.log(this.model.devices_this_trial);
        });
    }

    getAssignedDevices(){
        this.DeviceAssignationService = new DeviceAssignationService();
        this.DeviceAssignationService.getAssignedDevices( (err, assignedDevices) => {
            if (err) {
                return console.error(err);
            }

            this.model.assignedDevices = assignedDevices;
            this.model.AssignedDevicesForChosenPatient = assignedDevices.filter(ad => ad.patientDID === this.model.participantDID);
            this.model.AssignedDevicesForChosenPatientDataSource = DataSourceFactory.createDataSource(8, 10, this.model.AssignedDevicesForChosenPatient);

            if (this.model.AssignedDevicesForChosenPatient.length>0){
                this.model.hasAssignedDevices = true;
            }

            console.log("assigned devices: ");
            console.log(this.model.assignedDevices);

            console.log("assigned devices for chosen patient: ");
            console.log(this.model.AssignedDevicesForChosenPatient);

        } );
    }

    getAvailableDevicesToAssign(){
        this.model.available_devices_for_assignation =  this.model.devices_this_trial.filter(device => device.isAssigned === false);
    }

    _attachHandlerGoBack() {
        this.onTagClick('back', () => {
            this.navigateToPageTag('econsent-trial-participants', {
                trialUid : this.model.trialUid ,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerAssignDevice() {
        this.onTagClick('assign-device', () => {
            console.log("assign device action")
            this.getAvailableDevicesToAssign();
            console.log(this.model.available_devices_for_assignation);
            if (this.model.available_devices_for_assignation.length === 0 ){
                console.log("There are not available devices to match!");
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
                    tpUid: this.model.tpUid ,
                    trialNumber: this.model.trialNumber,
                    trialUid: this.model.trialUid,
                    breadcrumb: this.model.toObject('breadcrumb')
                }
                this.navigateToPageTag('econsent-trial-participant-devices', state);
            }
        });
    }


}
