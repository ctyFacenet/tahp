


frappe.pages['self-price-update'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Self Price Update',
        single_column: true
    });

    // Filter definitions (giống report)
    const filter_defs = [
        {fieldtype: "Link", label: "Mã mặt hàng", fieldname: "item_code", options: "Item"},
        {fieldtype: "Data", label: "Tên mặt hàng", fieldname: "item_name"},
        {fieldtype: "Link", label: "Nhóm mặt hàng", fieldname: "item_group", options: "Item Group"},
        {fieldtype: "Link", label: "Nhà cung cấp", fieldname: "supplier", options: "Supplier"},
        {fieldtype: "Data", label: "Xuất xứ", fieldname: "origin"}
    ];

    const filter_controls = {};
    const filter_area = $('<div class="flex" style="gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px"></div>').appendTo(page.main);

    filter_defs.forEach(df => {
        const control = frappe.ui.form.make_control({
            parent: filter_area,
            df: Object.assign({only_input: true, placeholder: df.label}, df),
            render_input: true
        });
        filter_controls[df.fieldname] = control;
    });

    const btn_filter = $('<button class="btn btn-primary">Lọc</button>').appendTo(filter_area);
    const btn_add = $('<button class="btn btn-success ml-2"><i class="fa fa-plus"></i> Thêm mới</button>').appendTo(filter_area);

    btn_add.on('click', () => frappe.new_doc('Supplier Item Rate'));

    const table_area = $('<div class="mt-4"></div>').appendTo(page.main);
    let datatable;

    function get_filters() {
        const filters = {};
        for (const key in filter_controls) {
            const val = filter_controls[key].get_value();
            if (val) filters[key] = val;
        }
        return filters;
    }

    function get_badge_html(text, color) {
        return `<span style="background:${color};color:#222;padding:2px 8px;border-radius:6px;font-size:12px;display:inline-block;">${text}</span>`;
    }

    function get_change_html(change) {
        if (change == null) return '';
        let color = change > 0 ? '#27ae60' : (change < 0 ? '#e74c3c' : '#888');
        let icon = change > 0 ? '↑' : (change < 0 ? '↓' : '');
        let sign = change > 0 ? '+' : '';
        return `<span style="color:${color};font-weight:bold;">${icon} ${sign}${change.toFixed(1)}%</span>`;
    }

    function get_edit_btn_html(name) {
        return `<button class="btn btn-xs btn-primary" onclick="frappe.set_route('Form', 'Supplier Item Rate', '${name}')">Sửa</button>`;
    }

    function get_icon_btn_html(type, name) {
        if (type === 'add') return `<span style="cursor:pointer" title="Thêm"><i class="fa fa-plus-circle"></i></span>`;
        if (type === 'chart') return `<span style="cursor:pointer" title="Biểu đồ"><i class="fa fa-line-chart"></i></span>`;
        return '';
    }

    function load_data() {
        frappe.call({
            method: 'tahp.tahp.page.self_price_update.self_price_update.get_data',
            args: {filters: get_filters()},
            callback: r => {
                const rows = r.message || [];
                // Tính toán các trường động
                const data = rows.map(row => {
                    // Badge màu nhóm
                    let group_color = '#d4f5dd';
                    let group_text = row.item_group || '';
                    if (group_text === 'Nguyên vật liệu chính' || group_text === 'Nguyên liệu chính') group_color = '#b6f3c1';
                    else if (group_text === 'Vật tư thay thế') group_color = '#ffe2c6';
                    else if (group_text === 'Bảo hộ lao động') group_color = '#e6e6fa';

                    // So sánh giá gần đây
                    let percent_change = null;
                    if (row.recent_rate && row.rate) {
                        percent_change = ((row.rate - row.recent_rate) / row.recent_rate) * 100;
                    }

                    return {
                        ...row,
                        item_group_badge: group_text ? get_badge_html(group_text, group_color) : '',
                        change_html: get_change_html(percent_change),
                        edit_btn: get_edit_btn_html(row.name),
                        add_btn: get_icon_btn_html('add', row.name),
                        chart_btn: get_icon_btn_html('chart', row.name)
                    };
                });

                // Định nghĩa columns nâng cao
                const columns = [
                    {name: 'Mã mặt hàng', id: 'item_code', editable: false, width: 120, dropdown: true, resizable: true, filter: true},
                    {name: 'Tên mặt hàng', id: 'item_name', editable: false, width: 160, filter: true},
                    {name: 'Nhóm mặt hàng', id: 'item_group_badge', width: 140, format: v => v, filter: true},
                    {name: 'Nhà cung cấp', id: 'supplier', width: 140, filter: true},
                    {name: 'Đơn giá bình quân', id: 'rate', width: 110, align: 'right', format: v => frappe.format(v, {fieldtype:'Currency'}), filter: true},
                    {name: 'Ngày cập nhật', id: 'modified', width: 110, align: 'center', format: v => v ? frappe.datetime.str_to_user(v.substr(0,10)) : '', filter: true},
                    {name: 'Đơn giá cũ', id: 'old_rate', width: 100, align: 'right', format: v => v ? frappe.format(v, {fieldtype:'Currency'}) : '', filter: true},
                    {name: 'Đơn giá gần đây', id: 'recent_rate', width: 110, align: 'right', format: v => v ? frappe.format(v, {fieldtype:'Currency'}) : '', filter: true},
                    {name: '% thay đổi', id: 'change_html', width: 90, align: 'center', format: v => v, filter: false},
                    {name: 'Sửa', id: 'edit_btn', width: 60, align: 'center', format: v => v, filter: false},
                    {name: 'Đơn giá đơn hàng gần nhất', id: 'order_rate', width: 140, align: 'right', format: v => v ? frappe.format(v, {fieldtype:'Currency'}) : '', filter: true},
                    {name: 'Ngày đơn hàng', id: 'order_date', width: 110, align: 'center', format: v => v ? frappe.datetime.str_to_user(v.substr(0,10)) : '', filter: true},
                    {name: '', id: 'add_btn', width: 40, align: 'center', format: v => v, filter: false},
                    {name: '', id: 'chart_btn', width: 40, align: 'center', format: v => v, filter: false}
                ];

                if (datatable) {
                    datatable.refresh(data, columns);
                } else {
                    datatable = new frappe.DataTable(table_area[0], {
                        columns,
                        data,
                        layout: 'fluid',
                        inlineFilters: true,
                        resizable: true,
                        sortable: true,
                        cellHeight: 38,
                        noDataMessage: 'Không có dữ liệu',
                        enableDownload: true
                    });
                }
            }
        });
    }

    btn_filter.on('click', load_data);
    load_data();
};
