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
        
        this.attachHandlerSaveButton();

    }

    attachHandlerSaveButton() {

        this.onTagClick('devices:save', () => {            
            window.WebCardinal.loader.hidden = false;
            let deviceId = this.model.deviceId.value;
            let deviceName = this.model.deviceName.value;
            let status = this.model.status.value;
            let manufacturer = this.model.manufacturer.value;
            let modelNumber = this.model.modelNumber.value;
            let brand = this.model.brand.value;
            if(deviceId.length === 0 || !deviceId.trim() || deviceName.length === 0 || !deviceName.trim() || status.length === 0 || !status.trim()|| manufacturer.length === 0 || !manufacturer.trim() || modelNumber.length === 0 || !modelNumber.trim()|| brand.length === 0 || !brand.trim()){
                let message = {
                    content: `All fields are mandatory!`,
                    type: 'error'
                }
                window.WebCardinal.loader.hidden = true;
                this.navigateToPageTag('iot-manage-devices', {
                    message: message,
                    breadcrumb: this.model.toObject('breadcrumb')
                });
                return console.log("Enter Title");
            }
            else {
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
                    communicationService.sendMessageToIotAdapter({
                        operation:COMMUNICATION_MESSAGES.ADD_DEVICE,
                        sReadSSI:data.sReadSSI
                    });

                    window.WebCardinal.loader.hidden = true;
                    this.navigateToPageTag('iot-manage-devices', {
                        message: message,
                        breadcrumb: this.model.toObject('breadcrumb')
                    });
                });
            }
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
            // deviceType: this.model.deviceType.value,
            manufacturer: this.model.manufacturer.value,
            deviceId: this.model.deviceId.value,
            device: [
                {
                    name:  this.model.deviceName.value,
                    type: "manufacturer-name"
                }
            ],
            deviceName: this.model.deviceName.value,
            modelNumber: this.model.modelNumber.value,
            brand: this.model.brand.value,
            trialUid: selected_trial.ssi,
            trialName: selected_trial.name,
            trialID: this.model.trial.value,
            sk: this.model.deviceId.value,
            isAssigned: false
        };
    }
}