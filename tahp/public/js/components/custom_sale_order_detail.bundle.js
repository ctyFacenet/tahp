frappe.provide("tahp.ui");

import CustomSaleOrderDetailList from "../../hello_vue/components/doctype/custom-sale-order-detail/CustomSaleOrderDetailList.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomSaleOrderDetailListComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomSaleOrderDetailList, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomSaleOrderDetailListComponent = CustomSaleOrderDetailListComponent;

export { CustomSaleOrderDetailListComponent };