// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Week Work Order", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('Week Work Order', {
	refresh: async function(frm) {
	    validate_roles(frm);
	    show_duplicate(frm);
	    await update_quantity(frm);
        
        if (frm.doc.docstatus === 1) {
            const has_incomplete_row = (frm.doc.items || []).some(row => (row.got_qty || 0) < (row.qty || 0));
            if (has_incomplete_row) {
                frm.add_custom_button('Tạo LSX Ca', () => open_create_shift_dialog(frm)).addClass("btn-primary");
            }
        }

		frm.fields_dict['items'].grid.get_field('bom').get_query = function (doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    item: row.item,
                    is_active: 1,
                    docstatus: 1
                }
            };
        };
        
        frm.fields_dict['items'].grid.get_field('item').get_query = function (doc, cdt, cdn) {
            return {
                filters: {
                    "item_group": ["like", "%Sản phẩm%"],
                    "disabled": 0,
                    "has_variants": 0   // Chỉ lấy item thường, không phải template
                }
            };
        };
        
        frm.set_query('plan', function() {
			return {
				filters: {
					docstatus: 0
				}
			};
		});
	},
    validate: function(frm) {
        if (!frm.doc.items.length) {
            validated = false;
            frm.add_child('items', {});
            frm.refresh_field('items');
            return;
        }
        
        frm.doc.items.forEach((row, index) => {
            if (!row.planned_start_time || !row.planned_end_time) {
                frappe.msgprint(__(`Dòng ${index+1}: Vui lòng nhập đầy đủ ngày bắt đầu và kết thúc.`));
                validated = false;
            }

            if (!row.qty || row.qty <= 0) {
                frappe.msgprint(__(`Dòng ${index+1}: Số lượng mặt hàng dự kiến phải lớn hơn 0.`));
                validated = false;
            }
        });
    },
    onload_post_render: async function(frm) {
        validate_roles(frm);
        show_duplicate(frm);
    },
    workflow_state: function(frm) {
        validate_roles(frm);
        show_duplicate(frm);
    },
    onload: function(frm) {
        show_duplicate(frm);
        frm.set_query('bom', function(){
             return {
                 filters: {
                    item :  from.doc.item 
                }
            }
        })
    },
    before_workflow_action: async function (frm) {
        if (!frm.doc.items.length) {
            frappe.dom.unfreeze();
            frappe.throw(__(`Danh sách của LSX Tuần không được trống`));
            return;
        }

        if (frm.doc.workflow_state === "Đợi PTCN Duyệt" && frm.selected_workflow_action !== "Trả về KHSX") {
            let missing_bom = frm.doc.items.some(row => !row.bom);
            if (missing_bom) {
                frappe.dom.unfreeze();
                frappe.throw(__("Vui lòng điền đầy đủ BOM cho tất cả dòng trong bảng"));
                return;
            }
        }
        if (frm.doc.workflow_state === "Đã được PTCN duyệt" && !frm.doc.plan) {
            frappe.dom.unfreeze();
            frappe.throw(__("LSX Tuần này chưa được gán với KHSX nào!"));
            return;
        }
        
        if (frm.doc.workflow_state === "Đã được PTCN duyệt" && frm.selected_workflow_action === "Gửi GĐ") {
            // frappe.dom.unfreeze();
            // // const ok = true;
            // let res = await frappe.call({ method: "tahp.api.check_wwo", args: { detail: frm.doc.items } });
            // const { ok, messages } = res;
            // if (!ok) {
            //     const table = missing_material(messages);
            //     frappe.msgprint({
            //         title: "Thiếu nguyên liệu",
            //         message: table,
            //         indicator: "red"
            //     });
        
            //     // throw __("Không thể gửi Giám đốc duyệt khi LSX đang thiếu nguyên liệu");
            // }
        }
        
        if (frm.doc.workflow_state === "Nháp" && !frm.doc.plan) {
            return new Promise((resolve, reject) => {
                frappe.dom.unfreeze()
                frappe.confirm(
                    __("Phát hiện LSX Tuần này là phiên bản bị trả về. Bạn có muốn tạo Phương án KHSX mới cho LSX Tuần này không?"),
                    async () => {
                        const response = await frappe.call({method: "tahp.api.wwo_generate"});
                        if (response.plan) {
                            frm.set_value("plan", response.plan);
                            await frm.save();
                        }
                        resolve()
                    },
                    () => reject("Người dùng từ chối tạo KHSX mới") 
                );
            });
            return;
        }
    },
    after_workflow_action: async function(frm) {
        if (frm.doc.workflow_state === "Đợi GĐ duyệt" && frm.doc.plan) {
            await notify_role(
                "Giám đốc",
                `Kế hoạch sản xuất ${frm.doc.plan} đã được cập nhật. Giám đốc vui lòng vào kiểm tra`,
                "WWO Plan",
                frm.doc.plan
            );
        } else if (frm.doc.workflow_state === "Đợi PTCN Duyệt") {
            await notify_role(
                "Phát triển công nghệ",
                `LSX Tuần ${frm.doc.name} đang cần PTCN xét duyệt công nghệ`,
                "Week Work Order",
                frm.doc.name
            );
        } else if (frm.doc.workflow_state === "Đã được PTCN duyệt") {
            await notify_role(
                "Kế hoạch sản xuất",
                `LSX Tuần ${frm.doc.name} đã được xét duyệt công nghệ, vui lòng kiểm tra trước khi trình GĐ`,
                "Week Work Order",
                frm.doc.name
            );
        } else if (frm.doc.workflow_state === "Nháp") {
            await notify_role(
                "Kế hoạch sản xuất",
                `LSX Tuần ${frm.doc.name} bị trả về`,
                "Week Work Order",
                frm.doc.name
            );
        }
    }
});

