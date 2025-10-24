frappe.provide("tahp.ui");

import CustomWorkOrderApprovedList from "../../hello_vue/components/doctype/custom-work-order-approved/CustomWorkOrderApprovedList.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomWorkOrderApprovedComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomWorkOrderApprovedList, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomWorkOrderApprovedComponent = CustomWorkOrderApprovedComponent;
export { CustomWorkOrderApprovedComponent };
