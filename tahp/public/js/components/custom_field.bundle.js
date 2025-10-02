import { mountVue, unmountVue } from "../vue_helper";
import CustomDropdown from "../../hello_vue/components/fields/CustomDropdown.vue";

class CustomFieldComponent {
  constructor({ wrapper, value }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomDropdown, { value }, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.CustomFieldComponent = CustomFieldComponent;

export default CustomFieldComponent;
