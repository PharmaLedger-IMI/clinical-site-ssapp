const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const {WebcController} = WebCardinal.controllers;



export default class TrialParticipantHealthDataController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        // this.initServices();
        const prevState = this.getState() || {};
        this.model = this.getState() || {};
        var data =  prevState.pageValue;
        // console.log("Trial Participant Health Data Controller");
        // console.log(data);

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Participant Device Data",
                tag: "econsent-trial-participant-devices-list"
            }
        );

        this.model.healthData = [];
        let count = data.length-1;
        this.model.hasValue = data[count].hasValue;
        console.log("Trial Participant Health Data Has Value");
        console.log(data[count].hasValue)

        if(data){
            for(let i=0; i<count; i++){
                let data1 = data[i];
                console.log("Trial Participant Health Data Inside Loop");
                console.log(data1)
                let fullDateTime1 = data1.effectiveDateTime;
                let dateTime1 =  fullDateTime1.split("T");
                let time1 = dateTime1[1].split(".");
                this.model.healthData.push({
                    title: data1.code.text,
                    value: data1.valueQuantity.value,
                    unit: data1.valueQuantity.unit,
                    date: dateTime1[0],
                    time: time1[0]
                });
            }
            
            console.log(this.model.healthData);
        }
        
    }


}
