const commonServices = require("common-services");
const DSUService = commonServices.DSUService;
const IFCS_PATH="ifcs";
export default class HCOService extends DSUService {

    ssi = null;

    constructor() {
        super('/hco_dsu');
    }

    getOrCreate = (callback) => {
        let classThis = this;
        if (this.ssi !== null) {
            return this.getEntity(this.ssi, (err, entity) => {
                if (err) {
                    return callback(err);
                }
                this.fillObjectWithVolatileSubItems(entity, (err, data) =>{
                    if(err){
                        return callback(err);
                    }

                    this.getSiteData(data, callback);
                })
            })
        }
        this.getEntities((err, hcoDSUs) => {
            if (err) {
                return callback(err);
            }
            if (typeof hcoDSUs !== 'undefined' && hcoDSUs.length > 0) {
                let hcoDSU = hcoDSUs[0];
                classThis.ssi = hcoDSU.uid;
                return this.fillObjectWithVolatileSubItems(hcoDSU, (err, data) => {
                    if(err){
                        return callback(err);
                    }

                    this.getSiteData(data, callback);
                })
            }
            this.saveEntity({}, (err, entity) => {
                if (err) {
                    return callback(err);
                }
                classThis.ssi = entity.uid;
                this.fillObjectWithVolatileSubItems(entity, (err, data) => {
                    if(err){
                        return callback(err);
                    }

                    this.getSiteData(data, callback);
                })
            })
        })
    }

    fillObjectWithVolatileSubItems = (entity, callback) => {
        this.getEntities(this.PATH + '/' + entity.uid, (err, subEntities) => {
            if (err) {
                return callback(err);
            }
            entity.volatile = {};
            subEntities.forEach((item) => {
                if (entity.volatile[item.objectName] === undefined) {
                    entity.volatile[item.objectName] = [];
                }
                entity.volatile[item.objectName].push(item);
            })
            callback(undefined, entity);
        })
    }

    getSiteSpecificData(siteUid, callback){
        const specificData = {}
        this.getEntities(this.PATH + '/' + this.ssi+ "/site/"+ siteUid, (err, subEntities) => {
            if (err) {
                return callback(err);
            }
            subEntities.forEach((item) => {
                let {objectName, ...toBeCopied} = item;
                specificData[objectName] = toBeCopied;
            })
            callback(undefined, specificData);
        })
    }

    getSiteData(data, callback) {
        const sites = data.volatile.site;
        if (!sites) {
            return callback(undefined, data);
        }
        const sitesPromises = [];
        sites.forEach((site, index) => {
            const sitePromise = new Promise((resolve, reject) => {
                this.getSiteSpecificData(site.uid, (err, siteSpecificData) => {
                    if (err) {
                        return reject(err);
                    }
                    sites[index] = {...site, ...siteSpecificData};
                    resolve(sites[index]);
                })
            });
            sitesPromises.push(sitePromise);
        });

        Promise.all(sitesPromises).then(() => {
            callback(undefined, data);
        }).catch(callback);
    }

    getOrCreateAsync = async () => {
        return this.asyncMyFunction(this.getOrCreate, [])
    }

    mountTrial = (trialSSI, callback) => {
        this.mountSubEntity(trialSSI, 'trial', callback);
    }

    mountVisit = (visitSSI, callback) => {
        this.mountSubEntity(visitSSI, 'visit', callback);
    }

    mountSite = (siteSSI, callback) => {
        this.mountSubEntity(siteSSI, 'site', callback);
    }

    mountIFC = (ifcSSI, callback) => {
        this.mountSubEntity(ifcSSI, 'ifc', callback);
    }

    mountTC = (tcSSI, callback) => {
        this.mountSubEntity(tcSSI, 'tc', callback);
    }

