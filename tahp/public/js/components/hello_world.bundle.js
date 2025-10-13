
frappe.provide("tahp.ui");
import ProductionReport from "../../hello_vue/pages/ProductionReport.vue";
import Counter from '../../hello_vue/components/partials/Counter.vue'

class HelloWorldComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = tahp.vue.mountVue(ProductionReport, props, this.wrapper);
  }

  destroy() {
    tahp.vue.unmountVue(this.mounted);
  }
}

class CounterComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = tahp.vue.mountVue(Counter, props, this.wrapper);
  }

  destroy() {
    tahp.vue.unmountVue(this.mounted);
  }
}


tahp.ui.HelloWorldComponent = HelloWorldComponent;
tahp.ui.CounterComponent = CounterComponent;


export { HelloWorldComponent, CounterComponent };
