frappe.ui.form.on('Stock Entry', {
    onload: async function(frm) {
        await set_code(frm);
        await frm.events.autofill_input(frm);
    },

    stock_entry_type: async function(frm) {
        await set_code(frm);
    },

    // autofill_input: async function(frm) {
    //     if (!frm.is_new() || !frm.doc.work_order) return;
    //     const inputs = await frappe.xcall('tahp.doc_events.work_order.before_submit.add_input', { work_order: frm.doc.work_order });
    //     if (inputs && inputs.length) {
    //         inputs.forEach(input => {
    //             let row = frm.add_child('items');
    //             row.s_warehouse = input.s_warehouse;
    //             row.t_warehouse = input.t_warehouse ? input.t_warehouse : null,
    //             row.is_scrap_item = input.t_warehouse ? 1 : null,
    //             row.item_code = input.item_code;
    //             row.item_name = input.item_name;
    //             row.qty = input.qty;
    //             row.uom = input.uom;
    //             row.description = input.description;
    //             row.conversion_factor = 1;
    //             row.transfer_qty = input.qty;
    //             row.set_basic_rate_manually = 1;
    //         });
    //         }
    //         frm.refresh_field('items');
    //     frm.refresh_field('items');
    // },

    autofill_input: async function(frm) {
        if (!frm.is_new() || !frm.doc.work_order) return;

        const inputs = await frappe.xcall('tahp.doc_events.work_order.before_submit.add_input', {
            work_order: frm.doc.work_order
        });

        frm.doc.items.forEach(item => {
            if (item.is_finished_item) {
                item.description = "Thành phẩm";
            } else {
                item.description = "Nguyên liệu sản xuất";
            }
        });

        if (inputs && inputs.length) {
            inputs.forEach(input => {
                let existing = frm.doc.items.find(item => item.item_code === input.item_code);
                if (existing) {
                    existing.qty = 0;
                    existing.transfer_qty = 0;
                }
            });

            inputs.forEach(input => {
                let existing = frm.doc.items.find(item => item.item_code === input.item_code);
                console.log('helli')
                if (existing) {
                    existing.qty += input.qty;
                    existing.transfer_qty += input.qty;
                    existing.description = input.description ? input.description : existing.description
                }
            });

            frm.refresh_field('items');
        }
    },

    refresh: function(frm) {
        frm.set_intro("")
        frm.events.set_warehouse_readonly(frm);
        frm.$wrapper.find('.grid-add-multiple-rows').remove();
        frm.$wrapper.find('.grid-download').remove();
        frm.$wrapper.find('.grid-upload').remove();
        if (frm.doc.stock_entry_type) {
            let title = "";

            switch (frm.doc.stock_entry_type) {
                case "Manufacture":
                    title = "Nhập kho thành phẩm";
                    break;
                case "Material Receipt":
                    title = "Nhập kho";
                    break;
                case "Material Issue":
                    title = "Xuất kho";
                    break;
                case "Material Transfer":
                    title = "Chuyển kho";
                    break;
                default:
                    title = frm.doc.stock_entry_type;
            }
            frm.page.set_title(title);
        }
        if (frm.doc.stock_entry_type !== "Manufacture") return;
        let html = `
            <div class="alert alert-info w-100" role="alert" style="margin-bottom:0px;">
                Bạn có thể chỉnh sửa lại số lượng theo thực tế
            </div>
        `;
        frm.fields_dict.custom_warn.$wrapper.html(html);
    },

    set_warehouse_readonly(frm) {
        const type = frm.doc.stock_entry_type;
        frm.fields_dict.items.grid.update_docfield_property('s_warehouse', 'read_only', 0);
        frm.fields_dict.items.grid.update_docfield_property('t_warehouse', 'read_only', 0);
        if (type === "Material Receipt") {
            frm.fields_dict.items.grid.update_docfield_property('s_warehouse', 'read_only', 1);
        } else if (type === "Material Issue") {
            frm.fields_dict.items.grid.update_docfield_property('t_warehouse', 'read_only', 1);
        } else if (type === "Manufacture") {
            set_warehouse_readonly_by_finished(frm)
        }
        frm.fields_dict.items.grid.refresh();
    }

});

function set_warehouse_readonly_by_finished(frm) {
    frm.fields_dict.items.grid.grid_rows.forEach((grid_row) => {
        const doc = grid_row.doc;

        if (doc.is_finished_item) {
            grid_row.wrapper.find('[data-fieldname="s_warehouse"]').css('pointer-events', 'none');
            grid_row.wrapper.find('[data-fieldname="t_warehouse"]').css('pointer-events', '');
        } else {
            grid_row.wrapper.find('[data-fieldname="t_warehouse"]').css('pointer-events', 'none');
            grid_row.wrapper.find('[data-fieldname="s_warehouse"]').css('pointer-events', '');
        }
    });

    frm.fields_dict.items.grid.refresh();
}


frappe.ui.form.on('Stock Entry Detail', {
    qty: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.is_finished_item) {
            frm.doc.fg_completed_qty = row.qty;
        }
    },
});


/**
 * Sinh custom_code cho Stock Entry khi tạo mới.
 * - Chỉ chạy nếu document là mới (is_new).
 * - Không chạy nếu custom_code đã có hoặc stock_entry_type chưa được chọn.
 * - Sinh số thứ tự dựa trên stock_entry_type, năm, tháng, và số chứng từ cùng loại đã Confirm (docstatus=1).
 * - Format: CODE.YYYY.MM.#### (ví dụ: NK.2025.08.0001).
 */
async function set_code(frm) {
    if (!frm.is_new()) return;
    if (frm.doc.custom_code || !frm.doc.stock_entry_type) return;

    const map = {
        "Material Receipt": "NK",
        "Material Issue": "XK",
        "Manufacture": "SX"
    };
    const code = map[frm.doc.stock_entry_type] || "UNK";

    const today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
    const start_date = `${year}-${month}-01`;
    const end_date = `${year}-${month}-${lastDay}`;

    // Lấy bản ghi mới nhất theo custom_code
    const entries = await frappe.db.get_list("Stock Entry", {
        filters: [
            ["stock_entry_type", "=", frm.doc.stock_entry_type],
            ["posting_date", ">=", start_date],
            ["posting_date", "<=", end_date],
            ["custom_code", "like", `${code}.${year}.${month}.%`]
        ],
        fields: ["custom_code"],
        order_by: "custom_code desc",
        limit: 1
    });

    let next_index = 1;
    if (entries.length > 0 && entries[0].custom_code) {
        const last_code = entries[0].custom_code;
        const parts = last_code.split(".");
        const last_number = parseInt(parts[3] || "0", 10);
        next_index = last_number + 1;
    }

    const custom_code = `${code}.${year}.${month}.${String(next_index).padStart(4, '0')}`;
    frm.set_value('custom_code', custom_code);
}