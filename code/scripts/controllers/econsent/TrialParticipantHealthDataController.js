const commonServices = require("common-services");
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const Constants = commonServices.Constants;
import DeviceAssignationService from "../../services/DeviceAssignationService.js";

const HealthDataService = commonServices.HealthDataService;
const DataSourceFactory = commonServices.getDataSourceFactory();

export default class TrialParticipantHealthDataController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.model = this.getState();
        this.model.dataLoaded = false;

        const healthDataService = new HealthDataService();
        const deviceAssignationService = new DeviceAssignationService();

        deviceAssignationService.getAssignedDevices((err, assignedDevices) => {
            const device = assignedDevices.find(assignedDevice => assignedDevice.deviceId === this.model.deviceId);
            console.log("************* Health Identifier *************")
            console.log(device.healthDataIdentifiers);
            if (!device.healthDataIdentifiers) {
                this.model.hasHealthData = false;
                this.model.dataLoaded = true;
                return;
            }

            healthDataService.getAllObservations((err, observationsDSUs) => {
                if (err) {
                    console.log(err);
                }

                let observations = [];
                console.log("************* All Observation *************")
                console.log(observationsDSUs);
                observationsDSUs.forEach(observationDSU => {
                    if (device.healthDataIdentifiers.includes(observationDSU.uid)) {
                        const patientObservations = observationDSU.observations
                            .filter(observation => observation.sk.includes(this.model.trialParticipantNumber));
                        observations = observations.concat(...patientObservations);
                    }
                });

                this.model.healthData = observations.map(observation => {
                    let fullDateTime1 = observation.effectiveDateTime;
                    let date = fullDateTime1.split("T");
                    let time = date[1].split(".");
                    return {
                        title: observation.code.text,
                        value: observation.valueQuantity.value,
                        unit: observation.valueQuantity.unit,
                        date: (new Date(date[0])).toLocaleDateString(Constants.DATE_UTILS.FORMATS.EN_UK),
                        time: time[0]
                    }
                });
                // console.log(this.model.healthData)
                this.model.PatientHealthDataSource = DataSourceFactory.createDataSource(4, 10, this.model.healthData);
                this.model.hasHealthData = this.model.healthData.length > 0;
                this.model.dataLoaded = true;
            });
        })

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Participant Device Data",
                tag: "econsent-trial-participant-health-data"
            }
        );

    }
}
