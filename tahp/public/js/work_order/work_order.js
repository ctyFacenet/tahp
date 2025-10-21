frappe.ui.form.on('Work Order', {
    refresh: async function(frm) {
        frm.set_intro("");
        $(frm.fields_dict.custom_complete_wo.wrapper).empty();
        $(frm.fields_dict.custom_complete_list.wrapper).empty();
        $(frm.fields_dict.custom_workflow_button.wrapper).empty();
        
        await finish_button(frm);
        await change_time(frm);
        frm.remove_custom_button('Close', 'Status');
        frm.remove_custom_button('Stop', 'Status');
        frm.remove_custom_button("Disassemble Order", "Create");
        
        if (frm.doc.status == "In Process") {
            let job_cards = await frappe.db.get_list("Job Card", {
                filters: { work_order: frm.doc.name, docstatus: ["!=", 2] },
                fields: ["name"]
            });
            if (job_cards.length == frm.doc.operations.length) {
                frm.remove_custom_button("Create Job Card");
            }
        }
        
        if (frm.doc.workflow_state === "Nháp") {
            frm.page.set_indicator(__("Nháp"), "red");
        } else if (frm.doc.workflow_state === "Đợi Quản đốc duyệt" && frm.doc.docstatus == 0) {
            frm.page.set_indicator(__("Đợi Quản đốc duyệt"), "orange");
        }

        if (frm.doc.status == "Completed" && frm.doc.docstatus === 1) {
            frm.add_custom_button("Xem tổng kết LSX Ca", async function () {
                frappe.route_options = {
                    "work_order": frm.doc.name
                };
                frappe.set_route("List", "Work Order Finished Item");            
            }).addClass('btn-primary')

            const $wrapper = $(frm.fields_dict.custom_complete_list.wrapper);
            $wrapper.empty();
            const $btn = $(`
                <button 
                    class="btn btn-default ellipsis w-100 d-md-none mb-3 py-2"
                    style="font-weight: 500;"
                >
                    Xem tổng kết LSX Ca
                </button>
            `);
            $wrapper.append($btn);

            $btn.on("click", async () => {
                frappe.route_options = {
                    "work_order": frm.doc.name
                };
                frappe.set_route("List", "Work Order Finished Item");                    
            });
        }

        // Chỉ render workflow buttons một lần duy nhất ở cuối
        if (!frm.is_new()) {
            render_workflow_buttons(frm);
        }
    },
    
    onload: async function(frm) {
        await autofill_items(frm);
    },
    
    bom_no: async function(frm) {
        await autofill_items(frm);
    },

    before_workflow_action: async function(frm) {
        if (frm.selected_workflow_action === "Từ chối") {
            // Dừng workflow tạm thời
            frappe.dom.unfreeze(); // Dỡ bỏ freeze UI (nếu có)
            
            // Lưu lại action để thực hiện sau
            const action = frm.selected_workflow_action;

            // Hủy action tạm thời (bằng cách return false hoặc không tiếp tục)
            frappe.prompt({
                label: __('Lý do từ chối'),
                fieldname: 'comment',
                fieldtype: 'Small Text',
                reqd: 1
            }, async (values) => {
                await frappe.call({
                    method: 'tahp.doc_events.work_order.work_order_utils.reject_work_order',
                    args: {
                        name: frm.doc.name,
                        comment: values.comment,
                    }
                });
            }, __('Xác nhận'));

            // Ngăn hành động workflow tiếp tục ngay lúc này
            throw "Dừng để chờ người dùng nhập lý do từ chối.";
        }
    }
});

