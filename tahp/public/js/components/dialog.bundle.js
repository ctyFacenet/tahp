import { mountVue, unmountVue } from "../vue_helper";
import WizardDialog from "../../hello_vue/components/dialog/WizardDialog.vue";

class WizardDialogComponent {
  constructor({ wrapper, rows }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(WizardDialog, { rows }, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.WizardDialogComponent = WizardDialogComponent;

export default WizardDialogComponent;