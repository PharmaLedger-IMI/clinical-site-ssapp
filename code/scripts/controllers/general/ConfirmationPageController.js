const {WebcController} = WebCardinal.controllers;

export default class HomeController extends WebcController {
    constructor(element, history) {
        super(element, history);

        this.model = this.getState();
        const prevState = this.getState() || {};
        const {breadcrumb, ...state} = prevState;

        this.model.breadcrumb.push({
          label:"Confirmation",
          tag:"confirmation-page",
          state: state
        });

        this.attachBackToMenuHandler();
    }

    attachBackToMenuHandler() {
        this.onTagClick("back-to-menu", () => {
            this.navigateToPageTag(this.model.redirectPage, {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }
}