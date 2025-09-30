frappe.ui.form.on("Item", {
    custom_is_meter: function(frm) {
        change_label(frm);
    },

    onload: function(frm) {
        change_label(frm);
    },

    stock_uom: function(frm) {
        change_label(frm);
    },

    refresh: function(frm) {
        frm.set_intro("");
        frm.clear_custom_buttons();
        if (frm.is_new()) return;
        frm.fields_dict["attributes"].grid.set_column_disp("attribute_value", true);
        frm.add_custom_button("Thêm nhanh mẫu mã cho mặt hàng", () => {
            erpnext.item.show_multiple_variants_dialog(frm);
        })
        frm.add_custom_button("Tạo mẫu mã mới", () => {
            erpnext.item.show_single_variant_dialog(frm);
        }).addClass('btn-primary')
    },
});

/**
 * Cập nhật nhãn của trường `custom_unit_per_reading`.
 *
 * - Nhãn hiển thị theo dạng: "1 số công tơ bằng bao nhiêu <stock_uom>?"
 * - Hàm này được gọi khi:
 *   - Mở form lần đầu (`onload`)
 *   - Thay đổi trường `custom_is_meter`
 *   - Thay đổi trường `stock_uom`
 */
function change_label(frm) {
    frm.set_df_property('custom_unit_per_reading', 'label', `1 số công tơ bằng bao nhiêu ${frm.doc.stock_uom}?`);
}
