frappe.pages['hello-vue'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Hello Vue Page',
    single_column: true,
  });
  if (frappe.boot.developer_mode) {
    frappe.hot_update ??= frappe.hot_update;
    frappe.hot_update.push(() => load_vue(wrapper));
  }
};
frappe.pages['hello-vue'].on_page_show = (wrapper) => load_vue(wrapper);

async function load_vue(wrapper) {
  const $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();
  await frappe.require('hello_vue.bundle.js');
  frappe.hello_vue_app = frappe.ui.setup_vue($parent);
}
