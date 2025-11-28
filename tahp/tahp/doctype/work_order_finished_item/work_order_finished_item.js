frappe.ui.form.on("Work Order Finished Item", {
    refresh: function(frm) {
        frm.fields_dict.items.grid.wrapper.find(".row-check").hide();
        frm.fields_dict.items.grid.wrapper.find(".row-index").hide();
    
        if (!frm.doc.item_code) return;
        if (frm.doc.type_posting !== "Thành phẩm") return;

        frappe.db.get_value("Item", frm.doc.item_code, "variant_of")
            .then(r => {
                let variant_of = r.message.variant_of;
                let template = variant_of || frm.doc.item_code;
                if (template) {
                    frm.set_query("item_code_new", function() {
                        return {
                            filters: {
                                variant_of: template
                            }
                        };
                    });
                } else {
                    frm.set_query("item_code_new", null);
                }
            });

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button("Cập nhật thành phẩm", async function () {     
                frm.events.update_finished_items(frm)      
            }).addClass('btn-primary')

            const $wrapper = $(frm.fields_dict.wrapper.wrapper);
            $wrapper.empty();
            const $btn = $(`
                <button 
                    class="btn btn-default btn-primary ellipsis w-100 d-md-none mb-3 py-2"
                    style="font-weight: 500;"
                >
                   Cập nhật thành phẩm
                </button>
            `).on("click", async () => {frm.events.update_finished_items(frm)});
            $wrapper.append($btn);
        }
    },

    update_finished_items: async function(frm) {
        let stock_uom = await frappe.db.get_value("Item", frm.doc.item_code, "stock_uom")

        let d = new frappe.ui.Dialog({
            title: "Cập nhật thành phẩm cho LSX Ca",
            size: "small",
            fields: [
                {
                    fieldname: "attribute",
                    fieldtype: "Link",
                    options: "Item Attribute",
                    default: "Đặc tính",
                    label: "Tìm các mặt hàng dựa theo điểm chung",
                    change: async () => {
                        d.fields_dict.items.df.data = []
                        let res = await frappe.xcall("tahp.tahp.doctype.work_order_finished_item.work_order_finished_item.get_finished_items", {item_code: frm.doc.item_code, qty: frm.doc.actual_qty, attribute: d.get_value("attribute")})
                        if (res && res.length) {
                            d.fields_dict.items.df.data = res.map(r => ({
                                item_code: r.item_code,
                                item_name: r.item_name,
                                qty: r.qty
                            }));
                            d.fields_dict.items.grid.refresh();
                        }
                        d.wrapper.find('.row-check').hide()
                        cleanerTable(d)     
                    }
                },
                {
                    fieldname: "stock_uom",
                    fieldtype: "Data",
                    default: stock_uom.message.stock_uom,
                    read_only: 1,
                    label: "Đơn vị của thành phẩm"
                },
                {
                    fieldname: "items",
                    fieldtype: "Table",
                    cannot_add_rows: true,
                    in_place_edit: true,
                    fields: [
                        { label: "Mã SP", fieldname: 'item_code', fieldtype: 'Data', in_list_view: 1, columns: 3},
                        { label: 'Tên SP', fieldname: 'item_name', fieldtype: 'Data', in_list_view: 1, columns: 6 },
                        { label: 'SL', fieldname: 'qty', fieldtype: 'Float', in_list_view: 1, columns: 1 },
                    ]
                }
            ],
            primary_action_label: "Cập nhật",
            primary_action: async () => {
                const items = d.get_value("items")
                const totalQty = items.reduce((sum, row) => {
                    return sum + (parseFloat(row.qty) || 0)
                }, 0)
                if (totalQty != frm.doc.actual_qty) frappe.throw("Tổng sản lượng điền không được khác so với sản lượng đã chốt trước đó")

                await frappe.xcall("tahp.tahp.doctype.work_order_finished_item.work_order_finished_item.process_finished_items", {doc_name: frm.doc.name, items: d.get_value("items")})
                frappe.msgprint("Cập nhật thành phẩm thành công")
                d.hide();
            }
        })

        let res = await frappe.xcall("tahp.tahp.doctype.work_order_finished_item.work_order_finished_item.get_finished_items", {item_code: frm.doc.item_code, qty: frm.doc.actual_qty, attribute: d.get_value("attribute")})
        d.fields_dict.items.df.data = []
        if (res && res.length) {
            d.fields_dict.items.df.data = res.map(r => ({
                item_code: r.item_code,
                item_name: r.item_name,
                qty: r.qty
            }));
            d.fields_dict.items.grid.refresh();
        }
        d.wrapper.find('.row-check').hide();
        cleanerTable(d)
        d.show()
    }
});

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