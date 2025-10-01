import DetailOrderReport from "../../hello_vue/pages/DetailOrderReport.vue";

class HelloWorldComponent {
  constructor({ wrapper }) {
    this.wrapper = wrapper;
    this.mounted = tahp.vue.mountVue(DetailOrderReport, {}, this.wrapper);
  }

  destroy() {
    tahp.vue.unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.HelloWorldComponent = HelloWorldComponent;

export default HelloWorldComponent;
