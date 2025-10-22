frappe.provide("tahp.ui");

import CustomWorkOrderList from "../../hello_vue/components/doctype/custom-work-order/CustomWorkOrderList.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomWorkOrderComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomWorkOrderList, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomWorkOrderComponent = CustomWorkOrderComponent;
export { CustomWorkOrderComponent };
