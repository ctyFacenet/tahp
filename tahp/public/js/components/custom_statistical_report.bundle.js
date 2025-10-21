frappe.provide("tahp.ui");

import CustomStatisticalReport from "../../hello_vue/pages/DetailOrderReport.vue";
import { mountVue, unmountVue } from "../vue_helper";


class CustomStatisticalReportComponent {
  constructor({ wrapper, ...props }) {
    this.wrapper = wrapper;
    this.mounted = mountVue(CustomStatisticalReport, props, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

tahp.ui.CustomStatisticalReportComponent = CustomStatisticalReportComponent;

export { CustomStatisticalReportComponent };