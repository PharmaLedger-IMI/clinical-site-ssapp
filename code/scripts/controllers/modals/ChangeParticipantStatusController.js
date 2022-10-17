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
      value: Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT,
      label: Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT,
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
    {
      value: Constants.TRIAL_PARTICIPANT_STATUS.UNAVAILABLE,
      label: Constants.TRIAL_PARTICIPANT_STATUS.UNAVAILABLE,
    },
    {
      value: Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAWN,
      label: Constants.TRIAL_PARTICIPANT_STATUS.WITHDRAWN,
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

    if (props[0].currentStatus) {
      let conditionalStatuses = [Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT, Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED];
      let currentStatus = props[0].currentStatus;
      this.statusOptions.forEach((status, i) => {
        if (conditionalStatuses.includes(status.value) || status.value === currentStatus) {
          this.statusOptions[i]['isDisabled'] = true;
        } else this.statusOptions[i]['isDisabled'] = false;
      })
      switch (currentStatus) {
        case Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED:
          let endOfTreatmentIndex = this.statusOptions.findIndex(status => status.value === Constants.TRIAL_PARTICIPANT_STATUS.END_OF_TREATMENT);
          this.statusOptions[endOfTreatmentIndex]['isDisabled'] = false;
          break;
        case Constants.TRIAL_PARTICIPANT_STATUS.IN_TREATMENT:
          let completedIndex = this.statusOptions.findIndex(status => status.value === Constants.TRIAL_PARTICIPANT_STATUS.COMPLETED);
          this.statusOptions[completedIndex]['isDisabled'] = false;
          break;
      }
    }

    let firstAvailableStatus = this.statusOptions.find(status => status.isDisabled === false);

    this.model = {
      statuses: {
        ...this.statusesTemplate,
        selectOptions: this.statusOptions,
        value: firstAvailableStatus !== undefined ? firstAvailableStatus.value : '',
      }
    };

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
