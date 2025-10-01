import { mountVue, unmountVue } from "./vue_helper";

frappe.provide("tahp.vue");
tahp.vue.mountVue = mountVue;
tahp.vue.unmountVue = unmountVue;

import "./components/hello_world.bundle.js";
