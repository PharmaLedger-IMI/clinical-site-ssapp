import HCOService from "../../services/HCOService.js";

const commonServices = require("common-services");
const DateTimeService = commonServices.DateTimeService;
const DataSourceFactory = commonServices.getDataSourceFactory();
const BreadCrumbManager = commonServices.getBreadCrumbManager();
const Constants = commonServices.Constants;

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
            const dataSourceVersions = this.model.toObject('versions').map(version => {
                if (!version.actions) {
                    version.actions = [];
                }

                version.actions.forEach((_, index) => {
                    version.actions[index] = {
                        ...version.actions[index],
                        version: version.version,
                        versionDate: (new Date(version.versionDate)).toLocaleDateString(Constants.DATE_UTILS.FORMATS.EN_UK)
                    }
                })

                return version.actions;
            });
            this.model.dataSourceVersions = DataSourceFactory.createDataSource(1, 10, [].concat(...dataSourceVersions));
            this.model.dataSourceInitialized = true;
        });
    }

    initHandlers() {
        this.attachHandlerBack();
        this._attachHandlerPreview();
    }

    getEconsentVersions() {
        this.consent = this.model.hcoDSU.volatile.ifcs.find(ifc => ifc.uid === this.model.econsentUid && ifc.tpUid === this.model.tpPk);
        this.model.versions = this.consent.versions;
        if (this.model.versions.length > 0) {

            this.model.versions = this.model.versions.map(econsentVersion => {
                econsentVersion = {
                    ...econsentVersion,
                    tpApproval: "-",
                    hcpApproval: "-",
                    tpWithdraw: "-",
                    versionDateAsString: (new Date(econsentVersion.versionDate)).toLocaleDateString(Constants.DATE_UTILS.FORMATS.EN_UK)
                };
                if (econsentVersion.actions) {

                    econsentVersion.actions.forEach((action) => {
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
                            case "Declined": {
                                econsentVersion.tsDeclined = "Declined";
                                break;
                            }
                        }
                    });
                }
                if (econsentVersion.hcoSign) {
                    econsentVersion.hcpApproval = consent.hcoSign.toShowDate;
                }

                return econsentVersion;
            });
        }
    }

    attachHandlerBack() {
        this.onTagClick("back", () => {
            this.history.goBack();
        });
    }

    _attachHandlerPreview() {
        this.onTagEvent('preview-consent', 'click', (model) => {
            this.navigateToPageTag('ifc-preview', {
                breadcrumb: this.model.toObject('breadcrumb'),
                version: model.version,
                tpDid: this.model.tpDid,
                consentUid: this.consent.uid
            });
        });
    }

}
