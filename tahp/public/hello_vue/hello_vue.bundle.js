import { createApp } from 'vue';
import AppVue from './AppVue.vue';
import router from "./router";

import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';

function setup_vue(wrapper) {
  const app = createApp(AppVue);

  app.use(Antd);
  app.use(router);
  app.mount(wrapper.get(0));

  return app;
}

frappe.ui.setup_vue = setup_vue;
export default setup_vue;
