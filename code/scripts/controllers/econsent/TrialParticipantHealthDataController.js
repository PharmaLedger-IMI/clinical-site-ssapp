const {WebcController} = WebCardinal.controllers;



export default class TrialParticipantHealthDataController extends WebcController {
    constructor(...props) {
        super(...props);
        // this.initServices();
        const prevState = this.getState() || {};
        var data =  prevState;
        // console.log("Trial Participant Health Data Controller");
        // console.log(data);
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
        
        this._attachHandlerGoBack();
    }
    _attachHandlerGoBack() {
        this.onTagClick('navigation:go-back', () => {
            console.log("Go Back button pressed!")
            this.navigateToPageTag('home');
        });
    }

}
