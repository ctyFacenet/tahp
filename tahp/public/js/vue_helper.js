import { createApp } from "vue";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/reset.css";

export function mountVue(Component, props, wrapper) {
  const el = wrapper.get ? wrapper.get(0) : wrapper;

  if (el.__vue_app__) {
    el.__vue_app__.app.unmount();
    el.innerHTML = "";
  }

  const app = createApp(Component, props);
  app.use(Antd);
  SetVueGlobals(app);
  const vm = app.mount(el);

  el.__vue_app__ = { app, vm, el };
  return el.__vue_app__;
}


export function unmountVue(mountedApp) {
  if (mountedApp?.app) {
    mountedApp.app.unmount();
    if (mountedApp.el) {
      mountedApp.el.innerHTML = "";
    }
  }
}