frappe.ui.form.on('Week Work Order Item', {
    item: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.bom = null;

        // if (row.item) {
        //     try {
        //         let res = await frappe.db.get_value("Item", row.item, "custom_scrap");
        //         if (res && res.message && res.message.custom_scrap == 1) {
        //             row.scrap = 1;
        //         } else {
        //             row.scrap = 0;
        //         }
        //         frm.refresh_field('items');
        //     } catch (err) {
        //         console.error(err);
        //     }
        // }
        frm.refresh_field('item');
        validate_roles(frm);
    },

    planned_start_time: function(frm, cdt, cdn) {
        validate_dates(cdt, cdn);
    },

    planned_end_time: function(frm, cdt, cdn) {
        validate_dates(cdt, cdn);
    },
    
    bom: async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (
            // row.scrap != 1 &&
            frm.doc.workflow_state === "Đợi PTCN Duyệt" &&
            frm.selected_workflow_action !== "Trả về KHSX" &&
            row.bom
        ) {
            let res = await frappe.db.get_value("BOM", row.bom, "item");
            if (!res || res.message.item !== row.item) {
                frappe.model.set_value(cdt, cdn, "bom", null);
                frappe.dom.unfreeze();
                frappe.throw(
                    __(`BOM của dòng ${row.idx} không khớp với mặt hàng "${row.item}"`)
                );
            }
        }
        
        if (frm.doc.workflow_state === "Đã được PTCN duyệt" && !row.bom) {
            frappe.model.set_value(cdt, cdn, 'bom', row.__original_bom || '');
        }
    },
});

function show_duplicate(frm) {
    if (!frm.doc.plan || frm.is_new()) return;
    if (!frappe.user_roles.includes('Kế hoạch sản xuất')) return;
    // if (frm.doc.workflow_state === "Nháp" || frm.doc.workflow_state === "Đã được PTCN duyệt") {
    if (frm.doc.docstatus == 0) {    
        frm.add_custom_button('Thêm Phương Án LSX', function() {
            const new_doc = frappe.model.copy_doc(frm.doc);

            // Reset trạng thái
            new_doc.workflow_state = 'Nháp';
            new_doc.status = 'Draft';

            frappe.show_alert('Thêm LSX Tuần cho kế hoạch thành công');
            frappe.set_route('Form', new_doc.doctype, new_doc.name);
        });
        
        frm.add_custom_button('Xem tất cả Phương Án', function() {
            frappe.route_options = {
                plan: frm.doc.plan
            };
            frappe.set_route('List', 'Week Work Order');
        });
    }
    
}

function hide_function(frm, value) {
    frm.set_df_property('items', 'cannot_add_rows', value);
    frm.set_df_property('items', 'cannot_delete_rows', value);
    frm.set_df_property('items', 'cannot_delete_all_rows', value);
}

