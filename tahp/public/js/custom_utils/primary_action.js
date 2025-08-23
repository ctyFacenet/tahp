/**
 * Ghi đè nút tạo bản ghi trong ListView thành 1 nút mới
 */
frappe.custom_utils_primary_action = (listview, label, action) => {
    
    const check_actions = function() {
        requestAnimationFrame(() => {
            const selected = listview.get_checked_items();
            if (selected.length === 0) {
                listview.page.set_primary_action(label, action);
            }
        });
    };

    listview.page.clear_primary_action();
    
    requestAnimationFrame(() => {
        listview.page.set_primary_action(label, action);
    });

    $('.list-row-checkbox').off('change.custom_primary').on('change.custom_primary', check_actions);
    $('.level-item.list-check-all').off('change.custom_primary').on('change.custom_primary', check_actions);
};