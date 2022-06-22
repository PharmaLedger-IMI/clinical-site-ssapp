const {WebcController} = WebCardinal.controllers;
const commonServices = require('common-services');
const momentService = commonServices.momentService;
const commons = {
    YMDDateTimeFormatPattern: 'YYYY-MM-DD',
    HourFormatPattern: "HH:mm"
}

let getInitModel = () => {
    return {
        procedureDate: {
            label: 'Procedure date',
            name: 'procedureDate',
            required: true,
            placeholder: 'Please set the date ',
            value: '',
        },

    };
};

export default class SetProcedureDateController extends WebcController {
    constructor(...props) {
        super(...props);
        this.setModel(getInitModel());
        this._initHandlers();

        if(props[0].confirmedDate) {
            let confirmedDate = (new Date(props[0].confirmedDate)).getTime();
            let formattedDate = this.getDateTime(confirmedDate);
            this.model.procedureDate.value = formattedDate.date + 'T' + formattedDate.time;
        }

    }

    getDateTime(timestamp) {
        return {
            date: momentService(timestamp).format(commons.YMDDateTimeFormatPattern),
            time: momentService(timestamp).format(commons.HourFormatPattern)
        };
    }

    _initHandlers() {
        this._attachHandlerSubmit();
    }

    _attachHandlerSubmit() {
        this.onTagEvent('tp:submit', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.send('confirmed', this.model.procedureDate.value);
        });
    }
}
