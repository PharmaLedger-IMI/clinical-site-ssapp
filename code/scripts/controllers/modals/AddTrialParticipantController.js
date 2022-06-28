import HCOService from '../../services/HCOService.js';
const openDSU = require("opendsu");

const {WebcController} = WebCardinal.controllers;
const LEGAL_ENTITY_MAX_AGE = 14;
let getInitModel = () => {
    return {
        name: {
            label: 'Name and Surname',
            name: 'name',
            required: true,
            placeholder: 'Full name',
            value: '',
        },
        did: {
            label: 'Public Identifier',
            name: 'did',
            required: true,
            placeholder: 'Public identifier',
            value: '',
        },
        anonymizedDID: {
            label: 'Anonymized DID',
            name: 'anonymized did',
            required: false,
            placeholder: 'Anonymized identifier',
            value: '',
        },
        birthdate: {
            label: 'Birth Date',
            name: 'date',
            required: true,
            dataFormat: 'MM YYYY',
            type: 'month',
            value: '',
        },
        isUnder14:false,
        didParent1: {
            label: 'Parent 1 Public Identifier',
            name: 'did',
            required: true,
            placeholder: 'Parent 1 Public Identifier',
            value: '',
        },
        didParent2: {
            label: 'Parent 2 Public Identifier',
            name: 'did',
            required: true,
            placeholder: 'Parent 2 Public Identifier',
            value: '',
        },
        gender: {
            label: 'Select your gender',
            required: true,
            options: [
                {
                    label: 'Select Gender',
                    value: '',
                    selected:true,
                    hidden:true
                },
                {
                    label: 'Male',
                    value: 'M',
                },
                {
                    label: 'Female',
                    value: 'F',
                },
            ],
            value: '',
        },

    };
};

export default class AddTrialParticipantController extends WebcController {
    constructor(...props) {
        super(...props);
        this.setModel(getInitModel());
        this._initHandlers();

        this.observeInputs();
        this.model.anonymizedDID.value = this.generateAnonymizedDid();
        this.refreshHandler();
    }

    generateAnonymizedDid() {
        const crypto = openDSU.loadApi('crypto');
        let randomDidName = $$.Buffer.from(crypto.generateRandom(20)).toString('hex');
        const anonymizedDid = `did:ssi:name:iot:${randomDidName}`;
        return anonymizedDid;
    }

    refreshHandler() {
        this.onTagClick('refresh-identifier', () => this.model.anonymizedDID.value = this.generateAnonymizedDid());
    }

    async verifyParticipant() {
        this.HCOService = new HCOService();
        this.model.hcoDSU = await this.HCOService.getOrCreateAsync();
    }

    async observeInputs() {
        const validateInputs = async () => {
            if(this.model.name.value.trim() === '' || this.model.did.value.trim() === '') {
                return this.model.isBtnDisabled = true;
            }
            //known did schema has the next format : did:type:name:domain:uniqueIdentifier
            const didSegments = this.model.did.value.split(':');
            if(didSegments.length !== 5) {
                return this.model.isBtnDisabled = true;
            }
            if(didSegments.some(segment => segment.trim() === '')) {
                return this.model.isBtnDisabled = true;
            }
            await this.verifyParticipant();
            if (this.model.hcoDSU.volatile.tps && this.model.hcoDSU.volatile.tps.length > 0) {
                let tps = this.model.toObject('hcoDSU.volatile.tps');
                this.model.isBtnDisabled = tps.some(tp => tp.did === this.model.did.value);
            } else {
                this.model.isBtnDisabled = false;
            }
        }

        this.model.onChange('name.value', validateInputs);
        this.model.onChange('did.value', validateInputs);
    }

    _initHandlers() {
        this._attachHandlerSubmit();
    }

    _attachHandlerSubmit() {

        this.model.onChange("birthdate",()=>{
            let currentDate = Date.now()
            let birthDate = new Date(this.model.birthdate.value).getTime();

            let daysSinceBirth = (currentDate - birthDate) / (1000 * 3600 * 24);
            let legalEntityMaxAge = LEGAL_ENTITY_MAX_AGE * 365;

            this.model.isUnder14 = legalEntityMaxAge > daysSinceBirth;
        })

        this.onTagEvent('tp:submit', 'click', (model, target, event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const trialParticipant = {
                name: this.model.name.value,
                publicDid: this.model.did.value,
                did: this.model.anonymizedDID.value,
                birthdate: this.model.birthdate.value,
                gender: this.model.gender.value,
            };
            this.send('confirmed', trialParticipant);
        });
    }
}
