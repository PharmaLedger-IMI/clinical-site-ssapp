const commonServices = require('common-services');
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class TrialManagementController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Management",
                tag: "trial-management"
            }
        );


        this.attachHandlerGoBack();
        this.attachHandlerPatientDeviceMatch();
    }

    attachHandlerGoBack() {
        this.onTagClick('navigation:go-back', () => {
            this.navigateToPageTag('home');
        });
    }

    attachHandlerPatientDeviceMatch() {
        this.onTagClick('patient-device-match', () => {
            this.navigateToPageTag('patient-device-match', { breadcrumb: this.model.toObject('breadcrumb') });
        });
    }
}