function render_workflow_buttons(frm) {
    const $wrapper = frm.fields_dict.custom_workflow_button.$wrapper;
    
    // Chỉ clear và render nếu chưa có buttons hoặc cần update
    const existingButtons = $wrapper.find('.workflow-buttons-container');
    if (existingButtons.length > 0) {
        return; // Đã có buttons rồi, không render lại
    }
    
    $wrapper.empty();
    
    // Kiểm tra xem có workflow không
    if (!frm.doc.workflow_state) {
        return;
    }
    
    // Lấy workflow transitions
    frappe.xcall('frappe.model.workflow.get_transitions', {
        doc: frm.doc
    }).then(transitions => {
        if (!transitions || transitions.length === 0) {
            return;
        }
        
        // Tạo container cho buttons
        const $container = $('<div class="workflow-buttons-container"></div>');
        
        transitions.forEach((transition, index) => {
            // Action đầu tiên là primary, các action còn lại là secondary
            const btnClass = index === 0 ? 'btn-primary' : 'btn-secondary';
            
            // Tạo button cho mỗi action
            const $btn = $(`
                <button class="btn btn-default ellipsis ${btnClass} w-100 d-md-none mb-3 py-2">
                    ${transition.action}
                </button>
            `);
            
            // Thêm event handler
            $btn.on("click", () => {
                trigger_workflow_action(frm, transition.action);
            });
            
            $container.append($btn);
        });
        
        $wrapper.append($container);
    });
}

function trigger_workflow_action(frm, action) {
    if (action === "Từ chối") {
        frappe.prompt({
            label: __('Lý do từ chối'),
            fieldname: 'comment',
            fieldtype: 'Small Text',
            reqd: 1
        }, async (values) => {
            try {
                // Gọi API để xử lý từ chối
                await frappe.call({
                    method: 'tahp.doc_events.work_order.work_order_utils.reject_work_order',
                    args: {
                        name: frm.doc.name,
                        comment: values.comment,
                    }
                });
            } catch (err) {
                frappe.msgprint({
                    title: __('Error'),
                    indicator: 'red',
                    message: err.message || __('Failed to reject work order')
                });
            }
        }, __('Xác nhận'));
    } else {
        // Trường hợp các action khác không cần prompt
        frappe.xcall('frappe.model.workflow.apply_workflow', {
            doc: frm.doc,
            action: action
        }).then(() => {
        }).catch(err => {
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: err.message || __('Failed to apply workflow action')
            });
        });
    }
}

frappe.ui.form.on('Work Order Operation', {
    operation: async function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.operation) return;
        let operation_doc = await frappe.db.get_doc("Operation", row.operation)
        if (operation_doc) {
            frappe.model.set_value(cdt, cdn, 'workstation', operation_doc.workstation);
            frappe.model.set_value(cdt, cdn, 'sequence_id', 1);
            if (operation_doc.custom_team && operation_doc.custom_team.length > 0) {
                frappe.model.set_value(cdt, cdn, 'custom_employee', operation_doc.custom_team[0].employee);
                frappe.model.set_value(cdt, cdn, 'custom_employee_name', operation_doc.custom_team[0].employee_name);
                if (operation_doc.custom_team && operation_doc.custom_team.length > 1) {
                    frappe.model.set_value(cdt, cdn, 'custom_v_employee', operation_doc.custom_team[1].employee);
                    frappe.model.set_value(cdt, cdn, 'custom_v_employee_name', operation_doc.custom_team[1].employee_name);                    
                }
            }
        }
    }
})

async function finish_button(frm) {
    if (frm.is_new() || frm.doc.docstatus != 1 || frm.doc.status == "Completed" ) return;
    frm.remove_custom_button("Finish");
    // const response = await frappe.call({method: "tahp.doc_events.work_order.before_submit.check_status", args: {work_order: frm.doc.name}})
    // if (response.message) {
    //     frm.add_custom_button(__('Hoàn thành'), async function () {
    //         if (typeof response.message === "string") frappe.set_route("Form", "Stock Entry", response.message)
    //         else {
    //             const stock_entry = await frappe.xcall("erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry", {
    //                 work_order_id: frm.doc.name,
    //                 purpose: "Manufacture",
    //                 qty: frm.doc.qty
    //             });
    //             console.log(stock_entry)
    //             frappe.model.sync(stock_entry);
    //             frappe.set_route("Form", stock_entry.doctype, stock_entry.name);
    //         }
    //     }).addClass('btn-primary')
    // }
    frm.add_custom_button(__('Hoàn thành'), async function () {
        await complete_wo(frm);
    }).addClass('btn-primary')
    if (frm.doc.status == "In Process") {
        const $wrapper = $(frm.fields_dict.custom_complete_wo.wrapper);
        $wrapper.empty();
        const $btn = $(`
            <button 
                class="btn btn-default ellipsis btn-primary w-100 d-md-none mb-3 py-2"
                style="font-weight: 500;"
            >
                Xác nhận hoàn thành
            </button>
        `);

        $btn.on("click", async () => {
            await complete_wo(frm);
        });
        $wrapper.append($btn);        
    }
}

