import DeviceAssignationService from "../../services/DeviceAssignationService.js";
import DeviceServices from "../../services/DeviceServices.js";
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class TrialParticipantDevicesListController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Participant Devices List",
                tag: "econsent-trial-participant-devices-list"
            }
        );

        this.model.assigned_devices = []
        this.model.alldevices = []
        this.model.deviceListAvailable = false
        this.model.assignedDevicesIDsOnly = []

        this._attachHandlerGoBack(this.model);
        this._attachHandlerAssignDevice();
        this.findAssignedDevices(this.model);
    }

    getDeviceFullInfo(deviceID) {
        this.DeviceServices = new DeviceServices();
        this.DeviceServices.getDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            this.model.alldevices = devices;
            this.model.deviceInfo = (devices.find(element => element.sk === deviceID));
            this.model.assigned_devices.push(this.model.deviceInfo);
            this.model.hasAssignedDevices = true;
            this.model.assignedDevicesDataSource = DataSourceFactory.createDataSource(8, 10, this.model.assigned_devices);
        });
    }

    findAssignedDevices(prevState){
        this.DeviceAssignationService = new DeviceAssignationService();
        this.DeviceAssignationService.getAssignedDevices( (err, assignedDevices) => {
            if (err) {
                return console.error(err);
            }
            this.model.foundAssignedDevices = assignedDevices.filter(ad => ad.patientDID === prevState.participantDID);
            if (this.model.foundAssignedDevices.length>0) {
                this.model.deviceListAvailable = true;

                for(let ad in this.model.foundAssignedDevices){
                    this.getDeviceFullInfo(this.model.foundAssignedDevices[ad].deviceId);
                    this.model.assignedDevicesIDsOnly.push(this.model.foundAssignedDevices[ad].deviceId);
                }

            }
            else{
                this.model.deviceListAvailable = true;
                this.model.hasAssignedDevices = false;

                this.DeviceServices = new DeviceServices();
                this.DeviceServices.getDevice((err, devices) => {
                    if (err) {
                        return console.error(err);
                    }
                    this.model.alldevices = devices;
                });
            }
        } );
    }

    findAvailableDevicesToMatch(){
        this.model.all_registered_devices =  this.model.alldevices.filter(t => t.trialUid === this.model.trialUid);
        this.model.available_devices = this.model.all_registered_devices;
        this.model.assignedDevicesIDsOnly.forEach(id =>
            this.model.available_devices.splice(this.model.available_devices.findIndex(t => t.sk === id), 1)
        );
    }

    _attachHandlerGoBack(prevState) {
        this.onTagClick('back', () => {
            this.navigateToPageTag('econsent-trial-participants', {
                trialUid : prevState.trialUid ,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

    _attachHandlerAssignDevice() {
        this.onTagClick('assign-device', () => {

            this.findAvailableDevicesToMatch();
            if (this.model.available_devices.length === 0 ){
                console.log("There are not available devices to match!");
                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "There are no available devices to assign for this trial. Please register a new device for  this trial.",
                    redirectPage: 'home',
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            }
            else{
                let ids = []
                this.model.available_devices.forEach(element =>
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
