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
        this.setModel(getInitModel());
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
        this.model.isAddTSNumberDisabled = this.existingTSNumbers.includes(this.model.number.value.toString())
    }

    _attachHandlerSubmit() {
        this.onTagEvent('tp:submit', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.send('confirmed', this.model.number.value);
        });
    }
}
