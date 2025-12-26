// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Custom Budget", {
	refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button('Điều chỉnh ngân sách', function() {
                show_addjust_budget_dialog(frm);
            }).addClass("btn-primary");
        }
	},
});

function show_addjust_budget_dialog(frm) {
    let dialog = new frappe.ui.Dialog({
        title: 'Điều chỉnh ngân sách',
        fields: [
            {
                fieldname: 'section_input',
                fieldtype: 'Section Break',
                label: __('Thông Tin điều chỉnh')
            },
            {
                fieldname: 'adjust',
                label: __('Điều chỉnh'),
                fieldtype: 'Select',
                options: [
                    'Chi tiêu bên ngoài',
                    'Tăng ngân sách'
                ],
                default: 'Chi tiêu bên ngoài',
                reqd: 1,
                onchange: function() {
                    update_budget_calculations(dialog, frm);
                }
            },
            {
                fieldname: 'column_break_1',
                fieldtype: 'Column Break'
            },
            {
                fieldname: 'amount',
                label: __('Số tiền điều chỉnh'),
                fieldtype: 'Currency',
                default: 0,
                onchange: function() {
                    update_budget_calculations(dialog, frm);
                }
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'section_input_2',
                label: __('Ngân sách sau điều chỉnh')
            },
            {
                fieldname: 'original_budget',
                label: __('Ngân sách ban đầu'),
                read_only: 1,
                fieldtype: 'Currency',
                default: frm.doc.initial_budget,
            },
            {
                fieldname: 'planned_amount',
                label: __('Dự kiến chi tiêu'),
                fieldtype: 'Currency',
                read_only: 1,
                default: frm.doc.planned_amount
            },
            {
                fieldname: 'actual_amount',
                label: __('Đã chi tiêu'),
                fieldtype: 'Currency',
                read_only: 1,
                default: frm.doc.actual_amount
            },
            {
                fieldname: 'increased_amount',
                label: __('Đã được cấp thêm'),
                fieldtype: 'Currency',
                read_only: 1,
                default: frm.doc.increased_amount
            },
            {
                fieldname: 'column_break_2',
                fieldtype: 'Column Break'
            },
            {
                fieldname: 'planned_total',
                label: __('Tổng dự kiến'),
                fieldtype: 'Currency',
                read_only: 1,
                bold: 1,
                default: frm.doc.total_planned_amount
            },
            {
                fieldname: 'actual_total',
                label: __('Tổng thực tế'),
                fieldtype: 'Currency',
                read_only: 1,
                bold: 1,
                default: frm.doc.total_actual_amount
            }
        ],
        primary_action_label: 'Xác nhận',
        primary_action: async function(values) {
            await handle_budget_adjustment(frm, values, dialog);
        }
    });

    dialog.show();
}

function update_budget_calculations(dialog, frm) {
    const adjust_type = dialog.get_value('adjust');
    const adjust_amount = dialog.get_value('amount') || 0;

    const initial_budget = frm.doc.initial_budget || 0;
    const planned_amount = frm.doc.planned_amount || 0;
    const actual_amount = frm.doc.actual_amount || 0;
    const increased_amount = frm.doc.increased_amount || 0;

    let new_planned_amount = planned_amount;
    let new_actual_amount = actual_amount;
    let new_increased_amount = increased_amount;

    if (adjust_type === 'Chi tiêu bên ngoài') new_actual_amount += adjust_amount;
    else if (adjust_type === 'Tăng ngân sách') new_increased_amount += adjust_amount;

    const total_budget = initial_budget + new_increased_amount;
    const planned_total = total_budget - new_planned_amount - new_actual_amount;
    const actual_total = total_budget - new_actual_amount;

    dialog.set_value('planned_amount', new_planned_amount);
    dialog.set_value('actual_amount', new_actual_amount);
    dialog.set_value('increased_amount', new_increased_amount);

    dialog.set_value('planned_total', planned_total);
    dialog.set_value('actual_total', actual_total);
}


async function handle_budget_adjustment(frm, values, dialog) {
    const adjust_amount = values.amount;
    
    if (!adjust_amount || adjust_amount <= 0) {
        frappe.msgprint(__('Số tiền điều chỉnh phải lớn hơn 0'));
        return;
    }
    
    const adjustment_type = (values.adjust === 'Chi tiêu bên ngoài') ? 'Giảm' : 'Tăng';
    
    const response = await frappe.call({
        method: 'tahp.pms.doctype.custom_budget.custom_budget.process_budget_adjustment',
        args: {
            budget_name: frm.doc.name,
            adjustment_type: adjustment_type,
            adjust_amount: adjust_amount,
            account: frm.doc.account
        }
    });
    
    if (response.message && response.message.success) {
        dialog.hide();
        frappe.show_alert({
            message: __('Điều chỉnh ngân sách thành công'),
            indicator: 'green'
        });
    }
}