import DeviceServices from "../../../services/DeviceServices.js"
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class ManageDevicesController extends BreadCrumbManager {
    constructor(element, history) {
        super(element, history);

        // this.model = { allDevices: [] };
        this.deviceServices = new DeviceServices();

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Manage Devices",
                tag: "iot-manage-devices"
            }
        );

        this.attachHandlerAddDevice();
        this.attachModelHandlers();
        this.attachHandlerGoBack();
        this.attachHandlerViewDevice();
        this.attachHandlerEditDevice();

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
        let allDevices = this.model.toObject('allDevices');

        if (this.model.search.value.trim() !== '') {
            let filteredDevices = allDevices.filter(device => {
                let keys = Object.keys(device);
                for (let key of keys) {
                    if (device[key].toString().toUpperCase().search(this.model.search.value.toUpperCase()) !== -1) {
                        return true;
                    }
                }
                return false;
            });
            this.model.devicesDataSource.updateDevices(JSON.parse(JSON.stringify(filteredDevices)));
        }
        else {
            this.model.devicesDataSource.updateDevices(allDevices);
        }
    }


    init() {
        this.deviceServices.searchDevice((err, devices) => {
            if (err) {
                return console.error(err);
            }
            console.log(devices);
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
            () => this.model.allDevices && this.model.allDevices.length > 0,
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

}