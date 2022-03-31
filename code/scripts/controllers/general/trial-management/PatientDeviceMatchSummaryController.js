const commonServices = require('common-services');
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class PatientDeviceMatchSummaryController extends BreadCrumbManager {
    constructor(element, history) {
        super(element, history);

        const prevState = this.getState() || {};
        this.model.patientDeviceData = prevState.patientDeviceData;

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Summary",
                tag: "patient-device-match-summary"
            }
        );

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