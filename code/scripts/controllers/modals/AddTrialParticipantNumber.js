const {WebcController} = WebCardinal.controllers;

let getInitModel = () => {
    return {
        number: {
            label: 'Trial Subject Number',
            name: 'number',
            type: "number",
            min: "0",
            required: true,
            placeholder: 'Please insert the trial subject number...',
            value: '1000' + Math.ceil(Math.random() * 100000),
        },
        isAddTsNumberDisabled: false
    };
};

export default class AddTrialParticipantNumber extends WebcController {
    constructor(...props) {
        super(...props);
        this.existingTSNumbers = props[0].existingTSNumbers.map(number => number.toString());
        this.currentTSNumber = props[0].currentTSNumber;
        this.model = getInitModel();
        this.model.trialId = props[0].trialId;
        this.model.siteId = props[0].siteId;

        if(this.currentTSNumber){
            this.model.number.value = this.currentTSNumber.substring(this.currentTSNumber.lastIndexOf("-")+1);
        }
        this._initHandlers();
    }

    _initHandlers() {
        this._attachHandlerSubmit();
        this.model.onChange("number.value", this._changeNumberHandler.bind(this));
        this._changeNumberHandler();
    }

    _changeNumberHandler() {
        if (this.model.number.value.trim() === "" || this.model.number.value === "0") {
            return this.model.isAddTSNumberDisabled = true;
        }
        this.tsNumber = `${this.model.trialId}-${this.model.siteId}-${this.model.number.value}`;
        this.model.isAddTSNumberDisabled = this.existingTSNumbers.includes(this.tsNumber)
    }

    _attachHandlerSubmit() {
        this.onTagEvent('tp:submit', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.send('confirmed',this.tsNumber);
        });
    }
}
