import { mountVue, unmountVue } from "./vue_helper";
import "./components/custom_field.bundle.js";
import "./components/dialog.bundle.js";
import "./components/grid_view.bundle.js";
import "./components/hello_world.bundle.js";
import "./components/list_view.bundle.js";
import "./components/dash_board_grid.bundle.js";
import "./components/counter.bundle.js";
import "./components/custom_sale_order.bundle.js";
import "./components/custom_sale_order_detail.bundle.js";
import "./components/custom_product_order.bundle.js";
import "./components/custom_statistical_report.bundle.js";
import "./components/custom_work_order.bundle.js";
import "./components/custom_semi_finished_products.bundle.js";
import "./components/custom_in_process_inventory.bundle.js";
import "./components/custom_work_order_approved.bundle.js";
import "./components/form/custom_dynamic_form.bundle.js";

frappe.provide("tahp.vue");
tahp.vue.mountVue = mountVue;
tahp.vue.unmountVue = unmountVue;



