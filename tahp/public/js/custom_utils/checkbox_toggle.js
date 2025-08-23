/**
 * Ẩn hoặc hiện các field khác trong Dialog dựa vào trạng thái của một checkbox.
 * Khi checkbox được click, các field target sẽ được toggle hiển thị.
 */
frappe.custom_utils_checkbox_toggle = (dialog, checkbox_field, target_fields, reversed = false) => {
    const checkbox = dialog.get_field(checkbox_field);
    const targets = Array.isArray(target_fields) ? target_fields : [target_fields];
    const target_objs = targets.map(fn => dialog.get_field(fn));

    if (reversed) {
        target_objs.forEach(target => {
            if (!target) return;
            target.wrapper.style.display = 'none';
        });
    }

    $(checkbox.input).off('click');
    $(checkbox.input).click(function() {
        let hide = $(this).is(':checked');
        target_objs.forEach(target => {
            if (!target) return;
            target.wrapper.style.display = hide ? 'none' : '';
        });
    });

}