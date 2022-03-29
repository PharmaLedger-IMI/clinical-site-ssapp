const {WebcController} = WebCardinal.controllers;
import HCOService from "../../../services/HCOService.js"
import DeviceServices from "../../../services/DeviceServices.js";
const commonServices = require("common-services");
const  {getCommunicationServiceInstance} = commonServices.CommunicationService;
const COMMUNICATION_MESSAGES = {
    ADD_DEVICE:"add_device"
}


export default class AddDeviceController extends WebcController {
    constructor(element, history) {

        super(element, history);

        const prevState = this.getState() || {};
        const {breadcrumb, ...state} = prevState;
        this.model = prevState;        

        this.model.breadcrumb.push({
          label:"Add Device",
          tag:"iot-add-device",
          state: state
        });

        this.deviceServices = new DeviceServices();
        let hcoService = new HCOService();
        let hcoDSUPromise = hcoService.getOrCreateAsync();
        hcoDSUPromise.then(hcoDSU => {
            let allTrials = [];
           let listTrials = hcoDSU.volatile.trial;
            for(let trial in listTrials){
                let trialFormat={
                    label: "",
                    value: "",
                    ssi: ""
                };
                trialFormat.label = listTrials[trial].name + " - " + listTrials[trial].id;
                trialFormat.value = listTrials[trial].id;
                trialFormat.ssi  = listTrials[trial].uid;
                trialFormat.name = listTrials[trial].name;
                allTrials.push(trialFormat);
            }

            this.model = this.getFormViewModel(prevState, allTrials);
            this.model.trials = allTrials;

        });
        
        this.attachHandlerGoBackButton();
        this.attachHandlerSaveButton();

    }

    attachHandlerGoBackButton() {
        this.onTagClick('devices:go-back', () => {
            this.navigateToPageTag('iot-manage-devices',{breadcrumb: this.model.toObject('breadcrumb')});
        });
    }

    attachHandlerSaveButton() {
        this.onTagClick('devices:save', () => {

            const deviceData = this.prepareDeviceData(this.model.trials);
            this.deviceServices.saveDevice(deviceData, (err, data) => {
                if (err) {
                    console.error(err);
                }

                const communicationService = getCommunicationServiceInstance();
                communicationService.sendMessageToIotAdaptor({
                    operation:COMMUNICATION_MESSAGES.ADD_DEVICE,
                    sReadSSI:data.sReadSSI
                });

                this.navigateToPageTag('confirmation-page', {
                    confirmationMessage: "Device included!",
                    redirectPage: "iot-manage-devices",
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            });
        });
    }

    prepareDeviceData(trial_list) {

        let selected_trial = trial_list.find(t => t.value === this.model.trial.value);

        return {
            brand: this.model.brand.value,
            value: this.model.name.value,
            trialSSI: selected_trial.ssi,
            trialName: selected_trial.name,
            trialID: this.model.trial.value,
            modelNumber: this.model.model.value,
            status: this.model.status.value,
            manufacturer: this.model.manufacturer.value,
            deviceName: this.model.name.value,
            resourceType: "Device",
            identifier: [{
                use: "official",
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: "SNO"
                    }]
                },
                value: this.model.deviceId.value
            }],
            serialNumber: this.model.deviceId.value,
            sk: this.model.deviceId.value
        };
    }

    getFormViewModel(prevState, allTrials) {
        return {
            deviceId: {
                name: 'deviceid',
                id: 'deviceid',
                label: "Device ID",
                placeholder: 'QC1265389',
                required: true,
                value: prevState.serialNumber || ''
            },
            model: {
                name: 'model',
                id: 'model',
                label: "Device Model Number",
                placeholder: 'ELI 230',
                required: true,
                value: prevState.modelNumber || ""
            },
            manufacturer: {
                name: 'manufacturer',
                id: 'manufacturer',
                label: "Device Manufacturer",
                placeholder: 'Bionet',
                required: true,
                value: prevState.manufacturer || ""
            },
            name: {
                name: 'name',
                id: 'name',
                label: "Device Name",
                placeholder: 'BURDICK ELI 230 EKG MACHINE',
                required: true,
                value: prevState.deviceName || ""
            },
            brand: {
                name: 'brand',
                id: 'brand',
                label: "Device Brand",
                placeholder: 'Burdick',
                required: true,
                value: prevState.brand || ""
            },
            status: {
                label: "Device Status",
                required: true,
                options: [
                    {
                        label: "Active",
                        value: 'Active'
                    },
                    {
                        label: "Inactive",
                        value: 'Inactive'
                    },
                    {
                        label: "Entered in error",
                        value: 'Entered in error'
                    },
                    {
                        label: "Unknown",
                        value: 'Unknown'
                    }
                ],
                value: prevState.status || "Active"
            },
            trial: {
                label: "Clinical trial Number",
                required: true,
                options: allTrials,
                value: allTrials.length?allTrials[0].value:""
            },
            hasTrials:allTrials.length>0
        }
    }
}