async function complete_wo(frm) {
    let d = new frappe.ui.Dialog({
        title: "Xác nhận sản lượng LSX Ca",
        size: "large",
        fields: [
            {
                fieldname: "requireds",
                fieldtype: "HTML",
                label: "Bảng dữ liệu demo",
            },
            {
                fieldname: "finisheds",
                fieldtype: "HTML",
                label: "Bảng dữ liệu demo",
            },
            {
                fieldtype: "Section Break"
            },
            {
                fieldname: "planned_start_date",
                label: "Ngày bắt đầu kế hoạch",
                fieldtype: "Datetime",
                default: frm.doc.planned_start_date,
                reqd: 1
            },
            {
                fieldname: "actual_end_date",
                label: "Ngày kết thúc thực tế",
                fieldtype: "Datetime",
                default: frappe.datetime.now_datetime(),
                reqd: 1
            }
        ],
        primary_action_label: __('Xác nhận'),
        primary_action: async function() {
            // ✅ Lấy dữ liệu từ cả 2 bảng
            const requireds_data = covertAllData(requiredsRawData, $firstWrapper.find('.wo-value-input, .wo-select-middle'));
            const finisheds_data = covertAllData(finishedsRawData, $secondWrapper.find('.wo-value-input, .wo-select-middle'));
            let planned_start_date = d.get_value("planned_start_date");
            let actual_end_date = d.get_value("actual_end_date");
            let raise_qc = d.get_value("raise_qc");

            await frappe.call({
                method: "tahp.doc_events.work_order.work_order_utils.process_consumed_produced_items",
                args: {
                    work_order: frm.doc.name, 
                    required: requireds_data, 
                    produced: finisheds_data,
                    planned_start_date,
                    actual_end_date,
                    raise_qc
                }
            })

            frm.reload_doc()
            d.hide();
            frappe.show_alert({indicator: "green", message: "LSX Ca đã hoàn thành"})
            
            const $wrapper = $(frm.fields_dict.custom_complete_wo.wrapper);
            $wrapper.empty();
        }
    });

    // Khi dialog mở
    d.show();

    // Lấy wrapper của field HTML
    let $firstWrapper = $(d.fields_dict.requireds.$wrapper);
    let $secondWrapper = $(d.fields_dict.finisheds.$wrapper);
    $secondWrapper.css({'margin-top': '20px'})

    let response = await frappe.call({method: "tahp.doc_events.work_order.work_order_utils.get_consumed_produced_items", args: {work_order: frm.doc.name}})
    console.log(response.message)

    // Dữ liệu khác nhau
    requiredsRawData = response.message.required
    finishedsRawData = response.message.produced

    let rawWarehouse = await frappe.db.get_list('Warehouse')
    let warehouse = rawWarehouse.map(w => w.name)

    let columns1 = [
        { fieldname: "item_code", label: "Mã NVL", is_secondary: true, ratio: 2 },
        { fieldname: "stock_uom", label: "ĐVT", is_unit: true, ratio: 1 },
        { fieldname: "item_name", label: "Tên NVL", is_primary: true, ratio: 3 },
        { fieldname: "warehouse", label: "Kho", is_select_middle: true, options: warehouse, ratio: 4 },
        { fieldname: "actual_qty", label: "SL tiêu hao", is_value: true, ratio: 2 },
    ];

    let columns2 = [
        { fieldname: "item_code", label: "Mã TP", is_secondary: true, ratio: 2 },
        { fieldname: "stock_uom", label: "ĐVT", is_unit: true, ratio: 1 },
        { fieldname: "item_name", label: "Tên TP", is_primary: true, ratio: 3 },
        { fieldname: "warehouse", label: "Kho", is_select_middle: true, options: warehouse, ratio: 4 },
        { fieldname: "actual_qty", label: "SL sản xuất", is_value: true, ratio: 2 },
    ];

    await define_table(frm, $firstWrapper, "Nguyên vật liệu tiêu hao", columns1, requiredsRawData, true, null, null, false, "red");
    await define_table(frm, $secondWrapper, "Thành phẩm", columns2, finishedsRawData, true, null, null, false, "green");
}

