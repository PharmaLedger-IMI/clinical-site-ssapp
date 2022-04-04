import TrialService from "../../services/TrialService.js";

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
            ...this.getState(),
        };

        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "History/Versions",
                tag: "econsent-versions"
            }
        );

        this.initServices();
        this.initHandlers();
        // this.initTrialAndConsent();
    
        const mockData = [{
            version: '1',
            versionDateAsString: '12/03/2022',
            tsDeclined: true,
            tpApproval: 'something about approval',
            hcpApproval: 'approval',
            tpWithdraw: 'withdraw'
        },
        {
            version: '2',
            versionDateAsString: '17/03/2022',
            tsDeclined: false,
            tpApproval: 'y about approval',
            hcpApproval: 'denied',
            tpWithdraw: 'withdrew'
        },
        {
            version: '3',
            versionDateAsString: '30/01/2022',
            tsDeclined: true,
            tpApproval: 'x about approval',
            hcpApproval: 'denied',
            tpWithdraw: 'withdrew'
        }]

        this.model.econsentVersionsDataSource = DataSourceFactory.createDataSource(5, 10, mockData);
    }

    initServices() {
        this.TrialService = new TrialService();
    }

    initHandlers() {
        this.attachHandlerEconsentSign();
        this.attachHandlerBack();
        this.attachHandlerView();
    }

    initTrialAndConsent() {
        this.TrialService.getTrial(this.model.trialSSI, (err, trial) => {
            if (err) {
                return console.log(err);
            }
            this.model.trial = trial;
        });
        this.TrialService.getEconsent(this.model.trialSSI, this.model.econsentUid, (err, data) => {
            if (err) {
                return console.log(err);
            }
            this.model.econsent = data;
            this.model.versions = data.versions?.map(econsentVersion => {
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
                    econsentVersion.hcpApproval = data.hcoSign.toShowDate;
                }
            });
        });
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
                econsentUid: model.econsentUid,
                ecoVersion: model.lastVersion,
                tpDid: this.model.tp.did,
                controlsShouldBeVisible: false,
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }
}
