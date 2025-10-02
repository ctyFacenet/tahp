import { mountVue, unmountVue } from "../vue_helper";
import DashboardGrid from "../../hello_vue/components/dashboard/DashboardGrid.vue";

class DashboardGridWidget {
  constructor({ wrapper }) {
    this.wrapper = wrapper;

    const data = {
      kpis: [
        { label: "Doanh thu", value: "45.5M" },
        { label: "Lợi nhuận", value: "12.3M" },
        { label: "Khách hàng", value: "320" },
        { label: "Đơn hàng", value: "1,240" },
      ],
      revenueLabels: ["T1", "T2", "T3", "T4", "T5"],
      revenueValues: [12000000, 15000000, 18500000, 20000000, 22000000],
      orderLabels: ["T1", "T2", "T3", "T4", "T5"],
      orderValues: [120, 150, 200, 180, 210],
      products: [
        { code: "SP01", name: "Sản phẩm A", qty: 120 },
        { code: "SP02", name: "Sản phẩm B", qty: 90 },
        { code: "SP03", name: "Sản phẩm C", qty: 75 },
      ],
    };

    this.mounted = mountVue(DashboardGrid, data, this.wrapper);
  }

  destroy() {
    unmountVue(this.mounted);
  }
}

frappe.provide("tahp.ui");
tahp.ui.DashboardGridWidget = DashboardGridWidget;

export default DashboardGridWidget;