async function autofill_items(frm) {
    setTimeout(async () => {
        for (let row of frm.doc.operations) {
            // chỉ xử lý nếu custom_employee chưa có
            if (!row.custom_employee) {
                let op_doc = await frappe.db.get_doc("Operation", row.operation);
                if (op_doc.custom_team && op_doc.custom_team.length > 0) {
                    frappe.model.set_value(row.doctype, row.name, 'custom_employee', op_doc.custom_team[0].employee);
                    frappe.model.set_value(row.doctype, row.name, 'custom_employee_name', op_doc.custom_team[0].employee_name);
                    if (op_doc.custom_team && op_doc.custom_team.length > 1) {
                        frappe.model.set_value(row.doctype, row.name, 'custom_v_employee', op_doc.custom_team[1].employee);
                        frappe.model.set_value(row.doctype, row.name, 'custom_v_employee_name', op_doc.custom_team[1].employee_name);                    
                    }
                }
            }
        }
        frm.refresh_field("operations");
    }, 100);
}

async function change_time(frm) {
    if (frappe.session.user !== "Administrator") return;
    if (frm.doc.status == "Completed") return;
    if (frm.is_new()) return;
    frm.add_custom_button("Chỉnh sửa thời gian", function() {
        let d = new frappe.ui.Dialog({
            title: "Chỉnh sửa mốc thời gian",
            fields: [
                {
                    label: "Planned Start Date",
                    fieldname: "planned_start_date",
                    fieldtype: "Datetime",
                    default: frm.doc.planned_start_date
                },
                {
                    label: "Planned End Date",
                    fieldname: "planned_end_date",
                    fieldtype: "Datetime",
                    default: frm.doc.planned_end_date
                },
                {
                    label: "Actual Start Date",
                    fieldname: "actual_start_date",
                    fieldtype: "Datetime",
                    default: frm.doc.actual_start_date
                },
                {
                    label: "Actual End Date",
                    fieldname: "actual_end_date",
                    fieldtype: "Datetime",
                    default: frm.doc.actual_end_date
                },
            ],
            primary_action_label: "Lưu thay đổi",
            primary_action(values) {
                frappe.call({
                    method: "tahp.doc_events.work_order.before_submit.update_dates",
                    args: {
                        work_order_name: frm.doc.name,
                        actual_start_date: values.actual_start_date,
                        actual_end_date: values.actual_end_date,
                        planned_start_date: values.planned_start_date,
                        planned_end_date: values.planned_end_date
                    },
                });
                frappe.msgprint('Cập nhật thành công')
                d.hide();
            }
        });
        d.show();
    });    
}

// Huy Section
frappe.ui.form.on("Work Order", {
    refresh: async function(frm) {
        frm.set_intro("");
        if (!frm.is_new() && frm.doc.docstatus === 0) show_shift_handover(frm)
    }
});

function show_shift_handover(frm) {
    if (frm.doc.custom_plan && frm.doc.custom_plan_code) {
        frappe.call({ method: "tahp.doc_events.work_order.work_order_api.check_shift_handover",  
            args: { work_order: frm.doc.name, custom_plan: frm.doc.custom_plan, custom_plan_code: frm.doc.custom_plan_code },
            callback: function(r) {
                if (r.message && r.message.warning) { frm.set_intro(""); frm.set_intro(r.message.warning, "orange")}
            }
        });
    }
}

