frappe.provide("tahp.ui");
import { mountVue, unmountVue } from "../vue_helper";
import WizardDialog from "../../hello_vue/components/dialog/WizardDialog.vue";
import ProductionInfoDialog from "../../hello_vue/components/dialog/ProductionInfoDialog.vue";
import CrudItemDemo from "../../hello_vue/components/demo/CrudItemDemo.vue";
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

class CrudItemDemoComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CrudItemDemo, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}


tahp.ui.WizardDialogComponent = WizardDialogComponent;
tahp.ui.ProductionInfoDialogComponent = ProductionInfoDialogComponent;
tahp.ui.CrudItemDemoComponent = CrudItemDemoComponent;

export { WizardDialogComponent, ProductionInfoDialogComponent, CrudItemDemoComponent };
