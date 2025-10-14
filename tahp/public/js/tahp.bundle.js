import { mountVue, unmountVue } from "./vue_helper";
import "./components/custom_field.bundle.js";
import "./components/dialog.bundle.js";
import "./components/form_view.bundle.js";
import "./components/grid_view.bundle.js";
import "./components/hello_world.bundle.js";
import "./components/list_view.bundle.js";
import "./components/dash_board_grid.bundle.js"
import "./components/counter.bundle.js"

frappe.provide("tahp.vue");
tahp.vue.mountVue = mountVue;
tahp.vue.unmountVue = unmountVue;



