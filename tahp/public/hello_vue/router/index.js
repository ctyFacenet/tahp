import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../pages/Home.vue"),
  },
  {
    path: "/defect-report",
    name: "DefectReport",
    component: () => import("../pages/DefectReport.vue"),
  },
  {
    path: "/detail-order-report",
    name: "DetailOrderReport",
    component: () => import("../pages/DetailOrderReport.vue"),
  },
  {
    path: "/production-report",
    name: "ProductionReport",
    component: () => import("../pages/ProductionReport.vue"),
  },
];

const router = createRouter({
  history: createWebHistory('/app/hello-vue'),
  routes,
});

export default router;
