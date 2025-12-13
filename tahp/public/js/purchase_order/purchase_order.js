frappe.ui.form.on("Purchase Order", {
    refresh: function(frm) {
        frm.set_intro("")
        const $wrapper = $(frm.fields_dict.custom_wrapper.wrapper);
        $wrapper.empty();
        const component = new tahp.ui.ReuseableTableComponent({
            wrapper: $wrapper, 
            frm: frm, 
            childTableName: "custom_detail", 
            totalFieldName: "total", 
            showIndex: true
        })
        setTimeout(() => {
            frm.remove_custom_button(__("Update Items"));
            frm.remove_custom_button("Hold", "Status");
            frm.remove_custom_button("Close", "Status");
            frm.remove_custom_button("Purchase Receipt", "Create New");
            frm.remove_custom_button("Purchase Invoice", "Create New");
            frm.remove_custom_button("Payment", "Create New");
            frm.remove_custom_button("Payment Request", "Create New");
        }, 50);
        frm.add_custom_button("Chi tiết giao hàng", () => {}, "Cập nhật");
        frm.add_custom_button("Phiếu kiểm tra", () => {}, "Cập nhật");
        frm.add_custom_button("Thông tin thanh toán", () => {openPaymentDialog(frm)}, "Cập nhật");
        frm.page.set_inner_btn_group_as_primary(__("Cập nhật"));
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
