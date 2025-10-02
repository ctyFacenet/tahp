import ProductionReport from "../../hello_vue/pages/ProductionReport.vue";

class HelloWorldComponent {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
    this.mounted = tahp.vue.mountVue(ProductionReport, {}, this.wrapper);
  }

  destroy() {
    tahp.vue.unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.HelloWorldComponent = HelloWorldComponent;

export default HelloWorldComponent;
