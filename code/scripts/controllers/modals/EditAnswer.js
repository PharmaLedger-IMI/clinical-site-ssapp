const commonServices = require("common-services");
const {WebcController} = WebCardinal.controllers;

let getInitModel = () => {
    return {
        answer: {
            label: 'Answer for the question',
            name: 'answer',
            required: true,
            placeholder: 'Please insert the answer',
            value: '',
        }
    };
};

export default class EditAnswer extends WebcController {
    constructor(...props) {
        super(...props);
        this.model = {
            ...getInitModel(),
            givenAnswer: props[0].givenAnswer
        };
        this._initHandlers();
        if (this.model.givenAnswer) {
            this.model.answer.value = this.model.givenAnswer;
        }
    }

    _initHandlers() {
        this._attachHandlerSubmit();
    }

    _attachHandlerSubmit() {
        this.onTagEvent('update:answer', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.send('confirmed', {updatedAnswer: this.model.answer.value});
        });
    }
}
