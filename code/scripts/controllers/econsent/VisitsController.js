import TrialService from "../../services/TrialService.js";

const commonServices = require("common-services");
const CommunicationService = commonServices.CommunicationService;
const BaseRepository = commonServices.BaseRepository;
const BreadCrumbManager = commonServices.getBreadCrumbManager();

let getInitModel = () => {
    return {
        schedule: [],
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
};

export default class VisitsController extends BreadCrumbManager {
    constructor(...props) {
        super(...props);
        this.setModel({
            ...getInitModel(),
            ...this.history.win.history.state.state,
        });

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Visits",
                tag: "econsent-visits"
            }
        );

        this._initServices();
        this._initHandlers();
        this._initVisits();
    }

    _initHandlers() {
        this._attachHandlerBack();
    }

    _initServices() {
        this.TrialService = new TrialService();
        this.TrialParticipantRepository = BaseRepository.getInstance(BaseRepository.identities.HCO.TRIAL_PARTICIPANTS);
        this.CommunicationService = CommunicationService.getCommunicationServiceInstance();
    }

    async _initVisits() {
        let visitsMappedByDate = {};

        let tps = await this.TrialParticipantRepository.findAllAsync();
        tps.forEach(tp => {
            let acceptedVisits = tp.visits?.filter(v => v.accepted) || [];
            acceptedVisits.forEach(av => {
                let dt = new Date(av.date);
                if (visitsMappedByDate[dt.toLocaleDateString()] === undefined) {
                    visitsMappedByDate[dt.toLocaleDateString()] = [];
                }
                let visit = {
                    pk: av.pk,
                    id: av.id,
                    uid: av.uid,
                    trialSSI: av.trialSSI,
                    consentSSI: av.consentSSI,
                    name: av.name,
                    date: av.date,
                    time: dt.toLocaleTimeString(),
                    toShowDate: av.toShowDate,
                    period: av.period,
                    unit: av.unit,
                    tp: {
                        pk: tp.pk,
                        name: tp.name,
                    }
                };
                visitsMappedByDate[dt.toLocaleDateString()].push(visit);
                // visitsMappedByDate[dt.toLocaleDateString()].push(visit);
                // visitsMappedByDate[dt.toLocaleDateString()].push(visit);
            })
        });

        let keys = Object.keys(visitsMappedByDate);
        keys.sort((a, b) => {
            return (new Date(a)) - (new Date(b));
        });
        let visitsSortedByDate = [];
        keys.forEach(k => {
            let thatDayVisits = visitsMappedByDate[k];
            thatDayVisits.sort((v1, v2) => {
                return (new Date(v1.date)) - (new Date(v2.date));
            });
            let parsedDate = new Date(thatDayVisits[0].date);
            visitsSortedByDate.push({
                date: k,
                dayOfTheWeek: this.model.days[parsedDate.getDay()],
                visits: thatDayVisits
            });
        });
        this.model.schedule = visitsSortedByDate;
    }

    _attachHandlerBack() {
        this.onTagEvent('back', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.history.back();
        });
    }
}
