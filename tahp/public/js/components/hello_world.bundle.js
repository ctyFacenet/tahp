
frappe.provide("tahp.ui");
import ProductionReport from "../../hello_vue/pages/ProductionReport.vue";

class HelloWorldComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = tahp.vue.mountVue(ProductionReport, props, this.wrapper);
  }

  destroy() {
    tahp.vue.unmountVue(this.mounted);
  }
}

tahp.ui.HelloWorldComponent = HelloWorldComponent;


export { HelloWorldComponent };
