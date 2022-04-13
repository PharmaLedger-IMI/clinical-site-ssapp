import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const DateTimeService = commonServices.DateTimeService;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class EconsentVersionsController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = {
            econsent: {},
            versions: [],
            ...this.getState()
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Versions History",
                tag: "econsent-versions"
            }
        );

        this.initServices();
        this.initHandlers();
    }

    initServices() {
        this.HCOService = new HCOService();
        this.HCOService.getOrCreateAsync().then((hcoDSU) => {
            this.model.hcoDSU = hcoDSU;
            this.getEconsentVersions();
            const dataSourceVersions = this.model.toObject('econsent.versions').map(version => {
                if (!version.actions) {
                    version.actions = [];
                }

                version.actions.forEach(( _, index) => {
                    version.actions[index] = {
                        ...version.actions[index],
                        version: version.version,
                        versionDate: new Date(version.versionDate).toLocaleDateString()
                    }
                })

                return version.actions;
            });
            this.model.dataSourceVersions = DataSourceFactory.createDataSource(1, 10, [].concat(...dataSourceVersions));
            this.model.dataSourceInitialized = true;
        });
    }

    initHandlers() {
        this.attachHandlerEconsentSign();
        this.attachHandlerBack();
        this.attachHandlerView();
    }

    getEconsentVersions() {

        const consent = this.model.hcoDSU.volatile.icfs.find(ifc => ifc.uid === this.model.econsentUid);
        this.model.econsent = consent;
        this.model.versions = consent.versions?.map(econsentVersion => {
            econsentVersion = {
                ...econsentVersion,
                tpApproval: "-",
                hcpApproval: "-",
                tpWithdraw: "-",
                versionDateAsString: DateTimeService.convertStringToLocaleDate(econsentVersion.versionDate)
            };
            econsentVersion.actions?.forEach((action) => {
                switch (action.name) {
                    case "sign": {
                        econsentVersion.tpApproval = action.toShowDate;
                        econsentVersion.hcpApproval = "Required";
                        break;
                    }
                    case "withdraw": {
                        econsentVersion.tpWithdraw = "TP Withdraw";
                        break;
                    }
                    case "withdraw-intention": {
                        econsentVersion.hcpApproval = "Contact TP";
                        econsentVersion.tpWithdraw = "Intention";
                        break;
                    }
                    case "Declined": {
                        econsentVersion.tsDeclined = "Declined";
                        break;
                    }
                }
            });
            if (econsentVersion.hcoSign) {
                econsentVersion.hcpApproval = consent.hcoSign.toShowDate;
            }
        });

        console.log(this.model.toObject());
    }

    attachHandlerEconsentSign() {
        this.onTagClick("econsent:sign", (model) => {
            this.navigateToPageTag("econsent-sign", {
                trialUid: this.model.trialUid,
                econsentUid: this.model.econsentUid,
                tpUid: this.model.tpUid,
                trialParticipantNumber: this.model.trialParticipantNumber,
                ecoVersion: model.version
            });
        });
    }

    attachHandlerBack() {
        this.onTagClick("back", () => {
            this.history.goBack();
        });
    }

    attachHandlerView() {
        this.onTagClick("consent:view", (model) => {
            this.navigateToPageTag("econsent-sign", {
                trialUid: this.model.trialUid,
                //de vazut
                econsentUid: model.econsentUid,
                ecoVersion: model.lastVersion,
                tpDid: this.model.tp.did,
                controlsShouldBeVisible: false,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }
}
