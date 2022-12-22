const {addControllers, addHook} = WebCardinal.preload;

function defineWebCardinalComponents() {
    const {define} = WebCardinal.components;
    define('breadcrumb-navigator');
}

addHook('beforeAppLoads', async () => {
    try {
        defineWebCardinalComponents();
        const {DidInputController} = await import("../components/did-input/DidInputController.js");
        await import("../components/share-did/share-did.js");
        await import("../components/did-input/did-input.js");
        addControllers({DidInputController});
    } catch (error) {
        console.error('Error while defining WebCardinal components', error);
    }
});