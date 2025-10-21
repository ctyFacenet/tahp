frappe.provide("tahp.ui");

import CustomProductOrder from "../../hello_vue/components/doctype/custom-production-order/CustomProductOrderList.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomProductOrderComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomProductOrder, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomProductOrderComponent = CustomProductOrderComponent;

export { CustomProductOrderComponent };