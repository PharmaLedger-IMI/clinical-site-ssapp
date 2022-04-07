import HCOService from "../../../services/HCOService.js"
import DeviceServices from "../../../services/DeviceServices.js";
const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const  {getCommunicationServiceInstance} = commonServices.CommunicationService;
import { COMMUNICATION_MESSAGES } from "../../../utils/CommunicationMessages.js";
import { modelSetter } from "./deviceModel/deviceViewModel.js";


export default class AddDeviceController extends BreadCrumbManager {
    constructor(element, history) {

        super(element, history);

        const prevState = this.getState() || {};
        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Add Device",
                tag: "iot-add-device"
            }
        );


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


            let trialsState = { 
                trials : allTrials
            }

            this.model = modelSetter(trialsState, false);
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
                let message = {};

                if (err) {
                    message.content = "An error has been occurred!";
                    message.type = 'error';
                } else {
                    message.content = `The device has been added!`;
                    message.type = 'success'
                }

                const communicationService = getCommunicationServiceInstance();
                communicationService.sendMessageToIotAdaptor({
                    operation:COMMUNICATION_MESSAGES.ADD_DEVICE,
                    sReadSSI:data.sReadSSI
                });

                this.navigateToPageTag('iot-manage-devices', {
                    message: message,
                    breadcrumb: this.model.toObject('breadcrumb')
                });
            });
        });
    }

    prepareDeviceData(trial_list) {

        let selected_trial = trial_list.find(t => t.value === this.model.trial.value);

        return {
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
            status: this.model.status.value,
            manufacturer: this.model.manufacturer.value,
            deviceId: this.model.deviceId.value,
            device: [
                {
                    name:  this.model.deviceName.value,
                    type: "manufacturer-name"
                }
            ],
            deviceName: this.model.modelNumber.value,
            modelNumber: this.model.modelNumber.value,
            brand: this.model.brand.value,
            deviceName: this.model.deviceName.value,
            trialSSI: selected_trial.ssi,
            trialName: selected_trial.name,
            trialID: this.model.trial.value,
            sk: this.model.deviceId.value
        };
    }
}