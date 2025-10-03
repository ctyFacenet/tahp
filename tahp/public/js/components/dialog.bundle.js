import { mountVue, unmountVue } from "../vue_helper";
import WizardDialog from "../../hello_vue/components/dialog/WizardDialog.vue";
import ProductionInfoDialog from "../../hello_vue/components/dialog/ProductionInfoDialog.vue";

class WizardDialogComponent {
  constructor({ wrapper, rows }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(WizardDialog, { rows }, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

class ProductionInfoDialogComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(ProductionInfoDialog, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.WizardDialogComponent = WizardDialogComponent;
tahp.ui.ProductionInfoDialogComponent = ProductionInfoDialogComponent;

export { WizardDialogComponent, ProductionInfoDialogComponent };
