const commonServices = require('common-services');
const BreadCrumbManager = commonServices.getBreadCrumbManager();

export default class HomeController extends BreadCrumbManager {
    constructor(element, history) {
        super(element, history);

        this.model = this.getState();
        this.model.breadcrumb = this.setBreadCrumb(
            {
                label: "Confirmation",
                tag: "confirmation-page"
            }
        );

        this.attachBackToMenuHandler();
    }

    attachBackToMenuHandler() {
        this.onTagClick("back-to-menu", () => {
            this.navigateToPageTag(this.model.redirectPage, {breadcrumb: this.model.toObject('breadcrumb')});
        });
    }
}