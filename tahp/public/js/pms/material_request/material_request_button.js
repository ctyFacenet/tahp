frappe.ui.form.on("Material Request", {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button('Tạo trình duyệt mua hàng', function() {
                show_purchase_request_dialog(frm);
            }, __("Create"));
        }
    }
})

function show_purchase_request_dialog(frm) {
    let dialog = new frappe.ui.Dialog({
        title: 'Tạo trình duyệt mua hàng',
        fields: [
            {
                fieldname: 'supplier',
                label: 'Nhà cung cấp',
                fieldtype: 'Link',
                options: 'Supplier',
                reqd: 1
            },
            {
                fieldname: 'material_request_type',
                label: 'Lý do',
                fieldtype: 'Select',
                default: frm.doc.material_request_type,
                read_only: 1,
            },
            {
                fieldname: 'payment_method',
                label: 'Phương thức thanh toán',
                fieldtype: 'Select',
                options: [
                    "Chuyển khoản",
                    "Tiền mặt"
                ],
                reqd: 1
            },
            {
                fieldname: 'payment_note',
                label: 'Thời hạn thanh toán',
                fieldtype: 'Link',
                options: 'Custom Payment Note',
                reqd: 1
            },
            {
                fieldname: 'delivery_address',
                label: 'Địa chỉ giao hàng',
                fieldtype: 'Link',
                options: 'Address',
                reqd: 1,
            },
            {
                fieldname: 'delivery_note',
                label: 'Thời gian giao hàng',
                fieldtype: 'Link',
                options: 'Custom Delivery Note',
                reqd: 1,
            },
            {
                fieldname: 'delivery_amount_note',
                label: 'Chi phí vận chuyển',
                fieldtype: 'Link',
                options: 'Custom Delivery Cost',
                reqd: 1,
            },
            {
                fieldname: 'items',
                label: 'Mặt hàng',
                fieldtype: 'Table',
                cannot_add_rows: true,
                cannot_delete_rows: false,
                fields: [
                    {
                        fieldname: 'item_code',
                        label: 'Mã mặt hàng',
                        fieldtype: 'Link',
                        options: 'Item',
                        in_list_view: 1,
                        reqd: 1
                    },
                    {
                        fieldname: 'item_name',
                        label: 'Tên mặt hàng',
                        fieldtype: 'Data',
                        in_list_view: 1,
                        reqd: 1
                    },
                    {
                        fieldname: 'qty',
                        label: 'Số lượng',
                        fieldtype: 'Float',
                        in_list_view: 1,
                        reqd: 1
                    },
                    {
                        fieldname: 'uom',
                        label: 'Đơn vị',
                        fieldtype: 'Link',
                        options: 'UOM',
                        in_list_view: 1
                    },
                ],
                data: frm.doc.items.map(item => ({
                    item_code: item.item_code,
                    item_name: item.item_name,
                    qty: item.qty,
                    uom: item.uom,
                }))
            }
        ],
        primary_action_label: 'Xác nhận',
        primary_action: async function(values) {
            console.log(values);
            try {
                dialog.disable_primary_action();

                const purchase_approval = await create_purchase_approval(
                    frm.doc.name,
                    values.supplier,
                    values.items,

                    values.payment_method,
                    values.payment_note,
                    values.delivery_address,
                    values.delivery_note,
                    values.delivery_amount_note,
                );

                dialog.hide();

                frappe.show_alert({
                    message: `Đã tạo trình duyệt mua hàng: ${purchase_approval.name}`,
                    indicator: 'green'
                }, 5);
            } catch (error) {
                frappe.show_alert({
                    message: error.message || 'Có lỗi xảy ra',
                    indicator: 'red'
                }, 5);
                dialog.enable_primary_action();
            }
        }
    });

    dialog.show()
}

async function create_purchase_approval(material_request, supplier, items, payment_method, payment_note, delivery_address, delivery_note, delivery_amount_note) {
    const response = await frappe.call({
        method: 'tahp.pms.doc_events.material_request.material_request_button.create_purchase_approval',
        args: {
            material_request: material_request,
            supplier: supplier,
            items: items,

            payment_method: payment_method,
            payment_note: payment_note,
            delivery_address: delivery_address,
            delivery_note: delivery_note,
            delivery_amount_note: delivery_amount_note
        }
    });

    if (!response.message) {
        throw new Error('Cannot create purchase approval');
    }

    return response.message;
}
