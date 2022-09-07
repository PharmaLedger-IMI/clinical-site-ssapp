const commonServices = require("common-services");
const {WebcController} = WebCardinal.controllers;
const momentService = commonServices.momentService;
const Constants = commonServices.Constants;

let getInitModel = () => {
    return {
        startDate: {
            label: 'Start date',
            name: 'startDate',
            required: true,
            placeholder: 'Please set the start date ',
            value: '',
            min: momentService((new Date()).getTime()).format(Constants.DATE_UTILS.FORMATS.YearMonthDayPattern),
        },
        endDate: {
            label: 'End date',
            name: 'endDate',
            required: true,
            placeholder: 'Please set the end recruitment date ',
            value: '',
            min: momentService((new Date()).getTime()).format(Constants.DATE_UTILS.FORMATS.YearMonthDayPattern),
        },
        frequencyType: {
            label: "Frequency:",
            required: true,
            options: [{
                label: "Daily",
                value: 'daily'
            },
                {
                    label: "Weekly",
                    value: 'weekly'
                },
                {
                    label: "Monthly",
                    value: 'monthly'
                },
                {
                    label: "Yearly",
                    value: 'yearly'
                },
            ],
            value: 'daily'
        },
        formIsInvalid:true,

    };
};

export default class SetFrequencyQuestionnaire extends WebcController {
    constructor(...props) {
        super(...props);
        this.model = {
            ...getInitModel(),
            schedule: props[0].schedule
        };

        this._initHandlers();
        Object.keys(this.model.schedule).forEach(key => {
            if(this.model.schedule[key]) {
                this.model[key].value = this.model.schedule[key];
            }
        })

        const validateForm = () => {
            let startDateValue = new Date(this.model.startDate.value).getTime();
            let endDateValue = new Date(this.model.endDate.value).getTime();
            this.model.endDate.min = momentService(startDateValue).format(Constants.DATE_UTILS.FORMATS.YearMonthDayPattern);
            if (startDateValue > endDateValue) {
                this.model.endDate.value = momentService(startDateValue).format(Constants.DATE_UTILS.FORMATS.YearMonthDayPattern);
            }
            this.model.formIsInvalid = isNaN(endDateValue) || isNaN(startDateValue);
        }

        this.model.onChange('startDate.value', validateForm);
        this.model.onChange('endDate.value', validateForm);
        this.model.onChange('frequencyType.value', validateForm);
    }

    _initHandlers() {
        this._attachHandlerSubmit();
    }

    _attachHandlerSubmit() {
        this.onTagEvent('set:frequency', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.send('confirmed', {startDate: this.model.startDate.value, endDate: this.model.endDate.value, frequencyType: this.model.frequencyType});
        });
    }
}
