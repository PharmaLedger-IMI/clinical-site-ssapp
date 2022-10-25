const {WebcController} = WebCardinal.controllers;
const commonServices = require('common-services');
const momentService = commonServices.momentService;
const Constants = commonServices.Constants;

let getInitModel = () => {
    return {
        visitDate: {
            label: 'Visit date',
            name: 'visitDate',
            required: true,
            placeholder: 'Please set the date ',
            value: '',
            min: '',
            max:''
        },
        datesInformation : '',
        haveSuggestedInterval: false,
        isBtnDisabled: false,
        isExtended: false
    };
};

export default class SetVisitDateController extends WebcController {
    constructor(...props) {
        super(...props);
        this.model = {
            ...getInitModel()
        };
        this._initHandlers();

        let now = (new Date()).getTime();
        let formattedNow = this.getDateTime(now);
        this.model.visitDate.min = formattedNow.date + 'T' + formattedNow.time;
        this.model.onChange('visitDate.value', () => {
            let selectedDate = new Date(this.model.visitDate.value);
            if(selectedDate.getTime() < now) {
                this.model.isBtnDisabled = true;
                this.getVisitDateElement().classList.add("is-invalid");
                let from = momentService(now).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                this.model.haveSuggestedInterval = true;
                this.model.datesInformation = `Choose a date from: ${from}`;
            } else {
                this.model.isBtnDisabled = false;
                this.getVisitDateElement().classList.remove("is-invalid");
            }
        })

        if(props[0].confirmedDate) {
            let confirmedDate = (new Date(props[0].confirmedDate)).getTime();
            let formattedDate = this.getDateTime(confirmedDate);
            this.model.visitDate.value = formattedDate.date + 'T' + formattedDate.time;
        }

        const verifyInterval = () => {
            if(props[0].suggestedInterval) {
                this.getVisitDateElement().classList.add("is-invalid");
                this.model.haveSuggestedInterval = true;
                let suggestedInterval = props[0].suggestedInterval;

                let firstIntervalDate = (new Date(suggestedInterval[0])).getTime();
                let secondIntervalDate = (new Date(suggestedInterval[1])).getTime();
                let firstDateFormatted = this.getDateTime(firstIntervalDate);
                let secondDateFormatted = this.getDateTime(secondIntervalDate);
                this.model.visitDate.min = firstDateFormatted.date + 'T' + firstDateFormatted.time;
                this.model.visitDate.max = secondDateFormatted.date + 'T' + secondDateFormatted.time;

                let from = momentService(props[0].suggestedInterval[0]).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                let to = momentService(props[0].suggestedInterval[1]).format(Constants.DATE_UTILS.FORMATS.DateTimeFormatPattern);
                this.model.datesInformation = `Choose a date from: ${from} to ${to}`;
                if(!this.model.visitDate.value) {
                    this.model.isBtnDisabled = true;
                }
                
                const checkIfDateIsInterval = () => {
                    let selectedDate = new Date(this.model.visitDate.value);
                    if(selectedDate.getTime() < suggestedInterval[0] || selectedDate.getTime() > suggestedInterval[1]) {
                        this.model.isBtnDisabled = true;

                    } else {
                        this.model.isBtnDisabled = false;
                        this.getVisitDateElement().classList.remove("is-invalid");
                    }
                }

                this.model.onChange('visitDate.value', () => {
                    checkIfDateIsInterval();
                })

            }
        }

        if(props[0].isExtended) {
            this.model.isExtended = props[0].isExtended;
        } else {
            verifyInterval();
        }

        this.model.onChange('isExtended', () => {
            if(this.model.isExtended === false) {
                verifyInterval();
            } else {
                this.model.visitDate.min = formattedNow.date + 'T' + formattedNow.time;
                this.model.visitDate.max = '';
                this.getVisitDateElement().classList.remove("is-invalid");
                this.model.onChange('visitDate.value' ,() => {
                    let selectedDate = new Date(this.model.visitDate.value);
                    let minDate = (new Date(this.model.visitDate.min)).getTime();
                    if(selectedDate.getTime() < minDate) {
                        this.getVisitDateElement().classList.add("is-invalid");
                        this.model.isBtnDisabled = true;
                    } else {
                        this.model.isBtnDisabled = false;
                        this.getVisitDateElement().classList.remove("is-invalid");
                    }
                })
            }
        })
    }

    getVisitDateElement() {
        return this.querySelector('#visit-date');
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
            this.send('confirmed', {
                visitDate: this.model.visitDate.value,
                isExtended: this.model.isExtended
            });
        });
    }
}
