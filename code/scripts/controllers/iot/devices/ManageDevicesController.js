import DeviceServices from "../../../services/DeviceServices.js"
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();
const { getCommunicationServiceInstance } = commonServices.CommunicationService;
import { COMMUNICATION_MESSAGES } from "../../../utils/CommunicationMessages.js";


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
        this.attachHandlerGoBack();
        this.attachHandlerViewDevice();
        this.attachHandlerEditDevice();
        this.attachHandlerRemoveDevice();

        let search = {
            label: 'Search for a trial',
            required: false,
            placeholder: 'Trial name...',
            value: '',
        };

        this.model.search = search;

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

        let allDevices = this.model.toObject('allDevices');

        if (this.model.search.value.trim() !== '') {
            let filteredDevices = allDevices.filter(device => {

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

            this.model.devicesDataSource.updateDevices(JSON.parse(JSON.stringify(filteredDevices)));
            if (filteredDevices.length === 0) {
                this.model.noResults = true;
            }
            else {
                this.model.noResults = false;
            }
        }
        else {
            this.model.devicesDataSource.updateDevices(allDevices);
            this.model.noResults = false;
        }
    }


    init() {
        this.deviceServices.getDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            this.model.allDevices = devices;
            this.model.devicesDataSource = DataSourceFactory.createDataSource(7, 10, this.model.allDevices);
            this.model.devicesDataSource.__proto__.updateDevices = function (devices) {
                this.model.allDevices = devices;
                this.model.tableData = devices;
                this.getElement().dataSize = devices.length;
                this.forceUpdate(true);
            }
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
                return this.model.allDevices && this.model.allDevices.length > 0
            }
            ,
            'allDevices');
    }

    attachHandlerGoBack() {
        this.onTagClick('navigation:go-back', () => {
            console.log("Go Back button pressed");
            this.navigateToPageTag('home', { breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    attachHandlerViewDevice() {
        this.onTagClick('view', (model) => {
            console.log("Patient Status button pressed", model);
            this.navigateToPageTag('patient-status', { data: model, breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    attachHandlerEditDevice() {
        this.onTagClick('edit', (model) => {
            console.log("Edit Device button pressed", model);
            this.navigateToPageTag('iot-edit-device', { data: model, breadcrumb: this.model.toObject('breadcrumb') });
        });
    }

    attachHandlerRemoveDevice() {
        this.onTagClick('remove', (model) => {
            console.log("Remove Device button pressed", model);

            const modalConfig = {
                controller: "modals/ConfirmationAlertController",
                disableExpanding: false,
                disableBackdropClosing: true,
                question: "Are you sure you want to delete this device? ",
                title: "Delete device",
            };

            const deviceUid = model.uid;

            this.showModalFromTemplate(
                "confirmation-alert",
                (event) => {

                    if (event.type === 'confirmed') {

                        let message = {};

                        this.deviceServices.deleteDevice(deviceUid, (err, data) => {
                            if (err) {
                                message.content = "An error has been occurred!";
                                message.type = 'error';
                            } else {
                                message.content = `The device has been deleted!`;
                                message.type = 'success'
                            }

                            this.model.message = message;

                            const communicationService = getCommunicationServiceInstance();
                            communicationService.sendMessageToIotAdapter({
                                operation: COMMUNICATION_MESSAGES.REMOVE_DEVICE,
                                uid: deviceUid
                            });

                        });

                        this.deviceServices.getDevice((err, devices) => {
                            if (err) {
                                return console.error(err);
                            }
                            this.model.allDevices = devices;
                            this.model.devicesDataSource.updateDevices(devices);
                        });
                    }
                }, this.emptyCallback, modalConfig);

        });
    }

}