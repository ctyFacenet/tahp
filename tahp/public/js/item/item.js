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
