frappe.provide("tahp.ui");

import Counter from "../../hello_vue/components/fields/Counter.vue";
import { mountVue, unmountVue } from "../vue_helper";

class CounterComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(Counter, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CounterComponent = CounterComponent;

export { CounterComponent };