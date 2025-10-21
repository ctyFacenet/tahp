frappe.listview_settings["Stock Entry"] = {
	add_fields: ["purpose", "docstatus", "is_return", "per_transferred", "posting_date"],

    refresh: function(listview) {

        function set_title_by_type(type) {
            let title = "";
            switch (type) {
                case "Manufacture":
                    title = "Nhập xuất theo LSX";
                    break;
                case "Material Receipt":
                    title = "Nhập kho NVL";
                    break;
                case "Material Issue":
                    title = "Xuất kho";
                    break;
                case "Material Transfer":
                    title = "Chuyển kho";
                    break;
                default:
                    title = __("Stock Entry"); // fallback
            }
            listview.page.set_title(title);
            frappe.custom_utils_primary_action(listview, `Tạo phiếu ${title}`, async () => {
                listview.make_new_doc();
            });
        }
        const filters = listview.filter_area.filter_list.base_list.filters;
        for (let i = 0; i < filters.length; i++) {
            const f = filters[i];
            if (f[1] === "stock_entry_type" && f[3]) {
                set_title_by_type(f[3]);
                break;
            }
        }
    },


	get_indicator: function (doc) {
		if (doc.is_return === 1 && doc.purpose === "Material Transfer for Manufacture") {
			return [
				__("Material Returned from WIP"),
				"orange",
				"is_return,=,1|purpose,=,Material Transfer for Manufacture|docstatus,<,2",
			];
		} else if (doc.docstatus === 0) {
			return [__("Draft"), "red", "docstatus,=,0"];
		} else if (doc.purpose === "Send to Warehouse" && doc.per_transferred < 100) {
			return [__("Goods In Transit"), "grey", "per_transferred,<,100"];
		} else if (doc.purpose === "Send to Warehouse" && doc.per_transferred === 100) {
			return [__("Goods Transferred"), "green", "per_transferred,=,100"];
		} else if (doc.docstatus === 2) {
			return [__("Canceled"), "red", "docstatus,=,2"];
		} else {
			return [__("Submitted"), "blue", "docstatus,=,1"];
		}
	},

	fields: ["name", "purpose", "posting_date"],

	columns: [
		{
			fieldname: "name",
			label: __("Stock Entry"),
			fieldtype: "Data",
			width: 180,
		},
		{
			fieldname: "posting_date",
			label: __("Posting Date"),
			fieldtype: "Date",
			width: 120,
		},
		{
			fieldname: "purpose",
			label: __("Purpose"),
			fieldtype: "Data",
			width: 180,
		},
		{
			label: __("Status"),
			width: 150,
			fieldtype: "Data",
			render: function (doc) {
				const indicator = frappe.listview_settings["Stock Entry"].get_indicator(doc);
				if (!indicator) return "";
				return `<span class="indicator-pill ${indicator[1]} filterable" 
					data-filter="${indicator[2]}">${indicator[0]}</span>`;
			},
		},
	],
};
