// eslint-disable-next-line no-undef
const { WebcController } = WebCardinal.controllers;
const commonServices = require('common-services');
const Constants = commonServices.Constants;

export default class ChangeParticipantStatusController extends WebcController {
  statusOptions = [
    {
      value: Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT,
      label: Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT,
    },
    {
      value: Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED,
      label: Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED,
    },
    {
      value: Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED,
      label: Constants.TRIAL_PARTICIPANT_STATUS.DISCONTINUED,
    },
    {
      value: Constants.TRIAL_PARTICIPANT_STATUS.SCREEN_FAILED,
      label: Constants.TRIAL_PARTICIPANT_STATUS.SCREEN_FAILED,
    },
  ];

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
        selectOptions: this.statusOptions,
        value: this.statusOptions[0].value,
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
