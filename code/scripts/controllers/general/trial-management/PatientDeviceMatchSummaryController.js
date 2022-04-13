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
            let message = {
                content: "Match Completed!",
                type: 'success',
            }
            let trialState = {
                message: message,
                breadcrumb: this.model.toObject('breadcrumb')
            }
            this.navigateToPageTag('trial-management', trialState);
        });
    }
}