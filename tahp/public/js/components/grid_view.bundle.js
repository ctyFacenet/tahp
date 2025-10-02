import { mountVue, unmountVue } from "../vue_helper";
import CustomChildTable from "../../hello_vue/components/grid/CustomChildTable.vue";

class GridViewComponent {
  constructor({ wrapper, rows }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomChildTable, { rows }, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.GridViewComponent = GridViewComponent;

export default GridViewComponent;
