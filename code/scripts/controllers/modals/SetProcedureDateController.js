const {WebcController} = WebCardinal.controllers;
const commonServices = require('common-services');
const momentService = commonServices.momentService;
const Constants = commonServices.Constants;

let getInitModel = () => {
    return {
        procedureDate: {
            label: 'Procedure date',
            name: 'procedureDate',
            required: true,
            placeholder: 'Please set the date ',
            value: '',
            min:'',
            max:''
        },
        datesInformation : '',
        haveSuggestedInterval: false,
        isBtnDisabled: false,
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

        if(props[0].suggestedInterval) {
            document.getElementById("procedure-date").classList.add("is-invalid");
            this.model.haveSuggestedInterval = true;
            let suggestedInterval = props[0].suggestedInterval;

            let firstIntervalDate = (new Date(suggestedInterval[0])).getTime();
            let secondIntervalDate = (new Date(suggestedInterval[1])).getTime();
            let firstDateFormatted = this.getDateTime(firstIntervalDate);
            let secondDateFormatted = this.getDateTime(secondIntervalDate);
            this.model.procedureDate.min = firstDateFormatted.date + 'T' + firstDateFormatted.time;
            this.model.procedureDate.max = secondDateFormatted.date + 'T' + secondDateFormatted.time;

            let from = momentService(props[0].suggestedInterval[0]).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
            let to = momentService(props[0].suggestedInterval[1]).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
            this.model.datesInformation = `Choose a date from: ${from} to ${to}`;
            if(!this.model.procedureDate.value) {
                this.model.isBtnDisabled = true;
            }
            this.model.onChange('procedureDate.value', () => {
                let selectedDate = new Date(this.model.procedureDate.value);
                if(selectedDate.getTime() < suggestedInterval[0] || selectedDate.getTime() > suggestedInterval[1]) {
                    this.model.isBtnDisabled = true;

                } else {
                    this.model.isBtnDisabled = false;
                    document.getElementById("procedure-date").classList.remove("is-invalid");
                }
            })
        }
    }

    getDateTime(timestamp) {
        return {
            date: momentService(timestamp).format(Constants.DATE_UTILS.FORMATS.YMDDateTimeFormatPattern),
            time: momentService(timestamp).format(Constants.DATE_UTILS.FORMATS.HourFormatPattern)
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
