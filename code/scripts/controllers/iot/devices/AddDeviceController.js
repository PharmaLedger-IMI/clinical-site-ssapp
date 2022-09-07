import HCOService from "../../../services/HCOService.js"
const commonServices = require("common-services");
const DeviceServices = commonServices.DeviceServices;
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const  {getCommunicationServiceInstance} = commonServices.CommunicationService;
const COMMUNICATION_MESSAGES = commonServices.Constants.MESSAGES;
import { modelSetter, prepareDeviceData } from "./deviceModel/deviceViewModel.js";


export default class AddDeviceController extends BreadCrumbManager {
    constructor(element, history) {

        super(element, history);

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


            this.deviceServices.getDevices((err, allDevices)=>{
               if(err){
                   throw err;
               }
                this.allDevicesIds = allDevices.map(device => device.deviceId);

                this.model = modelSetter(trialsState, false);
                this.model.trials = allTrials;

                this.model.onChange('form', this.checkFormValidity.bind(this));
            });

        });
        
        this.attachHandlerSaveButton();

    }

    checkFormValidity(){
        const requiredInputs = Object.keys(this.model.form).filter((key)=>this.model.form[key].required).map(key=>this.model.form[key].value)
        let validationConstraints = [
            this.allDevicesIds.indexOf(this.model.form.deviceId.value) === -1,
            ...requiredInputs.map(input => this.isInputFilled(input))
        ]
        this.model.formIsInvalid = typeof (validationConstraints.find(val => val !== true)) !== 'undefined';
    }

    isInputFilled(field){
        return typeof field !== 'undefined' && field.trim() !== ""
    }

    attachHandlerSaveButton() {

        this.onTagClick('devices:save', () => {            
            window.WebCardinal.loader.hidden = false;
                const deviceData = prepareDeviceData(this.model.trials, this.model.form);
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
                        operation:COMMUNICATION_MESSAGES.HCO.ADD_DEVICE,
                        sReadSSI:data.sReadSSI
                    });

                    window.WebCardinal.loader.hidden = true;
                    this.navigateToPageTag('iot-manage-devices', {
                        message: message,
                        breadcrumb: this.model.toObject('breadcrumb')
                    });
                });
        });
        
    }

}