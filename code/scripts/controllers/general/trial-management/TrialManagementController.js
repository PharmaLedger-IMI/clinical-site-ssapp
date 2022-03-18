const {WebcController} = WebCardinal.controllers;

export default class TrialManagementController extends WebcController {
    constructor(...props) {
        super(...props);

        const prevState = this.getState() || {};
        const {breadcrumb, ...state} = prevState;
        
        this.model = prevState;        
        this.model.breadcrumb.push({
            label:"Trial Management",
            tag:"trial-management",
            state: state
        });

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
            this.navigateToPageTag('patient-device-match',{breadcrumb: this.model.toObject('breadcrumb')});
        });
    }
}
