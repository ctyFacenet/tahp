frappe.provide("tahp.ui");

import CustomSaleOrder from "../../hello_vue/components/doctype/custom-sale-order/CustomSaleOrderTable.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomSaleOrderComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomSaleOrder, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomSaleOrderComponent = CustomSaleOrderComponent;

export { CustomSaleOrderComponent };