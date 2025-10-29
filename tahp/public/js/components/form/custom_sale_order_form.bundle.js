frappe.provide("tahp.ui");

import DynamicForm from "../../../hello_vue/components/form/DynamicForm.vue";
import { mountVue, unmountVue } from "../../vue_helper";

class CustomDynamicFormComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(DynamicForm, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomDynamicFormComponent = CustomDynamicFormComponent;

export { CustomDynamicFormComponent };