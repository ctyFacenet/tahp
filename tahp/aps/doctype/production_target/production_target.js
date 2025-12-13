// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Production Target", {
	refresh(frm) {
        frm.fields_dict.items.grid.get_field('item_code').get_query = function (doc, cdt, cdn) {
            const existing_items = [];
            frm.doc.items.forEach(function(row) {
                if (row.item_code && row.name !== cdn) existing_items.push(row.item_code)
            })
            return {
                filters: {
                    "item_group": ["like", "%Sản phẩm%"],
                    "disabled": 0,
                    "has_variants": 0,
                    "item_code": ["not in", existing_items]
                }
            };
        };

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button("Lập kế hoạch sản xuất", () => {
                let doc = frappe.model.get_new_doc("Custom Planner")
                const post = frappe.model.add_child(doc, "Custom Planner Post", "posts");
                post.routing = frappe.utils.get_random(8)
                for (const item of frm.doc.items) {
                    const tomorrow_date = frappe.datetime.add_days(frappe.datetime.now_date(), 1)
                    const child = frappe.model.add_child(doc, "Custom Planner Item", "items");
                    child.item_code = item.item_code
                    child.item_name = item.item_name
                    child.stock_uom = item.stock_uom
                    child.qty = item.qty
                    child.parent_name = post.routing
                    child.start_date = tomorrow_date
                    child.end_date = tomorrow_date
                }
                frappe.set_route("Form", "Custom Planner", doc.name)
            }).addClass('btn-primary')
        }
	},
});

frappe.ui.form.on("Production Target Item", {
	item_code: async function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
        if (!row.item_code) return;
        let res = await frappe.xcall("erpnext.stock.utils.get_latest_stock_qty", {item_code: row.item_code})
        if (res) frappe.model.set_value(row.doctype, row.name, "available_qty", res)
        frm.refresh_field("items")
	},
})
