frappe.ui.form.on('Material Request', {

    onload: function (frm) {
       
    },

    refresh: function (frm) {
       
        if (frm.is_new() && !frm.doc.custom_request_code) {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Material Request',
                    fields: ['custom_request_code'],
                    filters: [['custom_request_code', 'like', 'YCMH%']],
                    order_by: 'custom_request_code desc',
                    limit_page_length: 1
                },
                callback: function(r) {
                    let nextNumber = 1;
                    if (r.message && r.message.length > 0 && r.message[0].custom_request_code) {
                        let lastCode = r.message[0].custom_request_code;
                        let match = lastCode.match(/YCMH(\d+)/);
                        if (match) {
                            nextNumber = parseInt(match[1], 10) + 1;
                        }
                    }
                    let newCode = 'YCMH' + String(nextNumber).padStart(6, '0');
                    frm.set_value('custom_request_code', newCode);
                }
            });
        }
        
        
        if (frm.is_new() && !frm.doc.custom_request_by) {
          
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Employee',
                    filters: [['user_id', '=', frappe.session.user]],
                   
                    fields: ['name', 'employee_name'],
                    limit_page_length: 1
                },
                callback: function (r) {
                    if (r.message && r.message.length) {
                       
                        let emp = r.message[0];
                        let display = emp.employee_name || emp.name;
                        frm.set_value('custom_request_by', display);
                    } else {
                        
                        var display = (frappe.session && frappe.session.user_fullname) ? frappe.session.user_fullname : frappe.session.user;
                        frm.set_value('custom_request_by', display);
                    }
                    frm.refresh_field('custom_request_by');
                }
            });
            
        }
        // Thêm 2 nút khi ở trạng thái "Duyệt xong"
        if (frm.doc.workflow_state === 'Duyệt xong') {
            frm.add_custom_button(__('Tạo trình duyệt mua hàng'), function() {
                frappe.new_doc('Request for Quotation');
            });
            
            frm.add_custom_button(__('Tạo So sánh báo giá'), function() {
                frappe.new_doc('Supplier Quotation');
            });
        }
    
        // Xóa nút cũ 
        frm.fields_dict['items'].grid.clear_custom_buttons();
        
        
        if (frm.doc.workflow_state !== 'Duyệt xong') {
            frm.fields_dict['items'].grid.add_custom_button(__('Chọn mặt hàng từ BOM'), function () {
            // Tạo dialog
            let currentYear = new Date().getFullYear();
           
            let yearOptions = [];
            for (let y = currentYear - 1; y <= currentYear + 1; y++) {
                yearOptions.push(String(y));
            }

            let d = new frappe.ui.Dialog({
                title: __('Chọn mặt hàng từ BOM'),
                fields: [
                    {
                        fieldname: 'year_filter',
                        fieldtype: 'Select',
                        label: __('Năm'),
                        options: yearOptions,
                        default: String(currentYear)
                    },
                    {
                        fieldname: 'wwo_html',
                        fieldtype: 'HTML',
                        options: '<div class="text-muted">Đang tải...</div>'
                    }
                ],
                size: 'large',
                primary_action_label: __('Cập nhật'),
                primary_action: function () {
                    // Lấy tất cả BOM đã chọn
                    let selected_boms = [];
                    d.$wrapper.find('.bom-checkbox:checked').each(function () {
                        let bomName = $(this).attr('data-bom');
                        let qty = parseFloat($(this).closest('tr').find('td').eq(2).text()) || 0;
                        selected_boms.push({
                            bom: bomName,
                            qty: qty
                        });
                    });

                    if (selected_boms.length === 0) {
                        frappe.show_alert({
                            message: __('Vui lòng chọn ít nhất một BOM'),
                            indicator: 'orange'
                        }, 3);
                        return;
                    }

                    // Cộng dồn số lượng cho các BOM giống nhau
                    let bomMap = {};
                    selected_boms.forEach(item => {
                        if (bomMap[item.bom]) {
                            bomMap[item.bom] += item.qty;
                        } else {
                            bomMap[item.bom] = item.qty;
                        }
                    });

                    
                    let confirmHtml = `
                        <div style="margin-bottom: 15px;">
                            <strong>Xác nhận BOM và số lượng:</strong>
                        </div>
                        <table class="table table-bordered" style="font-size: 13px;">
                            <thead>
                                <tr style="background-color: #f5f5f5;">
                                    <th>Tên BOM</th>
                                    <th style="width: 150px; text-align: center;">Số lượng</th>
                                </tr>
                            </thead>
                            <tbody>`;
                    
                    Object.keys(bomMap).forEach(bomName => {
                        confirmHtml += `
                            <tr>
                                <td>${bomName}</td>
                                <td style="text-align: center;">
                                    <input type="number" 
                                           class="form-control bom-qty-input" 
                                           data-bom="${bomName}" 
                                           value="${bomMap[bomName]}" 
                                           min="0" 
                                           step="1"
                                           style="width: 120px; margin: 0 auto; text-align: center;">
                                </td>
                            </tr>`;
                    });
                    
                    confirmHtml += `</tbody></table>`;

                    let confirmDialog = new frappe.ui.Dialog({
                        title: __('Xác nhận thêm BOM'),
                        fields: [
                            {
                                fieldname: 'confirm_html',
                                fieldtype: 'HTML',
                                options: confirmHtml
                            }
                        ],
                        size: 'large',
                        primary_action_label: __('OK'),
                        primary_action: function () {
                            // Lấy số lượng đã chỉnh sửa từ popup
                            let finalBomList = [];
                            confirmDialog.$wrapper.find('.bom-qty-input').each(function () {
                                let bomName = $(this).attr('data-bom');
                                let qty = parseFloat($(this).val()) || 0;
                                if (qty > 0) {
                                    finalBomList.push({
                                        bom: bomName,
                                        qty: qty
                                    });
                                }
                            });

                            if (finalBomList.length === 0) {
                                frappe.show_alert({
                                    message: __('Vui lòng nhập số lượng cho ít nhất một BOM'),
                                    indicator: 'orange'
                                }, 3);
                                return;
                            }

                            // Nếu bảng items chỉ có 1 hàng rỗng mặc định, xóa nó trước khi thêm
                            if (frm.doc.items && frm.doc.items.length === 1) {
                                const first = frm.doc.items[0];
                                if (!first.item_code && !first.item_name && !first.description && !first.qty) {
                                    frm.clear_table('items');
                                    frm.refresh_field('items');
                                }
                            }

                            // Tạo map để lưu items hiện có
                            let existingItemsMap = {};
                            if (frm.doc.items) {
                                frm.doc.items.forEach((row, idx) => {
                                    if (row.item_code) {
                                        existingItemsMap[row.item_code] = {
                                            row: row,
                                            index: idx
                                        };
                                    }
                                });
                            }

                            // Lấy chi tiết từng BOM và thêm/cộng dồn vào bảng
                            let promises = finalBomList.map(bomItem => {
                                return new Promise((resolve) => {
                                    frappe.call({
                                        method: 'frappe.client.get',
                                        args: {
                                            doctype: 'BOM',
                                            name: bomItem.bom
                                        },
                                        callback: function (bom_res) {
                                            if (bom_res.message && bom_res.message.items) {
                                                // Xử lý từng item từ BOM
                                                bom_res.message.items.forEach(function (bom_item) {
                                                    let item_code = bom_item.item_code;
                                                    let qty_to_add = (bom_item.qty || 0) * bomItem.qty;
                                                    let stock_qty_to_add = (bom_item.stock_qty || 0) * bomItem.qty;

                                                    if (existingItemsMap[item_code]) {
                                                        // Item đã tồn tại - cộng dồn số lượng
                                                        let existingRow = existingItemsMap[item_code].row;
                                                        existingRow.qty = (existingRow.qty || 0) + qty_to_add;
                                                        existingRow.stock_qty = (existingRow.stock_qty || 0) + stock_qty_to_add;
                                                    } else {
                                                        // Item mới - thêm dòng mới
                                                        let row = frm.add_child('items');
                                                        
                                                      
                                                        frappe.model.set_value(row.doctype, row.name, 'item_code', item_code);
                                                        
                                                      
                                                        row.item_name = bom_item.item_name;
                                                        row.description = bom_item.description;
                                                        row.qty = qty_to_add;
                                                        row.stock_qty = stock_qty_to_add;
                                                        row.uom = bom_item.uom;
                                                        row.stock_uom = bom_item.stock_uom;
                                                        row.warehouse = bom_item.source_warehouse;

                                                     
                                                        existingItemsMap[item_code] = {
                                                            row: row,
                                                            index: frm.doc.items.length - 1
                                                        };
                                                    }
                                                });
                                            }
                                            resolve();
                                        }
                                    });
                                });
                            });

                            Promise.all(promises).then(() => {
                                // Xóa các dòng trống (không có item_code)
                                let itemsToRemove = [];
                                frm.doc.items.forEach((item, index) => {
                                    if (!item.item_code) {
                                        itemsToRemove.push(item);
                                    }
                                });
                                
                                itemsToRemove.forEach(item => {
                                    let row_to_remove = frm.fields_dict.items.grid.grid_rows_by_docname[item.name];
                                    if (row_to_remove) {
                                        row_to_remove.remove();
                                    }
                                });
                              
                                frm.dirty();
                                frm.refresh_field('items');
                                frm.fields_dict.items.grid.refresh();
                                add_total_row(frm);

                                let finalItemCount = Object.keys(existingItemsMap).length;
                                frappe.show_alert({
                                    message: __('Đã thêm/cập nhật {0} items từ {1} BOM', [finalItemCount, finalBomList.length]),
                                    indicator: 'green'
                                }, 3);

                                confirmDialog.hide();
                                d.hide();
                            });
                        }
                    });

                    confirmDialog.show();
                }
            });

           
            frappe.call({
                method: 'tahp.doc_events.material_request.material_request.get_approved_week_work_orders',
                callback: function (r) {
                    if (r.message && r.message.length > 0) {
                        let valid_results = r.message;

                        if (valid_results.length === 0) {
                            d.fields_dict.wwo_html.$wrapper.html(
                                '<div class="text-muted">Không tìm thấy Lệnh sản xuất nào có BOM</div>'
                            );
                            return;
                        }

                       
                        let stored_results = valid_results;
                        const pad = (n) => String(n).padStart(2, '0');

                       
                        (function buildYearOptionsFromData() {
                            
                            
                            let yearsSet = new Set();
                            let hasNoDate = false;
                            stored_results.forEach((result) => {
                                let dateStr = null;
                                if (result.items && result.items.length) {
                                    let times = result.items.map(it => it.planned_start_time).filter(Boolean);
                                    if (times.length > 0) {
                                        let dates = times.map(t => new Date(t)).filter(d => !isNaN(d.getTime()));
                                        dates.sort((a, b) => a - b);
                                        if (dates.length > 0) {
                                            let earliest = dates[0];
                                            dateStr = earliest.toISOString().split('T')[0];
                                        }
                                    }
                                }
                                if (!dateStr && result.planned_start_time) {
                                    dateStr = ('' + result.planned_start_time).split('T')[0];
                                }
                                if (!dateStr) {
                                    hasNoDate = true;
                                } else {
                                    let y = dateStr.split('-')[0];
                                    if (y) yearsSet.add(y);
                                }
                            });

                            let years = Array.from(yearsSet).map(y => String(y)).sort((a, b) => b.localeCompare(a));

                            
                            let optionsHTML = [];
                            years.forEach(y => { optionsHTML.push(`<option value="${y}">${y}</option>`); });
                            if (hasNoDate) {
                                optionsHTML.push(`<option value="0000">Không có ngày</option>`);
                            }

                            
                            if (optionsHTML.length === 0) {
                                let cy = String(new Date().getFullYear());
                                optionsHTML.push(`<option value="${cy}">${cy}</option>`);
                            }

                            
                            if (d.fields_dict && d.fields_dict.year_filter && d.fields_dict.year_filter.$input) {
                                d.fields_dict.year_filter.$input.html(optionsHTML.join('\n'));
                            }
                            
                            
                        })();

                        const renderForYear = (year) => {
                           
                            let groups = {};

                            stored_results.forEach((result) => {
                                let dateStr = null;
                                if (result.items && result.items.length) {
                                    let times = result.items.map(it => it.planned_start_time).filter(Boolean);
                                    if (times.length > 0) {
                                        let dates = times.map(t => new Date(t)).filter(d => !isNaN(d.getTime()));
                                        dates.sort((a, b) => a - b);
                                        if (dates.length > 0) {
                                            let earliest = dates[0];
                                            dateStr = earliest.toISOString().split('T')[0];
                                        }
                                    }
                                }
                                if (!dateStr && result.planned_start_time) {
                                    dateStr = ('' + result.planned_start_time).split('T')[0];
                                }
                                if (!dateStr) dateStr = '0000-00-00';

                               
                                let entryYear = dateStr.split('-')[0];
                                if (dateStr !== '0000-00-00' && String(entryYear) !== String(year)) {
                                    return; 
                                }

                                let parts = dateStr.split('-');
                                let ey = parts[0] || '0000';
                                let month = parts[1] || '00';
                                let day = parseInt(parts[2] || '0', 10) || 0;
                                let monthKey = `${ey}-${month}`;

                                if (!groups[monthKey]) {
                                    groups[monthKey] = { label: (month === '00' ? 'Không có tháng' : `Tháng ${parseInt(month, 10)} ${ey}`), weeks: {} };
                                }

                                
                                let weekIndex = 0;
                                if (day > 0) {
                                    let firstOfMonth = new Date(parseInt(ey, 10), parseInt(month, 10) - 1, 1);
                                    let firstDayOfWeek = firstOfMonth.getDay();
                                    let firstSundayDay = (firstDayOfWeek === 0) ? 1 : 1 + ((7 - firstDayOfWeek) % 7);
                                    if (day <= firstSundayDay) {
                                        weekIndex = 1;
                                    } else {
                                        let daysAfter = day - firstSundayDay;
                                        weekIndex = 1 + Math.ceil(daysAfter / 7);
                                    }
                                } else {
                                    weekIndex = 0;
                                }

                                if (!groups[monthKey].weeks[weekIndex]) {
                                    let lastDayOfMonth = new Date(parseInt(ey, 10), parseInt(month, 10), 0).getDate();
                                    if (weekIndex === 0) {
                                        groups[monthKey].weeks[weekIndex] = { startDay: 0, endDay: 0, entries: [] };
                                    } else if (weekIndex === 1) {
                                        let firstOfMonth = new Date(parseInt(ey, 10), parseInt(month, 10) - 1, 1);
                                        let firstDayOfWeek = firstOfMonth.getDay();
                                        let firstSundayDay = (firstDayOfWeek === 0) ? 1 : 1 + ((7 - firstDayOfWeek) % 7);
                                        groups[monthKey].weeks[weekIndex] = { startDay: 1, endDay: Math.min(firstSundayDay, lastDayOfMonth), entries: [] };
                                    } else {
                                        let firstOfMonth = new Date(parseInt(ey, 10), parseInt(month, 10) - 1, 1);
                                        let firstDayOfWeek = firstOfMonth.getDay();
                                        let firstSundayDay = (firstDayOfWeek === 0) ? 1 : 1 + ((7 - firstDayOfWeek) % 7);
                                        let startDay = firstSundayDay + (weekIndex - 2) * 7 + 1;
                                        let endDay = Math.min(firstSundayDay + (weekIndex - 1) * 7, lastDayOfMonth);
                                        groups[monthKey].weeks[weekIndex] = { startDay, endDay, entries: [] };
                                    }
                                }

                                groups[monthKey].weeks[weekIndex].entries.push({ result, dateStr });
                            });

                           
                            let html = `<div style="margin-bottom: 15px;"><strong>Danh sách BOM từ các Lệnh sản xuất đã duyệt</strong></div>`;
                            html += `<table class="table table-bordered" style="font-size: 13px;"><thead><tr style="background-color: #f5f5f5;"><th style="width: 40px; text-align: center;"></th><th>Tên BOM</th><th style="width: 120px; text-align: center;">Số lượng</th><th style="width: 50px; text-align: center;">Chọn</th></tr></thead><tbody>`;

                            let monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
                            let globalIndex = 0;

                            monthKeys.forEach(monthKey => {
                                let monthGroup = groups[monthKey];
                                html += `<tr class="month-row"><td style="width:40px; text-align:center;"><i class="fa fa-chevron-right month-toggle" data-month="${monthKey}" style="cursor:pointer;color:#333"></i></td><td colspan="3" style="background:#efefef;font-weight:600;">${monthGroup.label}</td></tr>`;

                                let weekKeys = Object.keys(monthGroup.weeks).map(k => parseInt(k, 10)).sort((a, b) => a - b);
                                weekKeys.forEach(weekIndex => {
                                    let wk = monthGroup.weeks[weekIndex];
                                    let weekLabel = weekIndex === 0 ? 'Không có ngày' : `Tuần ${weekIndex} (${pad(wk.startDay)} - ${pad(Math.min(wk.endDay, 31))})`;
                                    html += `<tr class="week-row" data-month="${monthKey}" data-week="${weekIndex}"><td style="width:40px; text-align:center;"><i class="fa fa-chevron-right week-toggle" data-month="${monthKey}" data-week="${weekIndex}" style="cursor:pointer;color:#444"></i></td><td colspan="3" style="background:#f9f9f9;font-weight:600;padding-left:20px">${weekLabel}</td></tr>`;

                                 
                                    let bomData = {};
                                    wk.entries.forEach(entry => {
                                        let result = entry.result;
                                        (result.items || []).forEach(it => {
                                            if (it.bom) {
                                                if (!bomData[it.bom]) {
                                                    bomData[it.bom] = {
                                                        count: 0,
                                                        totalQty: 0,
                                                        bomQuantity: it.bom_quantity || 1
                                                    };
                                                }
                                                bomData[it.bom].count += 1;
                                                bomData[it.bom].totalQty += (it.qty || 0);
                                            }
                                        });
                                    });

                                  
                                    let bomNames = Object.keys(bomData);
                                    
                                    bomNames.forEach(bomName => {
                                        let bom_id = `bom_${monthKey}_${weekIndex}_${globalIndex}`;
                                        let finalQty = bomData[bomName].totalQty * bomData[bomName].bomQuantity;
                                        
                                        html += `<tr class="bom-row group-row" data-month="${monthKey}" data-week="${weekIndex}" data-bom="${bomName}">
                                            <td></td>
                                            <td style="padding-left: 40px; color: #666;">${bomName}</td>
                                            <td style="text-align: center;">${Math.round(finalQty)}</td>
                                            <td style="text-align: center;"><input type="checkbox" class="bom-checkbox" id="${bom_id}" data-bom="${bomName}"></td>
                                        </tr>`;
                                        
                                        globalIndex++;
                                    });
                                });
                            });

                            html += `</tbody></table>`;

                            d.fields_dict.wwo_html.$wrapper.html(html);

                           
                            d.$wrapper.find('.bom-row').hide();
                            d.$wrapper.find('.week-row').hide();
                            d.$wrapper.find('.month-toggle').removeClass('fa-chevron-down fa-chevron-up').addClass('fa-chevron-right');
                            d.$wrapper.find('.week-toggle').removeClass('fa-chevron-down fa-chevron-up').addClass('fa-chevron-right');

                           
                            d.$wrapper.find('.month-toggle').on('click', function () {
                                let monthKey = $(this).attr('data-month');
                                let $icon = $(this);
                                let $weekRows = d.$wrapper.find(`.week-row[data-month="${monthKey}"]`);
                                if ($weekRows.length === 0) return;

                               
                                let anyVisible = false;
                                $weekRows.each(function () { if ($(this).is(':visible')) anyVisible = true; });

                                if (anyVisible) {
                                  
                                    $weekRows.hide();
                                    d.$wrapper.find(`.group-row[data-month="${monthKey}"]`).hide();
                                    $icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
                                   
                                    d.$wrapper.find(`.week-toggle[data-month="${monthKey}"]`).removeClass('fa-chevron-down').addClass('fa-chevron-right');
                                } else {
                                    
                                    $weekRows.show();
                                    $icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
                                   
                                    d.$wrapper.find(`.week-toggle[data-month="${monthKey}"]`).removeClass('fa-chevron-down fa-chevron-up fa-chevron-right').addClass('fa-chevron-right');
                                 
                                    d.$wrapper.find(`.group-row[data-month="${monthKey}"]`).hide();
                                }
                            });

                            d.$wrapper.find('.week-toggle').on('click', function () {
                                let monthKey = $(this).attr('data-month');
                                let weekIndex = $(this).attr('data-week');
                                let $icon = $(this);
                                let $rows = d.$wrapper.find(`.group-row[data-month="${monthKey}"][data-week="${weekIndex}"]`);
                                $rows.toggle();
                                if ($rows.is(':visible')) {
                                    $icon.removeClass('fa-chevron-right fa-chevron-up').addClass('fa-chevron-down');
                                } else {
                                    $icon.removeClass('fa-chevron-down fa-chevron-up').addClass('fa-chevron-right');
                                }
                            });

                            d.$wrapper.find('.bom-checkbox').on('change', function () {
                               
                            });
                        };

                        // set up year filter handler and initial render
                        let defaultYear = (d.fields_dict.year_filter && d.fields_dict.year_filter.get_value) ? d.fields_dict.year_filter.get_value() : String(currentYear);
                        d.fields_dict.year_filter.$input.on('change', function () {
                            let val = d.fields_dict.year_filter.get_value ? d.fields_dict.year_filter.get_value() : d.fields_dict.year_filter.$input.val();
                            renderForYear(val);
                        });

                        renderForYear(defaultYear);

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
    }
});
function add_total_row(frm) {
    
    setTimeout(() => {
        // Tìm grid-body
        let $gridBody = frm.fields_dict.items.$wrapper.find('.grid-body');
        
        
        // Xóa hàng tổng cộng cũ nếu có
        $gridBody.find('.total-row').remove();
        
        // Kiểm tra xem còn items không
        if (!frm.doc.items || frm.doc.items.length === 0) {
           
            return;
        }
        
        // Tính tổng số lượng cột Qty và custom_estimated_amount
        let totalQty = 0;
        let totalEstimatedAmount = 0;
        
        frm.doc.items.forEach(item => {
            totalQty += (item.qty || 0);
            totalEstimatedAmount += (item.custom_estimated_amount || 0);
        });
        
      
        
        // Kiểm tra xem có grid-row không
        let $templateRow = $gridBody.find('.grid-row').first();
        if ($templateRow.length === 0) {
            
            return;
        }
        
        let $totalRow = $templateRow.clone();
        
        $totalRow.removeClass('grid-row').addClass('total-row');
        $totalRow.css({
            'background-color': '#f8f9fa',
            'font-weight': 'bold',
            'border-top': '2px solid #d1d8dd'
        });
        
        // Xóa tất cả nội dung các cột
        $totalRow.find('.col').each(function(index) {
            let $col = $(this);
            $col.empty();
            $col.find('*').remove();
            
            // Tìm fieldname
            let fieldname = $col.attr('data-fieldname');
            
            if (fieldname === 'qty') {
                $col.text(totalQty.toFixed(2));
                $col.css({
                    'text-align': 'right',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'flex-end',
                    'padding': '10px 8px'
                });
            } else if (fieldname === 'custom_estimated_amount') {
                $col.text(totalEstimatedAmount.toFixed(2));
                $col.css({
                    'text-align': 'right',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'flex-end',
                    'padding': '10px 8px'
                });
            } else if (index === 2) {
               
                $col.text('TỔNG CỘNG:');
                $col.css({
                    'text-align': 'center',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'font-weight': 'bold',
                    'padding': '10px 0'
                });
            }
        });
        
        $gridBody.append($totalRow);
        
    }, 500);
}

// Event khi thay đổi Material Request Item
frappe.ui.form.on('Material Request Item', {
    items_add: function(frm, cdt, cdn) {
       
        add_total_row(frm);
    },
    
    items_remove: function(frm, cdt, cdn) {
       
        add_total_row(frm);
    },
    
    qty: function(frm, cdt, cdn) {
        add_total_row(frm);
    },
    
    item_code: async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code) return;
        
        
        const response = await frappe.call({
            method: 'tahp.doc_events.material_request.material_request.get_supplier_item_rate',
            args: {
                item_code: row.item_code
            }
        });
        
        if (response.message) {
            const data = response.message;
            // Điền đơn giá dự kiến
            frappe.model.set_value(cdt, cdn, 'custom_estimated_rate', data.rate || 0);
            // Điền xuất xứ nếu có field
            if (data.origin) {
                frappe.model.set_value(cdt, cdn, 'custom_origin', data.origin);
            }
        }
        
        add_total_row(frm);
    },

    custom_actual_qty_v1: function(frm, cdt, cdn) {
        calculate_estimated_amount(frm, cdt, cdn);
        add_total_row(frm);
    },

    custom_estimated_rate: function(frm, cdt, cdn) {
        calculate_estimated_amount(frm, cdt, cdn);
        add_total_row(frm);
    },

    custom_estimated_amount: function(frm, cdt, cdn) {
        add_total_row(frm);
    }
});

function calculate_estimated_amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    
    let actual_qty = row.custom_actual_qty_v1 || 0;
    let estimated_rate = row.custom_estimated_rate || 0;
    let estimated_amount = actual_qty * estimated_rate;
    
    frappe.model.set_value(cdt, cdn, 'custom_estimated_amount', estimated_amount);
}