    cloneIFCs = (siteSSI, callback) => {
        const siteUID = this.getAnchorId(siteSSI);
        if (this.ssi == null) {
            return callback(this.PATH + ' was not initialized yet.');
        }
        const consentsPath = this.PATH + '/' + this.ssi + '/site/'+ siteUID+"/consent";
        this.getEntities(consentsPath, (err, consents) => {
            if (err) {
                return callback(err);
            }
            if (consents.length === 0) {
                return callback(undefined, []);
            }
            let clonedIFCS = [];
            let siteConsents = consents;
            let hcoPath = this.PATH + '/' + this.ssi;
            this.getFilteredEntities(hcoPath,IFCS_PATH,(err, existingIFCS) => {

                if (err) {
                    return callback(err);
                }
                let getServiceDsu = (consent) => {
                    if (consent === undefined && siteConsents.length === 0) {
                        return callback(undefined, []);
                    }
                    let existingIfc = existingIFCS.find(ifc => ifc.genesisUid === consent.uid);
                    if (existingIfc !== undefined) {
                        const ifcVersions = existingIfc.versions.map(version => version.version);
                        const notExistingVersions = consent.versions.filter(version => ifcVersions.includes(version.version) === false);
                        existingIfc.versions.push(...notExistingVersions);
                        return this.updateHCOSubEntity(existingIfc, "ifcs", async (err, response) => {
                            if (err) {
                                return console.log(err);
                            }

                            let copyVersionsPromises = notExistingVersions.map(version => {
                                return new Promise((resolve,reject) => {
                                    const source = consentsPath + "/" + consent.uid  + "/versions/" + version.version + "/" + version.attachment;
                                    const destination = hcoPath + "/" + IFCS_PATH + "/" + existingIfc.uid + "/versions/" + version.version + "/" + version.attachment;
                                    
                                    this.copyFile(source, destination, (err) => {
                                        if(err) {
                                            return reject(err);
                                        }
                                        resolve();
                                    });
                                })
                            })

                            Promise.all(copyVersionsPromises).then(() => {
                                getServiceDsu(siteConsents.pop());
                            })
                        });

                    }
                    consent = {
                        ...consent,
                        genesisUid: consent.uid
                    }

                    this.DSUStorage.listMountedDSUs(consentsPath, (err, dsuList) => {
                        if (err) {
                            return callback(err);
                        }

                        const mountedConsent = dsuList.find(item => item.path === consent.uid);

                        this.cloneDSU(mountedConsent.identifier, hcoPath + '/'+IFCS_PATH, (err, cloneDetails) => {
                            if (err) {
                                return getServiceDsu(siteConsents.pop());
                            }
                            clonedIFCS.push(cloneDetails);
                            if (siteConsents.length === 0) {
                                return callback(undefined, clonedIFCS);
                            }
                            getServiceDsu(siteConsents.pop());
                        })
                    })

                };
                if (siteConsents.length === 0) {
                    return callback(undefined, []);
                }
                getServiceDsu(siteConsents.pop());
            });
        });
    }

    async getHCOSubEntity(uid, path, callback) {
        const subEntityPath = this._getSubPath(path);
        this.getEntity(uid,subEntityPath, callback);
    }

    updateHCOSubEntity(entity, path, callback) {
        const subEntityPath = this._getSubPath(path);
        this.updateEntity(entity, subEntityPath, callback);
    }


    getConsentSSI(siteUID, consentUid, callback){
        const consentsPath = this.PATH + '/' + this.ssi + '/site/'+ siteUID+"/consent";
        this.DSUStorage.listMountedDSUs(consentsPath, (err, dsuList) => {
            if (err) {
                return callback(err);
            }
            const mountedConsent = dsuList.find(item => item.path === consentUid);
            callback(undefined, mountedConsent.identifier)
        })
    }

    addTrialParticipant = (tp, callback) => {
        let anonymousTP = this.anonymizeParticipant(tp);
        let tpSubPath = this._getSubPath('tps');
        if (this.ssi !== null) {
            return this.getEntity(this.ssi, (err, entity) => {
                if (err) {
                    return callback(err);
                }
                this.saveEntity(anonymousTP, tpSubPath, (err, entity) => callback(err, entity));
            })
        }
        this.saveEntity(anonymousTP, tpSubPath, (err, entity) => callback(err, entity));
    }

    addTrialParticipantAsync = async (tp) => {
        return this.asyncMyFunction(this.addTrialParticipant, [tp])
    }

    anonymizeParticipant = (tp) => {
        return {
            ...tp,
            birthdate: '-',
            enrolledDate: '-',
            name: '-',
            publicDid:"-"
        };
    }

    mountSubEntity = (subEntitySSI, subEntityName, callback) => {
        if (this.ssi != null) {
            return this.mountEntity(subEntitySSI, this._getSubPath(subEntityName), callback);
        }
        this.getOrCreate((err, entity) => {
            if (err) {
                return callback(err);
            }
            this.mountEntity(subEntitySSI, this._getSubPath(subEntityName), callback);
        })
    }

    _getSubPath = (subItem) => {
        return this.PATH + '/' + this.ssi + '/' + subItem;
    }

    getSiteSReadSSI = (callback) => {
        const sitePath = this._getSubPath('site');
        this.getEntityMountSSI(sitePath, callback);
    }
    async getSiteSReadSSIAsync () {
        return this.asyncMyFunction(this.getSiteSReadSSI, [...arguments]);
    }

    getTrialSReadSSI = (callback) => {
        const trialPath = this._getSubPath('trial');
        this.getEntityMountSSI(trialPath, callback);
    }

     async getTrialSReadSSIAsync () {
        return this.asyncMyFunction(this.getTrialSReadSSI, [...arguments]);
    }

}


