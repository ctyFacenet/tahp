import { mountVue, unmountVue } from "../vue_helper";
import CustomList from "../../hello_vue/components/list/CustomList.vue";

class CustomListComponent {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomList, {}, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.CustomListComponent = CustomListComponent;

export default CustomListComponent;
