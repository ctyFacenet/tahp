import { mountVue, unmountVue } from "../vue_helper";
import CustomForm from "../../hello_vue/components/form/CustomForm.vue";

class CustomFormComponent {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomForm, {}, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.CustomFormComponent = CustomFormComponent;

export default CustomFormComponent;


