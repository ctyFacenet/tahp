frappe.ui.form.on("Purchase Order", {
    refresh: function(frm) {
        frm.set_intro("")
        // setTimeout(() => {
        //     frm.remove_custom_button(__("Update Items"));
        //     frm.remove_custom_button("Hold", "Status");
        //     frm.remove_custom_button("Close", "Status");
        //     frm.remove_custom_button("Purchase Receipt", "Create New");
        //     frm.remove_custom_button("Purchase Invoice", "Create New");
        //     frm.remove_custom_button("Payment", "Create New");
        //     frm.remove_custom_button("Payment Request", "Create New");
        // }, 50);

        if (frm.doc.docstatus !== 1) return
        frm.add_custom_button("Chi tiết giao hàng", async () => frm.events.purchase_receipt_dialog(frm), "Cập nhật");
        frm.add_custom_button("Phiếu kiểm tra", () => {}, "Cập nhật");
        frm.add_custom_button("Thông tin thanh toán", () => {openPaymentDialog(frm)}, "Cập nhật");
        frm.page.set_inner_btn_group_as_primary(__("Cập nhật"));
    },

    purchase_receipt_dialog: async function (frm) {
        const data = await frappe.xcall(
            "tahp.doc_events.purchase_order.purchase_order.get_purchase_receipts",
            { purchase_order: frm.doc.name }
        ) || [];

        let table_html = `
            <table class="table table-bordered">
                <thead style="background:#eef2f6; font-weight:600">
                    <tr>
                        <th>Mã PR</th>
                        <th>Ngày nhận dự kiến</th>
                        <th>Ngày nhận thực tế</th>
                        <th style="width:160px">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(pr => {
            table_html += `
                <tr style="background:#f9fafb">
                    <td><b>${pr.name}</b></td>
                    <td>${frappe.datetime.str_to_user(pr.custom_schedule_date)}</td>
                    <td>${frappe.datetime.str_to_user(pr.custom_actual_date)}</td>
                    <td>${__(pr.status)}</td>
                </tr>

                <tr>
                    <td colspan="4" style="padding-left:30px;padding-block:0;padding-right:0;">
                        <table class="table table-sm" style="margin:0;margin-bottom:25px;">
                            <thead>
                                <tr>
                                    <th>Mã hàng</th>
                                    <th>Tên hàng</th>
                                    <th>SL nhận</th>
                                    <th>SL đạt</th>
                                    <th>SL không đạt</th>
                                    <th>ĐVT</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            (pr.items || []).forEach(item => {
                table_html += `
                    <tr>
                        <td>${item.item_code}</td>
                        <td>${item.item_name}</td>
                        <td>${item.qty || 0}</td>
                        <td>${item.received_qty || 0}</td>
                        <td>${item.rejected_qty || 0}</td>
                        <td>${item.uom}</td>
                    </tr>
                `;
            });

            table_html += `
                            </tbody>
                        </table>
                    </td>
                </tr>
            `;
        });

        table_html += `
                </tbody>
            </table>
        `;

        const dialog = new frappe.ui.Dialog({
            title: "Danh sách Phiếu nhập kho (Purchase Receipt)",
            size: "large",
            fields: [
                {
                    fieldname: "pr_table",
                    fieldtype: "HTML",
                    options: table_html
                },
                {
                    fieldname: "create_plan_btn",
                    fieldtype: "HTML",
                    options: `
                        <div style="text-align:right; margin-top:10px">
                            <button class="btn btn-primary" id="create-delivery-plan">
                                Tạo kế hoạch giao hàng
                            </button>
                        </div>
                    `
                }
            ]
        });

        dialog.show();

        dialog.$wrapper.on("click", "#create-delivery-plan", async () => {
            frappe.model.open_mapped_doc({
                method: "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt",
                frm: cur_frm,
                freeze_message: __("Creating Purchase Receipt ..."),
            });
        });
    }
})


function openPaymentDialog(frm) {
    const totalAmount = frm.doc.custom_total_amount || 0;

    const dialog = new frappe.ui.Dialog({
        title: "Thông tin thanh toán",
        size: "extra-large",
        fields: [
            {
                fieldname: "payments",
                fieldtype: "Table",
                label: "Chi tiết thanh toán",
                cannot_add_rows: false,
                in_place_edit: true,
                data: frm.doc.custom_payment,
                fields: [
                    {
                        fieldname: "from_time",
                        label: "Từ ngày",
                        fieldtype: "Date",
                        in_list_view: 1,
                        default: "Today"
                    },
                    {
                        fieldname: "payment_type",
                        label: "Loại thanh toán",
                        fieldtype: "Select",
                        options: [
                            "Tạm ứng",
                            "Thanh toán toàn bộ đơn hàng",
                            "Thanh toán một phần đơn hàng"
                        ],
                        in_list_view: 1
                    },
                    {
                        fieldname: "percent",
                        label: "Phần trăm",
                        fieldtype: "Percent",
                        in_list_view: 1
                    },
                    {
                        fieldname: "total",
                        label: "Tổng tiền",
                        fieldtype: "Currency",
                        read_only: 1,
                        in_list_view: 1
                    },
                    {
                        fieldname: "status",
                        label: "Trạng thái",
                        fieldtype: "Select",
                        options: ["Chờ thanh toán", "Đã thanh toán"],
                        in_list_view: 1,
                        default: "Chờ thanh toán"
                    }
                ]
            }
        ],
        primary_action_label: "Lưu",
        primary_action: async (values) => {
            const rows = values.payments || [];
            let totalPercent = 0;

            for (let r of rows) {
                let pct = flt(r.percent || 0);
                totalPercent += pct;
            }

            if (totalPercent > 100) {
                frappe.throw("Tổng phần trăm không được vượt quá 100%");
                return;
            }

            await frappe.call({
                method: "tahp.doc_events.purchase_order.purchase_order.update_payment_info",   // sửa theo path thực tế
                args: {
                    docname: frm.doc.name,
                    payment_rows: values.payments
                }
            });
            dialog.hide();
            frm.reload_doc();
        }
    });

    // dialog.fields_dict.payments.grid.wrapper.on("change", "input, select", function () {
    //     recalcPayments(dialog, totalAmount);
    // });

    dialog.show();
}

function recalcPayments(dialog, totalAmount) {
    const grid = dialog.fields_dict.payments.grid;
    const rows = dialog.get_value("payments") || [];

    let totalPercent = 0;

    rows.forEach((r, idx) => {
        let pct = flt(r.percent || 0);

        // Nếu percent > 100 → reset ngay tại chỗ
        if (pct > 100) {
            frappe.msgprint("Phần trăm không được vượt quá 100%");

            pct = 0;
            r.percent = 0;

            // Ép update luôn ô percent ở UI (DOM)
            const $input = grid.grid_rows[idx]?.grid_form
                ?.fields_dict?.percent?.$input;
            if ($input) $input.val(0);
        }

        // cập nhật lại total theo percent
        r.total = flt(totalAmount * (pct / 100));
        totalPercent += pct;
    });

    // Nếu tổng phần trăm vượt 100 → thông báo
    if (totalPercent > 100) {
        frappe.msgprint("Tổng phần trăm không được vượt quá 100%");
    }

    // refresh grid để hiển thị total mới
    grid.refresh();
}