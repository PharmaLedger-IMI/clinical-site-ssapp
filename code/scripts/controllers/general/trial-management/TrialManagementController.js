const {WebcController} = WebCardinal.controllers;

export default class TrialManagementController extends WebcController {
    constructor(...props) {
        super(...props);

        this.attachHandlerGoBack();
        this.attachHandlerPatientDeviceMatch();
    }

    attachHandlerGoBack() {
        this.onTagClick('go-back', () => {
            this.navigateToPageTag('home');
        });
    }

    attachHandlerPatientDeviceMatch() {
        this.onTagClick('patient-device-match', () => {
            this.navigateToPageTag('patient-device-match');
        });
    }
}
