const {WebcController} = WebCardinal.controllers;


export default class ConfirmationAlertController extends WebcController {
    constructor(...props) {
        super(...props);
        this._initHandlers();
        this.model = {
            title:'Confirmation',
            question:'Are you sure?'
        };

        this.model.question = props[0].question;
        this.model.title = props[0].title;
    }

    _initHandlers() {
        this._attachHandlerSubmit();
    }

    _attachHandlerSubmit() {
        this.onTagEvent('decline:submit', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.send('confirmed', true);
        });
    }
}
