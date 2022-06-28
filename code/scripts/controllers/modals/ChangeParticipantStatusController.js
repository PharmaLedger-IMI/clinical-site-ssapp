// eslint-disable-next-line no-undef
const { WebcController } = WebCardinal.controllers;
const commonServices = require("common-services");
const Constants = commonServices.Constants;

export default class ChangeParticipantStatusController extends WebcController {
  statusesTemplate = {
    label: 'Select consent',
    placeholder: 'Please select a status',
    required: true,
    selectOptions: [],
    disabled: false,
    invalidValue: false,
  };

  constructor(...props) {
    super(...props);

    this.setModel({
      statuses: {
        ...this.statusesTemplate,
        selectOptions: [
					{
						value: "End Of Treatment",
						label:"End Of Treatment"
					},
					{
						value: "Completed",
						label:"Completed"
					},
					{
						value: "Discontinued",
						label:"Discontinued"
					},
					{
						value: "Screen Failed",
						label:"Screen Failed"
					}
				]
      },
    });

    this.attachAll();
  }

  attachAll() {
    this.onTagClick('change-status', async () => {
      try {
        if (!this.model.statuses.value || this.model.statuses.value === '') {
          Object.assign(this.model.statuses, { invalidValue: true });
          setTimeout(() => {
            Object.assign(this.model.statuses, { invalidValue: null });
          }, 2000);
          return;
        }

				const outcome = this.model.statuses.value;
				window.WebCardinal.loader.hidden = true;
				this.send('confirmed', outcome);
      } catch (error) {
        window.WebCardinal.loader.hidden = true;
        this.send('closed', new Error('There was an issue creating the visits'));
        console.log(error);
      }
    });
  }
}
