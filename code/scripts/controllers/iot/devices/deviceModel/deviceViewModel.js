const readonlyFields = ['deviceId', 'modelNumber', 'manufacturer', 'deviceName', 'brand'];

function getModel(data = {}) {
    const prevState = data.prevState || {};
    const trials = data.trials;
    return {
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
        // deviceType: {
        //     label: "Device Type",
        //     required: true,
        //     options: [
        //         {
        //             label: "SpO2",
        //             value: 'SpO2'
        //         },
        //         {
        //             label: "Height",
        //             value: 'Height'
        //         },
        //         {
        //             label: "Weight",
        //             value: 'Weight'
        //         },
        //         {
        //             label: "Age",
        //             value: 'Age'
        //         },
        //         {
        //             label: "Systolic Blood Pressure",
        //             value: 'Systolic Blood Pressure'
        //         },
        //         {
        //             label: "Diastolic Blood Pressure",
        //             value: 'Diastolic Blood Pressure'
        //         }
        //     ],
        //     value: prevState.deviceType || "SpO2"
        // },
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
            value: trials.length ? trials[0].value : ""
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
        if (model[key]) {
            model[key]['readonly'] = true;
        }
    }

    return model;
}