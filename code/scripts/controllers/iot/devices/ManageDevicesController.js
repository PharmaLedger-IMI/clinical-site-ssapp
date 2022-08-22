import DeviceServices from "../../../services/DeviceServices.js"
import {COMMUNICATION_MESSAGES} from "../../../utils/CommunicationMessages.js";
import DeviceAssignationService from "../../../services/DeviceAssignationService.js";

const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();
const { getCommunicationServiceInstance } = commonServices.CommunicationService;


export default class ManageDevicesController extends BreadCrumbManager {
    constructor(element, history) {
        super(element, history);

        this.deviceServices = new DeviceServices();

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Manage Devices",
                tag: "iot-manage-devices"
            }
        );

        this.model.noResults = false;

        this.attachHandlerAddDevice();
        this.attachModelHandlers();
        this.attachHandlerEditDevice();
        this.attachHandlerArchiveDevice();

        this.model.search = {
            label: 'Search for a trial',
            required: false,
            placeholder: 'Trial name...',
            value: '',
        };

        this.init();
        this.observeSearchInput();
    }

    observeSearchInput() {
        this.model.onChange('search.value', () => {
            this.filterData();
        });
    }

    filterData() {
        let searchKeys = ['deviceId', 'modelNumber', 'manufacturer', 'deviceName', 'brand', 'status', 'trial']

        let devices = this.model.toObject('mappedDevices');

        if (this.model.search.value.trim() !== '') {
            let filteredDevices = devices.filter(device => {

                let keys = Object.keys(device);
                for (let key of keys) {
                    for (let searchKey of searchKeys) {
                        if (device[key].toString().toUpperCase().search(this.model.search.value.toUpperCase()) !== -1 && searchKey === key) {
                            return true;
                        }
                    }
                }

                return false;
            });

            this.model.devicesDataSource.updateTable(JSON.parse(JSON.stringify(filteredDevices)));
            if (filteredDevices.length === 0) {
                this.model.noResults = true;
            }
            else {
                this.model.noResults = false;
            }
        }
        else {
            this.model.devicesDataSource.updateTable(devices);
            this.model.noResults = false;
        }
    }


    init() {

        this.deviceServices.getDevices((err, devices) => {
            if (err) {
                return console.error(err);
            }
            let allDevices = devices.filter(device => device.archived !== true);
            this.model.allAssignedDevices = devices.filter(dv => dv.isAssigned === true);
            this.getAssignedDevices(allDevices);
        });

    }

    getAssignedDevices(allDevices){
        this.DeviceAssignationService = new DeviceAssignationService();
        this.DeviceAssignationService.getAssignedDevices( (err, usedDevices) => {
            if (err) {
                return console.error(err);
            }
            this.model.mappedDevices =  allDevices.map(device => {
                if(device.isAssigned === true) {
                    let assignedDevice = usedDevices.find(item => item.deviceId === device.deviceId);
                    device.tpNumber = assignedDevice.trialParticipantNumber;
                }
                return device;
            });

            this.model.devicesDataSource = DataSourceFactory.createDataSource(7, 5, this.model.toObject('mappedDevices'));
        });
    }


    attachHandlerAddDevice() {
        this.onTagClick('devices:add', () => {
            this.navigateToPageTag('iot-add-device', { breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    attachModelHandlers() {
        this.model.addExpression(
            'deviceListNotEmpty',
            () => {
                return this.model.mappedDevices && this.model.mappedDevices.length > 0
            }
            ,
            'mappedDevices');
    }

    attachHandlerEditDevice() {
        this.onTagClick('edit', (model) => {
            this.navigateToPageTag('iot-edit-device', { data: model, breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    attachHandlerArchiveDevice() {
        this.onTagClick('archive', (model) => {

            const modalConfig = {
                controller: "modals/ConfirmationAlertController",
                disableExpanding: false,
                disableBackdropClosing: true,
                question: "Are you sure you want to archive this device? ",
                title: "Archive device",
            };

            const deviceUid = model.uid;
            let checkDeviceAssigned = this.model.allAssignedDevices.find(d => d.uid===deviceUid);
            if (checkDeviceAssigned) {
                this.model.message = {
                    content: 'This device cannot be archived. It is assigned to a trial participant. Please remove the assignation first to be able to archive the device.',
                    type: 'error'
                }
                return;
            }

            this.showModalFromTemplate(
                "confirmation-alert",
                (event) => {

                    if (event.type === 'confirmed') {
                        window.WebCardinal.loader.hidden = false;

                        let message = {};



                        this.deviceServices.getDevice(deviceUid, (err, device) => {
                            if (err) {
                                message.content = "An error has been occurred!";
                                message.type = 'error';
                            } else {
                                message.content = `The device has been archived!`;
                                message.type = 'success'
                            }
                            device.archived = true;
                            device.status = "Inactive";

                            this.model.message = message;

                            const communicationService = getCommunicationServiceInstance();
                            communicationService.sendMessageToIotAdapter({
                                operation: COMMUNICATION_MESSAGES.REMOVE_DEVICE,
                                uid: deviceUid
                            });

                            this.deviceServices.updateDevice(device, () => {
                                let removedDeviceIdx = this.model.mappedDevices.findIndex(device => device.uid === deviceUid);

                                this.model.mappedDevices.splice(removedDeviceIdx, 1);
                                this.model.devicesDataSource.updateTable(this.model.mappedDevices);
                                window.WebCardinal.loader.hidden = true;
                            })

                        });

                    }
                }, this.emptyCallback, modalConfig);

        });
    }

}