async function define_table(frm, $wrapper, title, columns, data, edittable = false, action = null, action_param = null, confirmAction = true, titleColor = null) {

    const $header = $(`
        <div class="wo-header">
            <div class="wo-header-title" style="color:${titleColor}">${title}</div>
        </div>
    `);
    $wrapper.append($header);

    // 🖥 Desktop view
    const $desktopWrapper = $('<div class="wo-desktop"></div>');
    const $table = $('<table class="wo-table"></table>');
    const totalRatio = columns.reduce((sum, col) => sum + (col.ratio || 1), 0);
    const $thead = $('<thead><tr style="white-space:nowrap;"></tr></thead>');
    columns.forEach(col => {
        const widthPercent = ((col.ratio || 1) / totalRatio * 100).toFixed(2);
        $thead.find('tr').append(`<th style="width:${widthPercent}%">${col.label || ""}</th>`);
    });
    $table.append($thead);

    const $tbody = $('<tbody></tbody>');
    data.forEach((row, i) => {
        const $tr = $('<tr></tr>').css('background-color', i % 2 ? '#fff' : '#f9f9f9');
        columns.forEach(col => {
            const widthPercent = ((col.ratio || 1) / totalRatio * 100).toFixed(2);
            let $td = $('<td></td>').css('width', `${widthPercent}%`);
            
            if (col.is_value) {
                const $input = $(`<input type="number" value="${row[col.fieldname] ?? ''}" class="wo-input wo-value-input" data-fieldname="${col.fieldname}" data-rowindex="${i}">`);
                $td.append($input);
            } 
            else if (col.is_select_middle) {
                const options = Array.isArray(col.options)
                    ? col.options
                    : (typeof col.options === "string" ? col.options.split(",").map(o => o.trim()) : []);
                const $select = $('<select class="wo-select-middle"></select>')
                    .attr("data-fieldname", col.fieldname)
                    .attr("data-rowindex", i);
                options.forEach(opt => {
                    const $opt = $(`<option value="${opt}">${opt}</option>`);
                    if (row[col.fieldname] === opt) $opt.prop("selected", true);
                    $select.append($opt);
                });
                $td.append($select);
            }
            else {
                $td.text(row[col.fieldname] || '');
            }

            $tr.append($td);
        });
        $tbody.append($tr);
    });
    $table.append($tbody);
    $desktopWrapper.append($table);
    $wrapper.append($desktopWrapper);

    // 📱 Mobile view
    const $mobileWrapper = $('<div class="wo-mobile"></div>');

    // 🧩 Header mobile
    const $mobileHeader = $('<div class="wo-mobile-header"></div>');
    const $leftHeader = $('<div class="wo-col wo-col-left"></div>');
    const $middleHeader = $('<div class="wo-col wo-col-middle"></div>');
    const $rightHeader = $('<div class="wo-col wo-col-right"></div>');

    const primaryLabel = columns.find(c => c.is_primary)?.label || '';
    const middleLabels = columns.filter(c => c.is_middle || c.is_select_middle).map(c => c.label);
    const valueLabel = columns.find(c => c.is_value)?.label || '';

    $leftHeader.append(`<div class="wo-header-cell">${primaryLabel}</div>`);
    middleLabels.forEach(lbl => $middleHeader.append(`<div class="wo-header-cell">${lbl}</div>`));
    $rightHeader.append(`<div class="wo-header-cell">${valueLabel}</div>`);
    $mobileHeader.append($leftHeader, $middleHeader, $rightHeader);
    $mobileWrapper.append($mobileHeader);

    data.forEach((row, rowIndex) => {
        const primary = columns.find(c => c.is_primary);
        const secondary = columns.find(c => c.is_secondary);
        const middles = columns.filter(c => c.is_middle || c.is_select_middle);
        const valueCol = columns.find(c => c.is_value);
        const unitCol = columns.find(c => c.is_unit);

        const $row = $('<div class="wo-tb-mobile-row"></div>').css('background-color', rowIndex % 2 ? '#fff' : '#f5f5f5');
        const $left = $('<div class="wo-col wo-col-left"></div>');
        $left.append(
            `<div class="wo-primary">${row[primary?.fieldname] || ''}</div>`,
            `<div class="wo-secondary">${row[secondary?.fieldname] || ''}</div>`
        );

        const $middle = $('<div class="wo-col wo-col-middle"></div>');
        middles.forEach(m => {
            if (m.is_select_middle) {
                const options = Array.isArray(m.options)
                    ? m.options
                    : (typeof m.options === "string" ? m.options.split(",").map(o => o.trim()) : []);
                const $select = $('<select class="wo-select-middle"></select>')
                    .attr("data-fieldname", m.fieldname)
                    .attr("data-rowindex", rowIndex);
                options.forEach(opt => {
                    const $opt = $(`<option value="${opt}">${opt}</option>`);
                    if (row[m.fieldname] === opt) $opt.prop("selected", true);
                    $select.append($opt);
                });
                $middle.append($select);
            } else {
                if (row[m.fieldname]) $middle.append(`<div class="wo-middle-item">${row[m.fieldname]}</div>`);
            }
        });

        const $right = $('<div class="wo-col wo-col-right"></div>');
        let value = row[valueCol?.fieldname] ?? '';
        const $valueInput = $(`<input type="number" class="wo-input-value wo-value-input" data-fieldname="${valueCol?.fieldname}" data-rowindex="${rowIndex}" value="${value}">`);
        if (unitCol) $right.append($valueInput, `<span class="wo-unit">${row[unitCol.fieldname] || ''}</span>`);
        else $right.append($valueInput);

        $row.append($left, $middle, $right);
        $mobileWrapper.append($row);
    });
    $wrapper.append($mobileWrapper);

    // 🔄 Đồng bộ input & select giữa desktop và mobile
    $wrapper.on('input change', '.wo-value-input, .wo-select-middle', function() {
        const $this = $(this);
        const field = $this.data('fieldname');
        const rowIndex = $this.data('rowindex');
        const val = $this.val();
        $wrapper.find(`[data-fieldname="${field}"][data-rowindex="${rowIndex}"]`)
            .not($this)
            .val(val);
    });

    // ✏️ Inline editing logic giữ nguyên
    let editing = false;
    const $inputs = $wrapper.find('.wo-value-input');

    function enableInlineEditing(inputs) {
        if (editing) return;
        editing = true;
        inputs.each(function(index) {
            const $input = $(this);
            $input.addClass("wo-editing").data("original-value", $input.val());
            $input.on("keydown.nextFocus", function(e) {
                if (e.key === "Enter" || e.keyCode === 13) {
                    e.preventDefault();
                    const nextIndex = index + 1;
                    if (nextIndex < inputs.length) {
                        scrollAndFocus(inputs, nextIndex);
                    } else {
                        $input.blur();
                    }
                }
            });
            $input.on("blur.saveCheck", function() {
                setTimeout(() => {
                    if (!$(".wo-editing:focus").length) {
                        if (confirmAction) {
                            frappe.confirm(
                                "Lưu thay đổi?",
                                () => {
                                    const result = covertAllData(data, $wrapper.find('.wo-value-input, .wo-select-middle'));
                                    if (action) console.log(result);
                                    disableInlineEditing(inputs, false);
                                },
                                () => { disableInlineEditing(inputs, true); }
                            );
                        } else {
                            const result = covertAllData(data, $wrapper.find('.wo-value-input, .wo-select-middle'));
                            if (action) console.log(result);
                            disableInlineEditing(inputs, false);
                        }
                    }
                }, 150);
            });
        });
    }

    function disableInlineEditing(inputs, reset = false) {
        editing = false;
        inputs.each(function() {
            const $input = $(this);
            if (reset) $input.val($input.data("original-value"));
            $input.removeClass("wo-editing").off("keydown.nextFocus").off("blur.saveCheck");
        });
    }

    $wrapper.on("focus", ".wo-value-input", function() {
        if (!editing) enableInlineEditing($inputs);
    });
}

function scrollAndFocus(inputs, index) {
    const $input = inputs.eq(index);
    const $row = $input.closest('.wo-tb-mobile-row');
    const isMobile = window.innerWidth <= 768;
    if (isMobile && $row.length) $row[0].scrollIntoView({ behavior: 'smooth' });
    $input.focus();
}

function covertAllData(data, inputs) {
    const newData = data.map((row, rowIndex) => {
        const newRow = { ...row };
        inputs.each(function() {
            const $input = $(this);
            if (Number($input.attr('data-rowindex')) === rowIndex) {
                const field = $input.attr('data-fieldname');
                let val = $input.val();

                if (!isNaN(val) && val.trim() !== '') {
                    val = parseFloat(val);
                }

                newRow[field] = val;
            }
        });
        return newRow;
    });
    return newData;
}
