
const readonlyFields = ['deviceId'];

function getModel(data = {}) {
    const prevState = data.prevState || {};
    if(prevState.isAssigned){
        readonlyFields.push('trial');
    }
    const trials = data.trials;
    return {
        form:{
            deviceId: {
                name: 'deviceid',
                id: 'deviceid',
                label: "Device ID",
                placeholder: 'QC1265389',
                required: true,
                value: prevState.deviceId || '',
            },
            modelNumber: {
                name: 'model',
                id: 'model',
                label: "Device Model Number",
                placeholder: 'ELI 230',
                required: true,
                value: prevState.modelNumber || "",
            },
            manufacturer: {
                name: 'manufacturer',
                id: 'manufacturer',
                label: "Device Manufacturer",
                placeholder: 'Bionet',
                required: true,
                value: prevState.manufacturer || "",
            },
            deviceName: {
                name: 'name',
                id: 'name',
                label: "Device Name",
                placeholder: 'BURDICK ELI 230 EKG MACHINE',
                required: true,
                value: prevState.deviceName || "",
            },
            brand: {
                name: 'brand',
                id: 'brand',
                label: "Device Brand",
                placeholder: 'Burdick',
                required: true,
                value: prevState.brand || "",
            },
            status: {
                label: "Device Status",
                required: true,
                options: [
                    {
                        label: "Active",
                        value: 'Active'
                    },
                    {
                        label: "Inactive",
                        value: 'Inactive'
                    },
                    {
                        label: "Entered in error",
                        value: 'Entered in error'
                    },
                    {
                        label: "Unknown",
                        value: 'Unknown'
                    }
                ],
                value: prevState.status || "Active"
            },
            trial: {
                label: "Clinical trial Number",
                required: true,
                options: trials,
                value: trials.length ? prevState.trialID || trials[0].value : ""
            }
        },

        hasTrials: trials.length > 0,
        isAssigned: prevState.isAssigned || false
    }
}

export function modelSetter(data, readonly = false) {
    let model = getModel(data);

    if (readonly === false) {
        return model;
    }

    for (let key of readonlyFields) {
        if (model.form[key]) {
            model.form[key]['readonly'] = true;
        }
    }

    return model;
}

export function  prepareDeviceData(trial_list, formData) {

    let selected_trial = trial_list.find(t => t.value === formData.trial.value);

    return {
        resourceType: "Device",
        identifier: [{
            use: "official",
            type: {
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                    code: "SNO"
                }]
            },
            value: formData.deviceId.value
        }],
        status: formData.status.value,
        // deviceType: formData.deviceType.value,
        manufacturer: formData.manufacturer.value.trim(),
        deviceId: formData.deviceId.value.trim(),
        device: [
            {
                name:  formData.deviceName.value.trim(),
                type: "manufacturer-name"
            }
        ],
        deviceName: formData.deviceName.value.trim(),
        modelNumber: formData.modelNumber.value.trim(),
        brand: formData.brand.value.trim(),
        trialUid: selected_trial.ssi,
        trialName: selected_trial.name,
        trialID: formData.trial.value,
        sk: formData.deviceId.value.trim(),
        isAssigned: false
    };
}