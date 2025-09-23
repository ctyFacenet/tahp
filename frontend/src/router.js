import { userResource } from "@/data/user"
import { createRouter, createWebHistory } from "vue-router"
import { session } from "./data/session"

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/pages/Home.vue"),
  },
  {
    name: "Login",
    path: "/account/login",
    component: () => import("@/pages/Login.vue"),
  },
  {
    name: "Workspace List",
    path: "/workspace/list",
    component: () => import("@/pages/WorkSpaceList.vue"),
  },
  {
    name: "ProductionInfo Dialog",
    path: "/dialog/info",
    component: () => import("@/pages/TestDialog.vue"),
  },
  {
    name: "Defect Report",
    path: "/defect-report",
    component: () => import("@/pages/DefectReport.vue"),
  },
  {
    name: "Detail Order Report",
    path: "/detail-order-report",
    component: () => import("@/pages/DetailOrderReport.vue"),
  },
  {
    name: "Production Report",
    path: "/production-report",
    component: () => import("@/pages/ProductionReport.vue"),
  }
]

const router = createRouter({
  history: createWebHistory("/frontend"),
  routes,
})

router.beforeEach(async (to, from, next) => {
  let isLoggedIn = session.isLoggedIn
  try {
    await userResource.promise
  } catch (error) {
    isLoggedIn = false
  }

  if (to.name === "Login" && isLoggedIn) {
    next({ name: "Home" })
  } else if (to.name !== "Login" && !isLoggedIn) {
    window.location.href = "/login";
  } else {
    next()
  }
})

export default router
