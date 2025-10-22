frappe.provide("tahp.ui");

import CustomInProcessInventoryList from "../../hello_vue/components/doctype/custom-in-process-inventory/CustomInProcessInventoryList.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CustomInProcessInventoryComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomInProcessInventoryList, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomInProcessInventoryComponent = CustomInProcessInventoryComponent;
export { CustomInProcessInventoryComponent };
