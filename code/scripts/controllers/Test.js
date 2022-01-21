const {WebcController} = WebCardinal.controllers;

export default class Test extends WebcController {
    constructor(element, history) {
        super(element, history);
        this.model.did = "Hello";
    }


}