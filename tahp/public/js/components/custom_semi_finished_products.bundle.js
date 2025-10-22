frappe.provide("tahp.ui");

import CustomSemiFinishedProductsList from "../../hello_vue/components/doctype/custom-semi-finished-products/CustomSemiFinishedProductsList.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomSemiFinishedProductsComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomSemiFinishedProductsList, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomSemiFinishedProductsComponent = CustomSemiFinishedProductsComponent;
export { CustomSemiFinishedProductsComponent };
