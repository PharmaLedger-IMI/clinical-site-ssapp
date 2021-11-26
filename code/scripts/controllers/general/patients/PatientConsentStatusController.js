const {WebcController} = WebCardinal.controllers;

export default class PatientConsentStatusController extends WebcController {
    constructor(element, history) {

        super(element, history);

        this.attachHandlerGoBack();
    }

    attachHandlerGoBack() {
        this.onTagClick('navigation:go-back', () => {
            this.history.goBack();
        });
    }
}