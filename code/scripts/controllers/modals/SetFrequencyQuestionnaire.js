const commonServices = require("common-services");
const {WebcController} = WebCardinal.controllers;

let getInitModel = () => {
    return {
        startDate: {
            label: 'Start date',
            name: 'startDate',
            required: true,
            placeholder: 'Please set the start date ',
            value: '',
        },
        endDate: {
            label: 'End date',
            name: 'endDate',
            required: true,
            placeholder: 'Please set the end recruitment date ',
            value: '',
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
        }

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
        if (this.model.schedule) {
            this.model.startDate.value = this.model.schedule.startDate;
            this.model.endDate.value = this.model.schedule.endDate;
            this.model.frequencyType.value = this.model.schedule.repeatAppointment;
        }
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
