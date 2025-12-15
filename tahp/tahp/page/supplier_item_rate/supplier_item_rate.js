
frappe.pages['supplier-item-rate'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Supplier Item Rate',
        single_column: true
    });

    // Filter area
    $(page.main).html(`
        <div class="supplier-item-rate-toolbar flex" style="gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap;">
            <div>
                <label>Mã mặt hàng</label>
                <input type="text" class="form-control" id="filter-item-code" style="width: 160px;" placeholder="Item Code">
            </div>
            <div>
                <label>Tên mặt hàng</label>
                <input type="text" class="form-control" id="filter-item-name" style="width: 160px;" placeholder="Item Name">
            </div>
            <div>
                <label>Nhóm mặt hàng</label>
                <input type="text" class="form-control" id="filter-item-group" style="width: 160px;" placeholder="Item Group">
            </div>
            <div>
                <label>Nhà cung cấp</label>
                <input type="text" class="form-control" id="filter-supplier" style="width: 160px;" placeholder="Supplier">
            </div>
            <div>
                <label>Xuất xứ</label>
                <input type="text" class="form-control" id="filter-origin" style="width: 120px;" placeholder="Origin">
            </div>
            <div style="margin-top: 8px;">
                <button class="btn btn-primary" id="btn-filter">Lọc</button>
            </div>
            <div style="flex:1"></div>
            <div style="margin-top: 8px;">
                <button class="btn btn-success" id="btn-add-supplier-item-rate"><i class="fa fa-plus"></i> Thêm mới</button>
            </div>
        </div>
        <div id="supplier-item-rate-datatable"></div>
    `);

    let datatable;
    load_data();

    // Filter event
    $(page.main).on('click', '#btn-filter', function() {
        load_data();
    });

    // Add new event
    $(page.main).on('click', '#btn-add-supplier-item-rate', function() {
        frappe.new_doc('Supplier Item Rate');
    });

    function get_filters() {
        return {
            item_code: $('#filter-item-code').val(),
            item_name: $('#filter-item-name').val(),
            item_group: $('#filter-item-group').val(),
            supplier: $('#filter-supplier').val(),
            origin: $('#filter-origin').val(),
        };
    }

    function load_data() {
        const filters = get_filters();
        frappe.call({
            method: 'tahp.tahp.page.supplier_item_rate.supplier_item_rate.get_data',
            args: { filters },
            callback: r => {
                const rows = r.message || [];
                const columns = [
                    { name: 'Mã mặt hàng', id: 'item_code' },
                    { name: 'Tên mặt hàng', id: 'item_name' },
                    { name: 'Nhóm mặt hàng', id: 'item_group' },
                    { name: 'Nhà cung cấp', id: 'supplier' },
                    { name: 'Xuất xứ', id: 'origin' },
                    { name: 'Đơn giá', id: 'rate', format: value => frappe.format(value, {fieldtype: 'Currency'}) }
                ];
                const data = rows.map(row => [
                    row.item_code,
                    row.item_name,
                    row.item_group,
                    row.supplier,
                    row.origin,
                    row.rate
                ]);
                if (datatable) {
                    datatable.refresh(data, columns);
                } else {
                    datatable = new frappe.DataTable('#supplier-item-rate-datatable', {
                        columns: columns,
                        data: data,
                        layout: 'fluid'
                    });
                }
            }
        });
    }
};
