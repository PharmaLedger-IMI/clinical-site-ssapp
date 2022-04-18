const commonServices = require('common-services');
import HCOService from '../../../services/HCOService.js';

const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class TrialVisits extends BreadCrumbManager {
    constructor(...props) {
        super(...props);

        this.model = this.getState();
        this.state = this.model.toObject();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Trial Visits",
                tag: "trial-visits"
            }
        );


        this.initData();
        this._attachHandlerBack();
        this._attachConsentChangeHandler();
    }

    async initData() {
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();

        const sites = this.model.toObject("hcoDSU.volatile.site");
        const site = sites.find(site => this.HCOService.getAnchorId(site.trialSReadSSI) === this.model.trialUid)


        this.model.consents = site.consents;
        if (this.model.consents.length > 0) {
            this.model.consents[0].selected = true;
            this.visits = site.visits.visits;
            this.changeVisitsForConsent();
        }
    }

    changeVisitsForConsent() {
        const consentId = this.model.consents.find(consent => consent.selected === true).trialConsentId
        let selectedVisits = this.visits.find(
            (x) => x.consentId === this.model.consents.find(consent => consent.trialConsentId === consentId).trialConsentId
        ) || {data: []};


        let visitsHeaders = [];
        let visitsData = {};
        selectedVisits.data.forEach(visit => {
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

            })
        })

        this.model.visitsHeaders = visitsHeaders;
        this.model.visitsData = Object.keys(visitsData).map(key => {
            return {
                procedureName: key,
                scheduleList: visitsData[key].scheduleList
            }
        });
        this.model.hasVisitsAndProcedures = this.model.visitsData.length > 0;


    }

    _attachConsentChangeHandler() {
        this.onTagClick('select-consent', async (model) => {
            this.model.consents.forEach((consent) => {
                consent.selected = model.trialConsentId === consent.trialConsentId
            });
            this.changeVisitsForConsent();
        });
    }

    _attachHandlerBack() {
        this.onTagEvent('back', 'click', () => {
            this.navigateToPageTag('econsent-trial-management', {
                breadcrumb: this.model.toObject('breadcrumb')
            });
        });
    }

}