function validate_roles(frm) {
    const state = frm.doc.workflow_state;
    frm.set_df_property('plan','read_only',1);
    const item_fields = [
        'item',
        'bom',
        'qty',
        'uom',
        'planned_start_time',
        'planned_end_time'
    ];

    let locked_fields = [];
    let unlocked_fields = [];
    if (frm.is_new()) {
        locked_fields = ['bom','uom'];
    }
    if (state === "Nháp") {
        locked_fields = ['bom','uom'];
        if (!frm.is_new()) frm.set_df_property('plan','read_only',0);
        if (frappe.user_roles.includes('Kế hoạch sản xuất')) {
            hide_function(frm, false);
        }
        $('.btn-open-row').each(function() {
            const $btn = $(this);
            $btn.empty()
        });
    } else if (state === "Đợi PTCN Duyệt") {
        if (frappe.user_roles.includes('Phát triển công nghệ')) {
            locked_fields = item_fields;
            $('.btn-open-row').each(function() {
                const $btn = $(this);
            
                // Xóa nội dung cũ và thêm icon search
                $btn.empty().append(`
                    <a style="cursor:pointer;">
                        <svg class="icon" aria-hidden="true" style="width:20px; height:20px;">
                            <use href="#icon-search"></use>
                        </svg>
                    </a>
                `);
            
                // Tooltip
                $btn.attr('data-original-title', 'Tìm BOM');
            
                // Gán click cho toàn bộ btn-open-row
                $btn.off('click').on('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
            
                    const $row = $btn.closest('.grid-row');
                    const rowIdx = $row.attr('data-idx');
                    const frm = cur_frm;
                    const rowData = frm.doc.items.find(r => r.idx == rowIdx);
            
                    // Mở report BOM Search với item tương ứng
                    frappe.set_route('query-report', 'BOM Custom Search', {
                        week_work_order: frm.doc.name,
                        item_code: rowData.item
                    });
                });
            });
            const grid = frm.fields_dict.items.grid;

            item_fields.forEach(fieldname => {
                grid.update_docfield_property('bom', 'only_select', 1);
            });
            
        } else {
            locked_fields = item_fields
        }
        hide_function(frm, true);
    } else if (state === "Đã được PTCN duyệt") {
        if (frappe.user_roles.includes('Kế hoạch sản xuất')) {
            locked_fields = ['bom','uom','item'];
            unlocked_fields = ['bom']
        } else {
            locked_fields = item_fields
        }
        hide_function(frm, true);
        $('.btn-open-row').each(function() {
            const $btn = $(this);
            $btn.empty()
        });
    } else if (state === "Đợi GĐ duyệt") {
        locked_fields = item_fields.slice();
        hide_function(frm, true);
        $('.btn-open-row').each(function() {
            const $btn = $(this);
            $btn.empty()
        });
    }

    const grid = frm.fields_dict.items.grid;

    // 1. Reset - Mở khóa toàn bộ: read_only = 0, pointer-events = auto
    item_fields.forEach(fieldname => {
        grid.update_docfield_property(fieldname, 'read_only', 0);
    });
    grid.wrapper.find('.grid-row').each(function () {
        const $row = $(this);
        item_fields.forEach(fieldname => {
            $row.find(`[data-fieldname="${fieldname}"]`).css({
                'pointer-events': 'auto',
                'opacity': 1
            });
        });
    });

    // 2. Áp dụng khóa cho các field cần
    locked_fields.forEach(fieldname => {
        grid.update_docfield_property(fieldname, 'read_only', 1);
    });
    grid.wrapper.find('.grid-row').each(function () {
        const $row = $(this);
        locked_fields.forEach(fieldname => {
            if (unlocked_fields.includes(fieldname)) {
                $row.find(`[data-fieldname="${fieldname}"]`).off('mouseenter mouseleave click');
                return;
            }
            
            $row.find(`[data-fieldname="${fieldname}"]`).css({
                'pointer-events': 'none',
                'opacity': 0.7 // Optional: hiệu ứng mờ
            });
        });
    });
}

function validate_dates(cdt, cdn) {
    let row = locals[cdt][cdn];
    // if (row.scrap == 1) {
    //     return;
    // }
    let today = frappe.datetime.get_today();

    let start = row.planned_start_time;
    let end = row.planned_end_time;

    // // Nếu có ngày bắt đầu
    // if (start) {
    //     if (start < today) {
    //         frappe.msgprint(__('Không được chọn ngày trong quá khứ'));
    //         frappe.model.set_value(cdt, cdn, 'planned_start_time', null);
    //         return;
    //     }
    // }

    // // Nếu có ngày kết thúc
    // if (end) {
    //     if (end < today) {
    //         frappe.model.set_value(cdt, cdn, 'planned_end_time', null);
    //         frappe.msgprint(__('Không được chọn ngày trong quá khứ'));
    //         return;
    //     }
    // }

    // Nếu cả hai đều có
    if (start && end) {
        let start_obj = frappe.datetime.str_to_obj(start);
        let end_obj = frappe.datetime.str_to_obj(end);

        if (end_obj < start_obj) {
            frappe.model.set_value(cdt, cdn, 'planned_end_time', null);
            frappe.model.set_value(cdt, cdn, 'planned_start_time', null);
            frappe.msgprint(__('Dự kiến hoàn thành phải sau dự kiến bắt đầu'));
            return;
        }
    }
}

