frappe.ui.form.on('Material Request', {

    onload: function(frm) {
        console.log("hello - onload");
    },
    
    refresh: function(frm) {
        console.log("hello1")
        // Thêm nút "Chọn mặt hàng từ BOM"
        frm.fields_dict['items'].grid.add_custom_button(__('Chọn mặt hàng từ BOM'), function() {
            // Tạo dialog
            let d = new frappe.ui.Dialog({
                title: __('Chọn mặt hàng từ BOM'),
                fields: [
                    {
                        fieldname: 'wwo_html',
                        fieldtype: 'HTML',
                        options: '<div class="text-muted">Đang tải...</div>'
                    }
                ],
                size: 'large',
                primary_action_label: __('Cập nhật'),
                primary_action: function() {
                    // Lấy tất cả BOM đã chọn
                    let selected_boms = [];
                    d.$wrapper.find('.bom-checkbox:checked').each(function() {
                        selected_boms.push($(this).attr('data-bom'));
                    });

                    if (selected_boms.length === 0) {
                        frappe.show_alert({
                            message: __('Vui lòng chọn ít nhất một BOM'),
                            indicator: 'orange'
                        }, 3);
                        return;
                    }

                    // Lấy chi tiết từng BOM và thêm vào bảng
                    let total_items = 0;
                    let promises = selected_boms.map(bom_name => {
                        return new Promise((resolve) => {
                            frappe.call({
                                method: 'frappe.client.get',
                                args: {
                                    doctype: 'BOM',
                                    name: bom_name
                                },
                                callback: function(bom_res) {
                                    if (bom_res.message && bom_res.message.items) {
                                        // Thêm từng item từ BOM vào child table
                                        bom_res.message.items.forEach(function(bom_item) {
                                            let row = frm.add_child('items');
                                            
                                            // Map các field từ BOM item
                                            row.item_code = bom_item.item_code;
                                            row.item_name = bom_item.item_name;
                                            row.description = bom_item.description;
                                            row.qty = bom_item.qty || 0;
                                            row.stock_qty = bom_item.stock_qty || 0;
                                            row.uom = bom_item.uom;
                                            row.stock_uom = bom_item.stock_uom;
                                            row.warehouse = bom_item.source_warehouse;
                                            
                                            total_items++;
                                        });
                                    }
                                    resolve();
                                }
                            });
                        });
                    });

                    Promise.all(promises).then(() => {
                        frm.refresh_field('items');
                        
                        frappe.show_alert({
                            message: __('Đã thêm {0} items từ {1} BOM', [total_items, selected_boms.length]),
                            indicator: 'green'
                        }, 3);
                        
                        d.hide();
                    });
                }
            });

            // Load dữ liệu Week Work Order đã duyệt
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Week Work Order',
                    fields: ['name', 'creation'],
                    filters: {
                        workflow_state: 'Duyệt xong'
                    },
                    order_by: 'creation desc',
                    limit_page_length: 0
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        // Lấy chi tiết từng Week Work Order
                        let promises = r.message.map(wwo => {
                            return new Promise((resolve) => {
                                frappe.call({
                                    method: 'frappe.client.get',
                                    args: {
                                        doctype: 'Week Work Order',
                                        name: wwo.name
                                    },
                                    callback: function(res) {
                                        if (res.message && res.message.items) {
                                            // Lọc chỉ lấy items có BOM
                                            let items_with_bom = res.message.items.filter(item => item.bom);
                                            if (items_with_bom.length > 0) {
                                                resolve({
                                                    wwo: wwo.name,
                                                    planned_start_date: res.message.planned_start_date,
                                                    items: items_with_bom
                                                });
                                            } else {
                                                resolve(null);
                                            }
                                        } else {
                                            resolve(null);
                                        }
                                    }
                                });
                            });
                        });

                        Promise.all(promises).then(results => {
                            // Lọc bỏ null
                            let valid_results = results.filter(r => r !== null);

                            if (valid_results.length === 0) {
                                d.fields_dict.wwo_html.$wrapper.html(
                                    '<div class="text-muted">Không tìm thấy Lệnh sản xuất nào có BOM</div>'
                                );
                                return;
                            }

                            // Tạo HTML hiển thị
                            let html = `
                                <div style="margin-bottom: 15px;">
                                    <strong>Danh sách Lệnh sản xuất đã duyệt kèm BOM</strong>
                                </div>
                                <table class="table table-bordered" style="font-size: 13px;">
                                    <thead>
                                        <tr style="background-color: #f5f5f5;">
                                            <th style="width: 40px; text-align: center;"></th>
                                            <th style="width: 60px;">Thứ tự</th>
                                            <th>Lệnh sản xuất</th>
                                            <th style="width: 150px;">Ngày bắt đầu dự kiến</th>
                                            <th style="width: 50px; text-align: center;">Chọn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;

                            valid_results.forEach((result, idx) => {
                                let wwo_id = 'wwo_' + idx;
                                
                                // Dòng LSX
                                html += `
                                    <tr class="wwo-row">
                                        <td style="text-align: center;">
                                            <i class="fa fa-chevron-right wwo-toggle" 
                                               data-wwo="${wwo_id}"
                                               style="cursor: pointer; color: #666;"
                                               title="Click để ẩn/hiện BOM"></i>
                                        </td>
                                        <td>${idx + 1}</td>
                                        <td>
                                            <div style="font-weight: 600;">
                                                ${result.wwo}
                                            </div>
                                        </td>
                                        <td>${result.planned_start_date || ''}</td>
                                        <td style="text-align: center;">
                                            <input type="checkbox" 
                                                   class="wwo-checkbox" 
                                                   data-wwo="${wwo_id}">
                                        </td>
                                    </tr>
                                `;

                                // Hiển thị từng BOM với checkbox (mặc định ẩn)
                                result.items.forEach((item, item_idx) => {
                                    let bom_id = 'bom_' + idx + '_' + item_idx;
                                    html += `
                                        <tr class="bom-row" data-parent="${wwo_id}" style="display: none;">
                                            <td></td>
                                            <td></td>
                                            <td style="padding-left: 40px; color: #666;">
                                                ${item.bom}
                                            </td>
                                            <td></td>
                                            <td style="text-align: center;">
                                                <input type="checkbox" 
                                                       class="bom-checkbox" 
                                                       id="${bom_id}"
                                                       data-wwo="${wwo_id}"
                                                       data-bom="${item.bom}">
                                            </td>
                                        </tr>
                                    `;
                                });
                            });

                            html += `
                                    </tbody>
                                </table>
                            `;

                            d.fields_dict.wwo_html.$wrapper.html(html);

                            // Xử lý khi click vào icon toggle LSX
                            d.$wrapper.find('.wwo-toggle').on('click', function() {
                                let wwo_id = $(this).attr('data-wwo');
                                let $icon = $(this);
                                let $bomRows = d.$wrapper.find(`.bom-row[data-parent="${wwo_id}"]`);
                                
                                // Toggle hiển thị BOM
                                $bomRows.toggle();
                                
                                // Đổi icon
                                if ($bomRows.is(':visible')) {
                                    $icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
                                } else {
                                    $icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
                                }
                            });

                            // Xử lý khi checkbox LSX được click
                            d.$wrapper.find('.wwo-checkbox').on('change', function() {
                                let wwo_id = $(this).attr('data-wwo');
                                let is_checked = $(this).is(':checked');
                                
                                // Check/uncheck tất cả BOM con
                                d.$wrapper.find(`.bom-checkbox[data-wwo="${wwo_id}"]`).prop('checked', is_checked);
                            });

                            // Xử lý khi checkbox BOM được click - cập nhật trạng thái LSX
                            d.$wrapper.find('.bom-checkbox').on('change', function() {
                                let wwo_id = $(this).attr('data-wwo');
                                let total_bom = d.$wrapper.find(`.bom-checkbox[data-wwo="${wwo_id}"]`).length;
                                let checked_bom = d.$wrapper.find(`.bom-checkbox[data-wwo="${wwo_id}"]:checked`).length;
                                
                                // Cập nhật trạng thái checkbox LSX
                                let $wwoCheckbox = d.$wrapper.find(`.wwo-checkbox[data-wwo="${wwo_id}"]`);
                                
                                if (checked_bom === 0) {
                                    $wwoCheckbox.prop('checked', false);
                                    $wwoCheckbox.prop('indeterminate', false);
                                } else if (checked_bom === total_bom) {
                                    $wwoCheckbox.prop('checked', true);
                                    $wwoCheckbox.prop('indeterminate', false);
                                } else {
                                    $wwoCheckbox.prop('checked', false);
                                    $wwoCheckbox.prop('indeterminate', true);
                                }
                            });
                        });

                    } else {
                        d.fields_dict.wwo_html.$wrapper.html(
                            '<div class="text-muted">Không tìm thấy Week Work Order nào</div>'
                        );
                    }
                }
            });

            d.show();
        });
    }
});