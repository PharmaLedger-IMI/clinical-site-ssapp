const {WebcController} = WebCardinal.controllers;

export default class PatientDeviceMatchSummaryController extends WebcController {
    constructor(element, history) {
        super(element, history);

        this.model = this.getState();
        const prevState = this.getState() || {};
        const {breadcrumb, ...state} = prevState;
        this.model.patientDeviceData = prevState.patientDeviceData;

        this.model.breadcrumb.push({
            label:"Summary",
            tag:"patient-device-match-summary",
            state: state
        });

        this.attachHandlerEditButton();
        this.attachHandlerAcceptButton();
    }

    attachHandlerEditButton() {
        this.onTagClick('summary:edit', () => {
            console.log("Edit button pressed");
            this.navigateToPageTag('patient-device-match', this.model.toObject());
        });
    }

    attachHandlerAcceptButton() {
        this.onTagClick('summary:accept', () => {
            let trialState = { 
                confirmationMessage: "Match Completed!",
                redirectPage: "trial-management",
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('confirmation-page', trialState);
        });
    }
}