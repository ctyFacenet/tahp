frappe.pages['week-work-order-plan'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'DS LSX',
    single_column: true,
  });
  load_vue(wrapper);
};

frappe.pages['week-work-order-plan'].on_page_show = (wrapper) => load_vue(wrapper);

// Simple callback function to load Vue in the page
async function load_vue(wrapper) {
  console.log('load_vue');
  const $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();

  // Require the bundle and mount the Vue app
  await frappe.require('WeekWorkOrderPlan.bundle.js');
  frappe.test_vue_app = frappe.ui.setup_vue($parent);
}
