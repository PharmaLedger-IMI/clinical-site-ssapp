import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();


export default class TrialConsentsController extends BreadCrumbManager {

    constructor(...props) {
        super(...props);

        this.model = this.getState();
        const prevState = this.getState() || {};
        const { breadcrumb, ...state } = prevState;

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Consents",
                tag: "econsent-trial-consents"
            }
        );

        this.initServices();
        console.log('model ', this.model.toObject());

    }

    initServices() {
        this.HCOService = new HCOService();
        this.HCOService.getOrCreateAsync().then((hcoDSU) => {
            this.model.hcoDSU = hcoDSU;
            this.model.consents = this.model.hcoDSU.volatile.site[0].consents;
            console.log('consents', this.model.toObject('consents'));
            let consents = this.model.toObject('consents');
            console.log('hcoDSU ', this.model.toObject(hcoDSU));
            let dataSourceVersions = [];
            for( let consent of consents) {
                console.log('consent', consent);

                let x = consent.versions.map(version => {
                    console.log('version' ,version);
                    version.consentName = consent.trialConsentName;
                    version.consentType = consent.type;
                    version.versionDate = new Date(version.versionDate).toLocaleDateString()
                    return version;
                });
                console.log('x ',x);
                dataSourceVersions.push(...x);
            }
            console.log('datasource versions ', dataSourceVersions)

            this.model.dataSourceVersions = DataSourceFactory.createDataSource(1, 10, [].concat(...dataSourceVersions));
            this.model.dataSourceInitialized = true;
            console.log(this.model.toObject());

        });
    }

}
