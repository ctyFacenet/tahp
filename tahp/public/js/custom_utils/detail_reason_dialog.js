frappe.custom_utils_detail_reason = (work_orders = null, from_date = null, to_date = null) => {
    const dialog = new frappe.ui.Dialog({
        title: "Thông tin chi tiết",
        fields: [{ fieldtype: "HTML", fieldname: "wrapper" }]
    });

    dialog.show();
    const $wrapper = dialog.get_field("wrapper").$wrapper;

    frappe.call({
        method: "tahp.tahp.page.manufacturing_dash.detail_reason_dialog.get_detail_reason",
        args: { work_orders, from_date, to_date },
        callback: (r) => render_dialog(r.message || [])
    });

    function render_dialog(results) {
        let dateTitle = "";
        if (from_date && to_date) dateTitle = `Ngày ${from_date}`;
        else if (from_date) dateTitle = `Từ: ${from_date}`;
        else if (to_date) dateTitle = `Đến: ${to_date}`;

        let totalProduced = 0;
        let totalTarget = 0;
        results.forEach(wo => {
            totalProduced += wo.actual_qty || 0;
            totalTarget += wo.standard_qty || 0;
        });
        const percentage = totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : 0;
        dateTitle = "Ngày " + (from_date || frappe.datetime.get_today());

        let html = `
            <div class="">
                <div class="d-flex w-100 justify-content-between align-items-end mb-3">
                    <h4 class="mb-0">${dateTitle}</h4>
                    <h5 class="mb-0">Đã sản xuất ${totalProduced} / ${totalTarget} Tấn ( ${percentage}% )</h5>
                </div>
                ${results.length === 0 ? '<div class="alert alert-info text-center">Không có dữ liệu</div>' : ''}
            </div>
        `
        results.forEach((wo, idx) => {
            const collapseId = `collapse${idx}`;
            const isFirst = idx === 0;
            
            html += `
                <div class="card" style="margin-bottom: 25px">
                    <div class="card-header" style="background: #ebebebff">
                        <div class="d-flex justify-content-between align-items-center" style="font-weight:bold;">
                            <div class="fw-bold">${wo.name} - Thành phẩm: ${wo.item_name}</div>
                            <a href="/app/work-order/${wo.name}" 
                               target="_blank" 
                               class="btn btn-sm btn-link">
                                <i class="fa fa-external-link"></i>
                            </a>
                        </div>
                    </div>

                    <div class="card-body">

                       <!-- Lý do thành phẩm -->
                        <div class="mb-4" >
                            <label class="form-label">Lý do sản lượng thành phẩm chênh lệch</label>
                            <div class="p-2 bg-light border rounded">
                                ${wo.finished_reason || '<em class="text-muted">Chưa có thông tin</em>'}
                            </div>
                        </div>

                        <!-- Lý do nguyên liệu -->
                        <div class="mb-4">
                            <label class="form-label">Lý do sản lượng nguyên liệu chênh lệch</label>
                            <div class="p-2 bg-light border rounded">
                                ${wo.required_reason || '<em class="text-muted">Chưa có thông tin</em>'}
                            </div>
                        </div>

                        <!-- Đầu vào tiêu hao -->
                        <div class="table-responsive mb-4">
                            <table class="table table-sm table-bordered m-0 bg-white">
                                <thead style="background: #e8f5e9;">
                                    <tr>
                                        <th>Đầu vào sản xuất</th>
                                        <th class="text-center">ĐVT</th>
                                        <th class="text-end">Định mức</th>
                                        <th class="text-end">Thực tế</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${wo.requireds && wo.requireds.length > 0 
                                        ? wo.requireds.map(item => {
                                            const isOverUsed = (item.actual_qty || 0) > (item.standard_qty || 0);
                                            return `
                                                <tr >
                                                    <td>${item.item_name || item.item_code || ''}</td>
                                                    <td class="text-center">${item.stock_uom || ''}</td>
                                                    <td class="text-end">${item.standard_qty || 0}</td>
                                                    <td class="text-end ${isOverUsed ? 'table-warning' : ''}">${item.actual_qty || 0}</td>
                                                </tr>
                                            `;
                                        }).join('')
                                        : '<tr><td colspan="4" class="text-center text-muted">Chưa có thông tin</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>

                        <!-- Sản lượng -->
                        <div class="table-responsive mb-4">
                            <table class="table table-sm table-bordered m-0 bg-white">
                                <thead style="background: #e3f2fd;">
                                    <tr>
                                        <th>Sản phẩm sau SX</th>
                                        <th class="text-center">ĐVT</th>
                                        <th class="text-end">Định mức</th>
                                        <th class="text-end">Thực tế</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${wo.production && wo.production.length > 0 
                                        ? wo.production.map(item => {
                                            const isUnderProduced = (item.actual_qty || 0) < (item.standard_qty || 0);
                                            return `
                                                <tr >
                                                    <td>${item.item_name || item.item_code || ''}</td>
                                                    <td class="text-center">${item.stock_uom || ''}</td>
                                                    <td class="text-end">${item.standard_qty || 0}</td>
                                                    <td class="text-end ${isUnderProduced ? 'table-warning' : ''}">${item.actual_qty || 0}</td>
                                                </tr>
                                            `;
                                        }).join('')
                                        : '<tr><td colspan="4" class="text-center text-muted">Chưa có thông tin</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>


                        ${wo.shift_handover ? `
                            <!-- Biên bản giao ca -->
                            <div class="border rounded p-2 mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <strong>Biên bản giao ca ${wo.shift_handover.name}</strong>
                                    <a href="/app/shift-handover/${wo.shift_handover.name}" 
                                       target="_blank" 
                                       class="btn btn-sm btn-link">
                                        <i class="fa fa-external-link"></i>
                                    </a>
                                </div>
                                ${wo.shift_handover.notes_1 ? `
                                    <div class="mb-4">
                                        <label class="form-label">Phản ánh, đánh giá từ nhân viên</label>
                                        <div class="p-2 bg-light border rounded">
                                            ${wo.shift_handover.notes_1}
                                        </div>
                                    </div>
                                ` : ''}

                                ${wo.shift_handover.notes_2 ? `
                                    <div class="mb-4">
                                        <label class="form-label">Phản ánh, đánh giá từ Quản đốc</label>
                                        <div class="p-2 bg-light border rounded">
                                            ${wo.shift_handover.notes_2}
                                        </div>
                                    </div>
                                ` : ''}

                                ${wo.shift_handover.notes_3 ? `
                                    <div class="mb-4">
                                        <label class="form-label">Phản ánh, đánh giá từ Trưởng ca</label>
                                        <div class="p-2 bg-light border rounded">
                                            ${wo.shift_handover.notes_3}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        ${wo.plan ? `
                            <!-- Kế hoạch -->
                            <div class="border rounded p-2 mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>Kế hoạch ${wo.plan}</strong>
                                    </div>
                                    <a href="/app/week-work-order/${wo.plan}" 
                                       target="_blank" 
                                       class="btn btn-sm btn-link">
                                        <i class="fa fa-external-link"></i>
                                    </a>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        })

        $wrapper.html(html);
    }
};