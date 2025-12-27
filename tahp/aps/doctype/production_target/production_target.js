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

            frm.add_custom_button("Lập yêu cầu mua hàng", () => {
                show_purchase_request_dialog(frm);
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


function show_purchase_request_dialog(frm) {
    let items_data = [];
    frm.doc.items.forEach(item => {
        items_data.push({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.qty,
            bom: ''
        });
    });
    
    let dialog = new frappe.ui.Dialog({
        title: 'Lập yêu cầu mua hàng',
        size: 'large',
        fields: [
            {
                fieldname: 'items_section',
                fieldtype: 'Section Break',
                label: 'Chọn mặt hàng và BOM'
            },
            {
                fieldname: 'items_table',
                fieldtype: 'Table',
                label: 'Danh sách mặt hàng',
                cannot_add_rows: true,
                cannot_delete_rows: true,
                in_place_edit: true,
                data: items_data,
                fields: [
                    {
                        fieldname: 'item_code',
                        fieldtype: 'Data',
                        label: 'Mã mặt hàng',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 2
                    },
                    {
                        fieldname: 'item_name',
                        fieldtype: 'Data',
                        label: 'Tên mặt hàng',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 3
                    },
                    {
                        fieldname: 'qty',
                        fieldtype: 'Float',
                        label: 'Số lượng',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 1
                    },
                    {
                        fieldname: 'bom',
                        fieldtype: 'Link',
                        label: 'BOM',
                        options: 'BOM',
                        in_list_view: 1,
                        columns: 4,
                        get_query: function(doc) {
                            
                            return {
                                filters: {
                                    'item': doc.item_code,  
                                    'is_active': 1,
                                    'docstatus': 1
                                }
                            }
                        },
                        onchange: function() {
                            update_materials_table(dialog);
                        }
                    }
                ]
            },
            {
                fieldname: 'materials_section',
                fieldtype: 'Section Break',
                label: 'Nguyên liệu cần mua'
            },
            {
                fieldname: 'materials_table',
                fieldtype: 'Table',
                label: 'Danh sách nguyên liệu',
                cannot_add_rows: true,
                cannot_delete_rows: true,
                in_place_edit: true,
                data: [],
                fields: [
                    {
                        fieldname: 'item_code',
                        fieldtype: 'Data',
                        label: 'Mã nguyên liệu',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 2
                    },
                    {
                        fieldname: 'item_name',
                        fieldtype: 'Data',
                        label: 'Tên nguyên liệu',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 4
                    },
                    {
                        fieldname: 'uom',
                        fieldtype: 'Data',
                        label: 'Đơn vị',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 1
                    },
                    {
                        fieldname: 'qty',
                        fieldtype: 'Float',
                        label: 'Số lượng',
                        in_list_view: 1,
                        read_only: 1,
                        columns: 2
                    }
                ]
            }
        ],
        primary_action_label: 'Tạo',
        primary_action: () => create_material_request(dialog, frm)
    });
    
    dialog.show();
    dialog.wrapper.find('.row-check').hide();
    cleanerTable(dialog);
}

async function update_materials_table(dialog) {
    let items_data = dialog.fields_dict.items_table.grid.get_data();
    let material_summary = {};
    
    // Lọc các dòng có BOM được chọn
    let valid_items = items_data.filter(item => item.bom);
    
    if (valid_items.length === 0) {
        dialog.fields_dict.materials_table.df.data = [];
        dialog.fields_dict.materials_table.grid.refresh();
        return;
    }
    
    // Duyệt qua từng item và lấy BOM items
    for (let item of valid_items) {
        
        let bom_data = await frappe.db.get_doc('BOM', item.bom);
        
        if (bom_data && bom_data.items) {
            for (let bom_item of bom_data.items) {
                let key = bom_item.item_code;
                let qty = (bom_item.qty || 0) * (item.qty || 1);
                
                if (material_summary[key]) {
                    material_summary[key].qty += qty;
                } else {
                    material_summary[key] = {
                        item_code: bom_item.item_code,
                        item_name: bom_item.item_name,
                        uom: bom_item.uom || bom_item.stock_uom,
                        qty: qty
                    };
                }
            }
        }
    }
    
    // Cập nhật bảng nguyên liệu
    let materials_array = Object.values(material_summary);
    dialog.fields_dict.materials_table.df.data = materials_array;
    dialog.fields_dict.materials_table.grid.refresh();
    dialog.wrapper.find('.row-check').hide();
    cleanerTable(dialog);
}

async function create_material_request(dialog, frm) {
    let materials_data = dialog.fields_dict.materials_table.grid.get_data();
    
    if (!materials_data || materials_data.length === 0) {
        frappe.msgprint('Vui lòng chọn BOM để tạo danh sách nguyên liệu');
        return;
    }
    
    frappe.model.with_doctype('Material Request', async function() {
        let mr = frappe.model.get_new_doc('Material Request');
        mr.material_request_type = 'Purchase';
        mr.transaction_date = frappe.datetime.nowdate();
        
        // Thêm items vào Material Request
        for (let material of materials_data) {
            let item = frappe.model.add_child(mr, 'Material Request Item', 'items');
            item.item_code = material.item_code;
            item.item_name = material.item_name;
            item.stock_uom = material.uom;
            item.uom = material.uom;
            item.qty = material.qty;
            item.schedule_date = frappe.datetime.add_days(frappe.datetime.nowdate(), 7);
            
            // Lấy thông tin đơn giá và xuất xứ
            
            let data = await frappe.xcall('tahp.pms.doc_events.utils.autofill_item_rate', { item_code: material.item_code})
            
            if (data) {
                item.custom_estimated_rate = data.rate || 0;
                if (data.origin) item.custom_origin = data.origin;
                item.custom_estimated_amount = (material.qty || 0) * (data.rate || 0);
            }
            
        }

        mr.custom_production_target = frm.doc.name;
        
        dialog.hide();
        frappe.set_route('Form', 'Material Request', mr.name);
        
        frappe.show_alert({
            message: 'Đã tạo Yêu cầu mua hàng',
            indicator: 'green'
        }, 3);
    });
}

function cleanerTable(dialog) {
    const $wrapper = dialog.$wrapper;

    // Header - cột cuối cùng
    const $headerLastCol = $wrapper.find('.grid-heading-row .data-row.row .grid-static-col').last();
    $headerLastCol.removeClass(function(index, className) {
        return (className.match(/col-xs-\d+/g) || []).join(' ');
    });

    // Body - từng row
    $wrapper.find('.grid-body .data-row.row').each(function() {
        const $lastCol = $(this).find('.grid-static-col').last();
        $lastCol.removeClass(function(index, className) {
            return (className.match(/col-xs-\d+/g) || []).join(' ');
        });
    });
}