async function notify_role(role, subject, document_type, document_name) {
    await frappe.call({ method: "tahp.api.wwo_notify", args: { role, subject, document_type, document_name },});
}

function missing_material(messages) {
    let table = `
        <table class="table table-bordered" style="width: 100%; margin-top: 10px">
            <thead>
                <tr>
                    <th>Mã nguyên liệu</th>
                    <th>Tên nguyên liệu</th>
                    <th>SL đang cần</th>
                    <th>Thiếu</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let row of messages) {
        table += `
            <tr>
                <td>${row.nguyen_lieu}</td>
                <td>${row.item_name || ""}</td>
                <td>${row.required}</td>
                <td><span style="color:red">${row.missing}</span></td>
            </tr>
        `;
    }

    table += "</tbody></table>";
    return table;
}

async function open_create_shift_dialog(frm) {
    const detail_rows = frm.doc.items || [];

    if (detail_rows.length === 0) {
        return;
    }

    const options = detail_rows
        .map((row, idx) => ({
            label: `Mặt hàng: ${idx + 1}: ${row.item || row.bom}`,
            value: row.name
        }));

    const dialog = new frappe.ui.Dialog({
        title: 'Tạo LSX Ca mới',
        size: 'extra-large',
        fields: [
            {
                label: 'Chọn mã hàng muốn sản xuất',
                fieldname: 'selected_row',
                fieldtype: 'Select',
                options: options,
                reqd: 1,
                onchange: function() {
                    const selected = dialog.get_value('selected_row');
                    const row = detail_rows.find(r => r.name === selected);
                    const produced = Number(row.got_qty || 0);
                    const planned = Number(row.pl_qty || 0);
                    const original_qty = Number(row.qty || 0);
                    const remaining_qty = Math.max(original_qty - produced - planned, 0);
                    
                    if (row) {
                        dialog.set_value('bom', row.bom);
                        dialog.set_value('item', row.item);
                        dialog.set_value('qty', remaining_qty);
                        dialog.set_value('note', row.note);
                        dialog.set_value('planned_start_time', row.planned_start_time);
                        dialog.set_value('produced_qty', row.got_qty || 0);
                        dialog.set_value('planned_qty', row.pl_qty || 0);
                    }
                }
            },

            { fieldname: 'section1', fieldtype: 'Section Break', label: '' },

            { fieldname: 'bom', label: 'Công thức sản xuất', fieldtype: 'Data' },
            { fieldname: 'item', label: 'Mã hàng', fieldtype: 'Data' },
            { fieldname: 'qty', label: 'Chọn số lượng thành phẩm', fieldtype: 'Float' },
            { fieldname: 'produced_qty', label: 'Tiến độ hiện tại: SL đã sản xuất xong', fieldtype: 'Float', read_only: 1 },
            { fieldname: 'planned_qty', label: 'Tiến độ hiện tại: SL đã lên lịch sản xuất', fieldtype: 'Float', read_only: 1 },

            { fieldname: 'col_break_1', fieldtype: 'Column Break' },
            { fieldname: 'worker_qty', label: 'Số lượng công nhân', fieldtype: 'Int' },
            { fieldname: 'planned_start_time', label: 'Ngày dự kiến thực hiện', fieldtype: 'Date' },
            { fieldname: 'shift', label: 'Ca', fieldtype: 'Link', options: 'Shift', reqd: 1 },
            { fieldname: 'shift_leader', label: 'Trưởng ca', fieldtype: 'Link', options: 'Employee', reqd: 1 },
            
            { fieldname: 'col_break_2', fieldtype: 'Column Break' },
            { fieldname: 'note', label: 'Ghi chú', fieldtype: 'Text' },
        ],
        primary_action_label: 'Đồng ý',
        primary_action: async function(values) {
            const row = detail_rows.find(r => r.name === values.selected_row);
            const original_qty = Number(row.qty || 0);
            const planned = Number(row.pl_qty || 0);
            const produced = Number(row.got_qty || 0);
            const remaining = original_qty - planned - produced;
            const input_qty = Number(values.qty || 0);
        
            if (input_qty === 0) {
                frappe.msgprint({
                    title: 'Số lượng không hợp lệ',
                    message: `Không được điền giá trị 0 cho số lượng của LSX Ca`,
                    indicator: 'red'
                });
                return;
            }
        
            if (input_qty > remaining) {
                frappe.msgprint({
                    title: 'Số lượng vượt mức cho phép',
                    message: `Theo kế hoạch, chỉ cần sản xuất thêm ${remaining} mặt hàng.`,
                    indicator: 'red'
                });
                return;
            }
        
            if ((planned + produced) >= original_qty) {
                frappe.msgprint({
                    title: 'Thông báo',
                    message: 'Mặt hàng này đã được lên kế hoạch hoặc đã sản xuất đủ số lượng cần thiết',
                    indicator: 'blue'
                });
                return;
            }
        
            dialog.hide();
        
            try {
                const bom_res = await frappe.call({
                    method: 'frappe.client.get',
                    args: {
                        doctype: 'BOM',
                        name: values.bom
                    }
                });
        
                const bom_doc = bom_res.message;
                const operations = await Promise.all(
                    bom_doc.operations.map(async (op) => {
                        const operation_doc = await frappe.db.get_doc('Operation', op.operation);
                        let custom_employee = null;
                        if (operation_doc.custom_team && operation_doc.custom_team.length === 1) custom_employee = operation_doc.custom_team[0].employee
                        return {
                            operation: op.operation,
                            workstation: op.workstation,
                            time_in_mins: op.time_in_mins,
                            sequence_id: op.sequence_id,
                            custom_employee: custom_employee,
                        };
                    })
                );
    
                const wo_doc = {
                    doctype: 'Work Order',
                    production_item: values.item,
                    bom_no: values.bom,
                    qty: values.qty,
                    planned_start_date: values.planned_start_time,
                    planned_end_date: values.planned_start_time,
                    custom_note: values.note,
                    custom_shift: values.shift,
                    custom_shift_leader: values.shift_leader,
                    custom_plan: frm.doc.name,
                    custom_employee_count: values.worker_qty,
                    custom_plan_code: values.selected_row,
                    operations: operations
                };
                
                const wo_res = await frappe.call({
                    method: 'frappe.client.insert',
                    args: { doc: wo_doc }
                });
                frm.reload_doc();
            } catch (err) {
                console.log(err)
            }
        }
    });

    dialog.show();
}

async function update_quantity(frm) {
    if (frm.doc.workflow_state !==  "Duyệt xong") return;
    if (frm.doc.items.length === 0) return;
    const detail_rows = frm.doc.items;
    frm.doc.wo_detail = [];
    
    for (const row of detail_rows) {
        const work_orders = await frappe.db.get_list('Work Order', {
            filters: [
                ['custom_plan_code', '=', row.name],
                ['docstatus', '!=', 2]
            ],
            fields: ['name', 'production_item', 'qty', 'produced_qty', 'planned_start_date', 'custom_shift']
        });
                    
        const total_produced = work_orders.reduce((sum, wo) => sum + (wo.produced_qty || 0), 0);
        const total_scheduled_not_started = work_orders
            .filter(wo => (wo.produced_qty === 0))
            .reduce((sum, wo) => sum + (wo.qty || 0), 0);
    
        row.got_qty = total_produced;
        row.pl_qty = total_scheduled_not_started;
        
        for (const wo of work_orders) {
            frm.doc.wo_detail.push({
                doctype: "Week Work Order Item 2",
                parentfield: "wo_detail",
                parenttype: frm.doc.doctype,
                parent: frm.doc.name,
                wo: wo.name,
                item: wo.production_item,
                qty: wo.qty,
                planned_start_time: wo.planned_start_date,
                shift: wo.custom_shift
            });
        }
    }
    
    frm.refresh_field("wo_detail");
    frm.fields_dict['items'].grid.refresh();
    if (frm.doc.docstatus === 1) {
        const has_incomplete_row = (frm.doc.items || []).some(row => (row.got_qty || 0) < (row.qty || 0));
        if (has_incomplete_row) {
            frm.add_custom_button('Tạo LSX Ca', () => open_create_shift_dialog(frm)).addClass("btn-primary");
        }
    }
}

frappe.views.calendar["Week Work Order"] = {
    field_map: {
        "start": "calendar_start_date",
        "end": "calendar_end_date",
        "id": "name",
        "title": "name",  // hoặc "name", hoặc kế hoạch sản xuất
        "allDay": 1  // hoặc true nếu bạn không dùng giờ
    },
    options: {
        filters: [
            {
                fieldname: "workflow_state",
                fieldtype: "Select",
                options: ["Nháp", "Chờ duyệt", "Đã duyệt", "Hoàn thành"],
                label: __("Trạng thái")
            }
        ]
    }
};