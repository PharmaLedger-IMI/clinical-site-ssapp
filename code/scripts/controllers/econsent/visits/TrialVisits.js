const commonServices = require('common-services');
import HCOService from '../../../services/HCOService.js';

const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class TrialVisits extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getState();

        this.state = this.model.toObject();
        this.model.breadcrumb = this.setBreadCrumb({
            label: "Trial Visits",
            tag: "trial-visits"
        });

        this.initData();
    }

    async initData() {
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();

        const {trialId, trialUid, consentId, consentVersion} = this.model;
        const sites = this.model.toObject("hcoDSU.volatile.site");

        const site = await this.HCOService.findTrialSite(sites, trialUid);
        const selectedVisit = site.visits.visits.find(v => v.trialId === trialId && v.consentId === consentId && v.consentVersion === consentVersion);

        this.createVisitsViewModel(selectedVisit.visits || []);
    }

    createVisitsViewModel(visits) {
        let visitsHeaders = [];
        let visitsData = {};
        visits.forEach(visit => {
            let {id, day, name, visitWindow, week, procedures} = visit;
            visitsHeaders.push({id, day, name, visitWindow, week});

            procedures.forEach(procedure => {
                if (!visitsData[procedure.name]) {
                    visitsData[procedure.name] = {
                        name: procedure.name,
                        scheduleList: []
                    };
                }

                visitsData[procedure.name].scheduleList.push({checked: procedure.checked});
            });
        });

        this.model.visitsHeaders = visitsHeaders;
        this.model.visitsData = Object.keys(visitsData).map(key => {
            return {
                procedureName: key,
                scheduleList: visitsData[key].scheduleList
            }
        });

        this.model.hasVisitsAndProcedures = this.model.visitsData.length > 0;
    }
}
