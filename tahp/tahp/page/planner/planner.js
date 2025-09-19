frappe.pages["planner"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Planner"),
		single_column: true,
	});
};

frappe.pages["planner"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("planner.bundle.js").then(() => {
		frappe.planner = new frappe.ui.Planner({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}