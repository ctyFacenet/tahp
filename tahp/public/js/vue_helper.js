import { createApp } from "vue";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";
// import router from "../hello_vue/router/index";

export function mountVue(Component, props, wrapper) {
  const el = wrapper.get ? wrapper.get(0) : wrapper;
  const app = createApp(Component, props);
  app.use(Antd);
  // app.use(router);
  SetVueGlobals(app);
  const vm = app.mount(el);
  return { app, vm, el };
}

export function unmountVue(mountedApp) {
  if (mountedApp?.app) {
    mountedApp.app.unmount();
    if (mountedApp.el) {
      mountedApp.el.innerHTML = "";
    }
  }
}
