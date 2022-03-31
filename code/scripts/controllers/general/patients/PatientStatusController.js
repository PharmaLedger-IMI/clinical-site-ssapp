const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class PatientStatusController extends BreadCrumbManager {
    constructor(element, history) {
        super(element, history);

        this.model.patientData = this.getTestData();
      
        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Patient Status",
                tag: "patient-status"
            }
        );

        this.attachHandlerGoBack();
        this.attachHandlerPatientAlertHistory();
        this.attachHandlerPatientDeviceHistory();
        this.attachHandlerPatientConsentStatus();
    }

    attachHandlerGoBack() {
        this.onTagClick('navigation:go-back', () => {
            console.log("Go Back button pressed");
            this.navigateToPageTag('home');
        });
    }

    attachHandlerPatientAlertHistory() {
        this.onTagClick('patient-alert-history', () => {
            console.log("Patient Alert History button pressed");
            this.navigateToPageTag('patient-alert-history');
        });
    }

    attachHandlerPatientDeviceHistory() {
        this.onTagClick('patient-device-history', () => {
            console.log("Patient Device History button pressed");
            this.navigateToPageTag('patient-device-history');
        });
    }

    attachHandlerPatientConsentStatus() {
        this.onTagClick('patient-consent-status', () => {
            console.log("Patient Consent Status button pressed");
            this.navigateToPageTag('patient-consent-status');
        });
    }

    // TODO: To be removed
    getTestData() {
        return [
            {
                name: "Height",
                value: 170,
                unit: "cm"
            },
            {
                name: "Weight",
                value: 92,
                unit: "kg"
            },
            {
                name: "Age",
                value: 63,
                unit: "a"
            },
            {
                name: "Systolic Blood Pressure",
                value: 102.7,
                unit: "mmHg"
            },
            {
                name: "Diastolic Blood Pressure",
                value: 72,
                unit: "mmHg"
            },
            {
                name: "SpO2",
                value: 95.4179104477612,
                unit: "%"
            }
        ]
    }

}