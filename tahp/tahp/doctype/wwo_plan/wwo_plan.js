// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

// frappe.ui.form.on("WWO Plan", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on('WWO Plan', {
    onload: function(frm) {
        setup_ui(frm);
        setup_hook(frm);
    },
    refresh: async function(frm) {
        setup_ui(frm);
        const response = await frappe.call({method: 'tahp.api.wwo_plan', args:{plan: frm.doc.name}});
        await generate_data(frm, response.message);
    },
    workflow_state: function(frm) {
        frm.reload_doc();
    }
});

// frappe.ui.form.on('WWO Plan Item', {
//     form_render: function(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         console.log(row)
//         // Đổi các field thành link
//         // setTimeout(() => {
//         //     const rowWrapper = $(`[data-idx="${row.idx}"]`);

//         //     // Ghi đè WWO
//         //     const wwoField = rowWrapper.find(`[data-fieldname="wwo"] .control-value`);
//         //     if (row.wwo && wwoField.length) {
//         //         wwoField.html(`<a href="/app/week-work-order/${row.wwo}" target="_blank">${row.wwo}</a>`);
//         //     }
//         //     // Ghi đè Item
//         //     const itemField = rowWrapper.find(`[data-fieldname="item"] .control-value`);
//         //     if (row.item && itemField.length) {
//         //         itemField.html(`<a href="/app/item/${row.item}" target="_blank">${row.item}</a>`);
//         //     }

//         //     // Ghi đè BOM
//         //     const bomField = rowWrapper.find(`[data-fieldname="bom"] .control-value`);
//         //     if (row.bom && bomField.length) {
//         //         bomField.html(`<a href="/app/bom/${row.bom}" target="_blank">${row.bom}</a>`);
//         //     }
//         // }, 100);
        
//         if (!frappe.user_roles.includes("Giám đốc")) return;
//         // Phần hiển thị nút nếu "Đợi GĐ duyệt"
//         if (row.approved === "Đợi GĐ duyệt") {
//             setTimeout(() => {
//                 const rowWrapper = $(`[data-idx="${row.idx}"]`);
//                 const approvedField = rowWrapper.find(`[data-fieldname="approved"] .control-value`);
                
//                 approvedField.html(`
//                     <div class="d-flex flex-column p-2">
//                         <button class="btn btn-custom btn-sm w-100 mb-2" name="tu-choi-khsx" value="${row.wwo}" style="background-color: white;">Từ chối KHSX</button>
//                         <button class="btn btn-custom btn-sm w-100 mb-2" name="tu-choi-ptcn" value="${row.wwo}" style="background-color: white;">Từ chối PTCN</button>
//                         <button class="btn btn-custom btn-primary btn-sm w-100" name="duyet" value="${row.wwo}">Duyệt</button>
//                     </div>
//                 `);
//                 approvedField.css('pointer-events', 'none');
//                 approvedField.find('.btn').css('pointer-events', 'auto');
//                 // Gắn click handler
//                 $('.btn-custom').off('click').on('click', function(e) {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     e.stopImmediatePropagation();
//                     const action = $(this).attr('name');
//                     const wwo = $(this).val();

//                     const actionHandlerMap = {
//                         'tu-choi-khsx': (frm, wwo) => process_wwo_mobile(frm, wwo, 'Nháp', 'Nhập lý do từ chối KHSX', 'Đã từ chối KHSX', 'KHSX', 'WWO bị từ chối KHSX', cdt, cdn),
//                         'tu-choi-ptcn': (frm, wwo) => process_wwo_mobile(frm, wwo, 'Đợi PTCN duyệt', 'Nhập lý do từ chối PTCN', 'Đã từ chối PTCN', 'PTCN', 'WWO bị từ chối PTCN', cdt, cdn),
//                         'duyet': (frm, wwo) => approved_mobile(frm, wwo, cdt, cdn)
//                     };

//                     if (actionHandlerMap[action]) {
//                         actionHandlerMap[action](frm, wwo);
//                     }
//                 });
//             }, 100);
//         }
//     }
// });

function setup_ui(frm) {
    // Giao diện rộng và ẩn các thành phần không cần thiết
    document.body.classList.add('full-width');
    // $('.col-lg-2.layout-side-section, .sidebar-toggle-btn, .btn-open-row').hide();
    // $('.sidebar-toggle-placeholder').click();
    $('.btn-open-row, .form-message-container').hide();
    frm.page.btn_primary.hide();
    const sidebar = document.querySelector('.col-lg-2.layout-side-section');
    const toggleBtn = document.querySelector('.sidebar-toggle-icon');
    if (sidebar && toggleBtn && getComputedStyle(sidebar).display !== 'none') {
        if (window.innerWidth > 768) {
            toggleBtn.click();
        }
    }

    // Cấm can thiệp vào bảng
    frm.set_df_property('items', 'cannot_add_rows', false);
    frm.set_df_property('items', 'cannot_delete_rows', false);
    frm.set_df_property('items', 'cannot_delete_all_rows', false);
    frm.set_df_property('items', 'cannot_edit_rows', false);
    frm.set_df_property('items', 'read_only', false);
    frm.set_df_property('items', 'in_place_edit', false);
    frm.add_custom_button('Thêm phương án LSX', () => add_wwo(frm)).addClass("btn-primary");
   // $('.col.grid-static-col.d-flex.justify-content-center').css({'visibility':'hidden'});
    console.log(frm)
}

function add_wwo(frm) {
    
}
function hook_css_cleanup() {
    if (window._wwo_css_hooked) return;
    window._wwo_css_hooked = true;

    frappe.router.on('change', () => {
        if (frappe.router.current_route[0] !== 'WWO Plan') {
            $('#wwo-css').remove();             // Xóa CSS riêng
            $('#custom-tooltip').remove();      // Xóa tooltip nếu có
            window._wwo_css_hooked = false;     // Cho phép gắn lại khi quay lại
        }
    });
}

function setup_css() {
    if ($('#wwo-css').length) return;
    
    $('<style>')
        .prop('type', 'text/css')
        .prop('id', 'wwo-css')
        .html(`
            .col.grid-static-col.d-flex.justify-content-center {display:none!important;}
            .form-grid {border:2px solid #101010ff; border-radius:4px; box-shadow:none; margin-bottom:20px;}
            .grid-row, .grid-heading-row {border-bottom:1px solid #101010ff;}
            .rows .grid-row { padding-bottom: 20px;padding-top: 20px;}
            .rows .btn { pointer-events: auto; }
        
            .btn-custom {
                padding: 4px 10px;
                margin-right: 8px;
            }
            .btn-custom:last-child {
                margin-right: 0;
            }
            .btn-custom:focus,
            .btn-custom:active {
                box-shadow: none !important;
                outline: none !important;
            }
            .custom-tooltip {
                position: absolute;
                z-index: 9999;
                background: white;
                color: #000;
                border: 1px solid #ccc;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 10px 14px;
                font-size: 14px;
                max-width: 600px;
                white-space: pre-line;
                display: none;
            }
        
            .rows [data-fieldname="bom"],
            .rows [data-fieldname="item"],
            .rows [data-fieldname="wwo"],
            .rows [data-fieldname="note"] .static-area {
                pointer-events: auto;
                cursor: pointer;
            }
        
            @media (min-width: 768px) {
                .rows [data-fieldname="bom"],
                .rows [data-fieldname="item"],
                .rows [data-fieldname="wwo"],
                .rows [data-fieldname="note"] .static-area {
                    text-decoration: underline;
                }
            }
        `)
        .appendTo('head');
    hook_css_cleanup();
}

function setup_hook(frm) {
    setup_css();

    if (window.innerWidth > 768) {
        setTimeout(() => {
            $('.rows').css('pointer-events', 'none');
            $('.rows .btn').css('pointer-events', 'auto');
            setup_bom_tooltip_events();
            setup_item_tooltip_events();
            setup_wwo_link_events();
            setup_note(frm);
        }, 100);
    } else {
        // Nếu là mobile, hiển thị hướng dẫn phía trên child table
        setTimeout(() => {
            $(frm.fields_dict.items.$wrapper)
            .find('.grid-description')
            .hide();
            const table_wrapper = $(frm.fields_dict.items.wrapper);
            if (!table_wrapper.find('.mobile-info-msg').length) {
                $('<div class="mobile-info-msg mb-2 text-muted" style="font-size: 14px;">Bấm vào từng dòng để xem thông tin và thao tác LSX tuần</div>')
                    .prependTo(table_wrapper);
            }
        }, 100);
        setup_note_mobile(frm);
    }
}

async function generate_data(frm, week) {
    if (frm.doc.docstatus !== 0) {
        setup_hook(frm);
        return;
    }
    else {
        frappe.model.clear_table(frm.doc, 'items');
        week.forEach(week => {
            week.items.forEach(async function(row, index) {
                frm.add_child('items', {
                    wwo: index === 0 ? week.name : "",
                    approved: index === 0 ? week.workflow_state : "",
                    item: row.item,
                    qty: row.qty,
                    bom: row.bom,
                    planned_start_time: row.planned_start_time,
                    planned_end_time: row.planned_end_time
                });
            });
        });
        frm.refresh_field('items');
        setup_button(frm);
        setup_hook(frm);
    }
}

async function setup_button(frm) {
    console.log('setup_button', window.innerWidth)
    if (window.innerWidth <= 768) return;
    if (!frappe.user_roles.includes("Giám đốc")) {
        return};
    const wrapper = frm.fields_dict.items.grid.wrapper;
    $('[data-fieldname="approved"]').addClass('d-flex justify-content-center align-items-center p-0');
    wrapper.find('.grid-body [data-fieldname="approved"]').each(function () {
        const $cell = $(this);
        const cellValue = $cell.find('.static-area').text().trim();
        const rowIndex = parseInt($cell.closest('.grid-row').attr('data-idx'), 10);
        const rowData = frm.doc.items[rowIndex - 1];
        html = cellValue === "Đợi GĐ duyệt" 
        ? 
        `<button class="btn btn-secondary btn-sm btn-custom" name="tu-choi-khsx2" value="${rowData.wwo}">Từ chối KHSX</button>
        <button class="btn btn-secondary btn-sm btn-custom" name="tu-choi-ptcn2" value="${rowData.wwo}">Từ chối PTCN</button>
        <button class="btn btn-primary btn-sm btn-custom" name="duyet2" value="${rowData.wwo}">Duyệt</button>`
        : ` `
        const row = $cell.closest('.grid-row');
        row.prepend(`<div class = "data-row row d-flex justify-content-between align-items-center p-0"> 
            <div> ${rowData.wwo} </div>
            <div> 
                ${html}  
            </div>
            </div>`)
        row.append(`<div class = "data-row row d-flex justify-content-between align-items-center p-0"> 
            <div> ${rowData.note?rowData.note: "Không có ghi chú"} </div>
            </div>`)
        $cell.find('.static-area').hide();
    });

    // Gắn sự kiện xử lý click cho các nút
    $('.btn-custom').off('click').on('click', function (e) {
        e.stopPropagation();
        const action = $(this).attr('name');
        const wwo = $(this).val();

        // Bản đồ hàm xử lý riêng
        const actionHandlerMap = {
            'tu-choi-khsx2': handle_ignore_plan,
            'tu-choi-ptcn2': handle_ignore_tech,
            'duyet2': handle_approve
        };

        if (actionHandlerMap[action]) actionHandlerMap[action](frm, wwo);
    });
}

const actionHandlerMap = {
    'tu-choi-khsx2': handle_ignore_plan,
    'tu-choi-ptcn2': handle_ignore_tech,
    'duyet2': handle_approve
};

async function setup_note_mobile(frm) {
    for (let row of frm.doc.items) {
        if (row.wwo) {
            const wwo = await frappe.db.get_doc('Week Work Order', row.wwo);
            if (wwo.note) {
                row.note = wwo.note
            }
        }
    }
    frm.refresh_field("items");
}

async function setup_note(frm) {
    setTimeout(async () => {
        const promises = [];

        $('[data-fieldname="note"]').each(function () {
            const $cell = $(this);
            const $row = $cell.closest('.grid-row');
            if (!$row.length) return;

            const rowIndex = parseInt($row.attr('data-idx'), 10);
            if (isNaN(rowIndex)) return;

            const rowData = frm.doc.items[rowIndex - 1];
            const wwo = rowData?.wwo?.trim();
            if (!wwo) return;
            const promise = frappe.db.get_value('Week Work Order', wwo, 'note')
                .then(res => {
                    const note = res?.message?.note?.trim() || 'Không có ghi chú';
                    $cell.find('.static-area').text('Xem ghi chú');
                    $cell.attr('data-tooltip-content', note);
                })
                .catch(err => {
                    console.warn(`Không thể lấy note từ WWO ${wwo}:`, err);
                    $cell.find('.static-area').text('Xem ghi chú');
                    $cell.attr('data-tooltip-content', 'Không có ghi chú');
                });

            promises.push(promise);
        });

        await Promise.all(promises);
        setup_note_tooltip_events();
    }, 100);
}

async function wwo_flow(frm, wwo_name, state) {
    const response = await frappe.call({ method: 'tahp.api.wwo_flow', args: { name: wwo_name, workflow: state }});
    return response;
}

async function process_wwo(frm, wwo, state, message, alert_message, role, notification) {
    frappe.prompt({
        label: 'Lý do từ chối',
        fieldname: 'comment',
        fieldtype: 'Small Text',
        reqd: true
    }, async function (values) {
        // Ghi comment
        await frappe.call({
            method: "frappe.desk.form.utils.add_comment",
            args: {
                reference_doctype: "Week Work Order",
                reference_name: wwo,
                content: values.comment,
                comment_type: "Comment",
                comment_email: frappe.session.user,
                comment_by: frappe.session.user_fullname,
            }
        });

        // Gửi notify không cần callback
        await frappe.call({ method: "tahp.api.wwo_notify", args: { role: role, subject: notification, document_type: "Week Work Order", document_name: wwo}});
        await wwo_flow(frm, wwo, state);
        frm.reload_doc();
        frappe.show_alert(alert_message);
    }, message);
}

async function process_wwo_mobile(frm, wwo, state, message, alert_message, role, notification, cdt, cdn) {
    const dialog = new frappe.ui.Dialog({
        title: message || 'Nhập lý do từ chối',
        fields: [
            {
                label: 'Lý do từ chối',
                fieldname: 'comment',
                fieldtype: 'Small Text',
                reqd: true
            }
        ],
        primary_action_label: 'Xác nhận',
        primary_action: async (values) => {
            try {
                await frappe.call({
                    method: "frappe.desk.form.utils.add_comment",
                    args: {
                        reference_doctype: "Week Work Order",
                        reference_name: wwo,
                        content: values.comment,
                        comment_type: "Comment",
                        comment_email: frappe.session.user,
                        comment_by: frappe.session.user_fullname,
                    }
                });

                await frappe.call({
                    method: "tahp.api.wwo_notify",
                    args: {
                        role: role,
                        subject: notification,
                        document_type: "Week Work Order",
                        document_name: wwo
                    }
                });

                await wwo_flow(frm, wwo, state);
                const row = locals[cdt][cdn];
                row.approved = state;
                const grid_row = frm.fields_dict["items"].grid.grid_rows_by_docname[cdn];
                if (grid_row) {
                    grid_row.refresh_field("approved");
                }
                frm.refresh_field('items');
                frm.fields_dict["items"].refresh();
                frappe.show_alert(alert_message);
                $('.modal').off('hide.bs.modal');
                dialog.hide();
            } catch (error) {
                console.error("Lỗi xử lý:", error);
                frappe.msgprint("Đã xảy ra lỗi khi xử lý. Vui lòng thử lại.");
            }
        },
        secondary_action_label: 'Đóng',
        secondary_action: () => {
            $('.modal').off('hide.bs.modal');
            dialog.hide();
        }
    });

    dialog.$wrapper.on('shown.bs.modal', function () {
        const modal = dialog.$wrapper.data('bs.modal');
        if (modal) {
            modal._config.backdrop = 'static';
            modal._config.keyboard = false;
        }
    });

    dialog.show();
    dialog.get_close_btn().hide();
}

async function approved_mobile(frm, wwo, cdt, cdn) {
    const confirm_dialog = new frappe.ui.Dialog({
        title: 'Xác nhận',
        fields: [
            {
                fieldtype: 'HTML',
                options: `Đồng ý duyệt LSX Tuần ${wwo}?`
            }
        ],
        primary_action_label: 'Xác nhận',
        primary_action: async () => {
            try {
                let response = await wwo_flow(frm, wwo, 'Duyệt xong');

                if (response.alert === true) {
                    const alert_dialog = new frappe.ui.Dialog({
                        title: "Không thể duyệt",
                        fields: [
                            {
                                fieldtype: "HTML",
                                options: `<p>Không thể duyệt LSX Tuần này vì <b>nhân viên đã hủy trình</b>. Chuẩn bị load lại trạng thái các LSX Tuần</p>`
                            }
                        ],
                        primary_action_label: "Đã hiểu",
                        primary_action: () => {
                            alert_dialog.hide();
                            confirm_dialog.hide();
                            frm.reload_doc();
                        }
                    });

                    alert_dialog.$wrapper.on('shown.bs.modal', function () {
                        const modal = alert_dialog.$wrapper.data('bs.modal');
                        if (modal) {
                            modal._config.backdrop = 'static';
                            modal._config.keyboard = false;
                        }
                    });

                    alert_dialog.get_close_btn().hide();
                    alert_dialog.show();
                    return;
                }

                if (response.error_html) {
                    const error_dialog = new frappe.ui.Dialog({
                        size: 'extra-large',
                        title: "Phát hiện trùng lịch",
                        fields: [
                            {
                                fieldtype: "HTML",
                                options: response.error_html
                            }
                        ],
                        primary_action_label: "Đã hiểu",
                        primary_action: () => {
                            $('.modal').off('hide.bs.modal');
                            error_dialog.hide();
                            confirm_dialog.hide();
                        }
                    });

                    error_dialog.$wrapper.on('shown.bs.modal', function () {
                        const modal = error_dialog.$wrapper.data('bs.modal');
                        if (modal) {
                            modal._config.backdrop = 'static';
                            modal._config.keyboard = false;
                        }
                    });

                    error_dialog.get_close_btn().hide();
                    error_dialog.show();
                    return;
                }

                await frappe.call({
                    method: "tahp.api.wwo_notify",
                    args: {
                        role: 'Kế hoạch sản xuất',
                        subject: `LSX Tuần ${wwo} đã được duyệt`,
                        document_type: "Week Work Order",
                        document_name: wwo
                    }
                });
                
                const approved_dialog = new frappe.ui.Dialog({
                    title: "Duyệt thành công!",
                    fields: [
                        {
                            fieldtype: "HTML",
                            options: `<p>Duyệt thành công!</p>`
                        }
                    ],
                    primary_action_label: "Đã hiểu",
                    primary_action: () => {
                        approved_dialog.hide();
                    }
                });

                approved_dialog.$wrapper.on('shown.bs.modal', function () {
                    const modal = approved_dialog.$wrapper.data('bs.modal');
                    if (modal) {
                        modal._config.backdrop = 'static';
                        modal._config.keyboard = false;
                    }
                });

                approved_dialog.get_close_btn().hide();
                approved_dialog.show();
                frm.reload_doc();
                frappe.show_alert("LSX Tuần đã được duyệt");
                $('.modal').off('hide.bs.modal');
                confirm_dialog.hide();
            } catch (error) {
                frappe.msgprint("Đã xảy ra lỗi khi xử lý. Vui lòng thử lại.");
            }
        },
        secondary_action_label: 'Đóng',
        secondary_action: () => {
            $('.modal').off('hide.bs.modal');
            confirm_dialog.hide();
        }
    });

    confirm_dialog.$wrapper.on('shown.bs.modal', function () {
        const modal = confirm_dialog.$wrapper.data('bs.modal');
        if (modal) {
            modal._config.backdrop = 'static';
            modal._config.keyboard = false;
        }
    });

    confirm_dialog.get_close_btn().hide();
    confirm_dialog.show();
}

async function handle_ignore_plan(frm, wwo) {
    await process_wwo(frm, wwo, 'Nháp', `Từ chối LSX Tuần ${wwo} và trả về KHSX?`, 'Đã trả về KHSX', 'Kế hoạch sản xuất', `LSX Tuần ${wwo} đã bị từ chối, KHSX vui lòng kiểm tra lại`);
}

async function handle_ignore_tech(frm, wwo) {
    await process_wwo(frm, wwo, 'Đợi PTCN duyệt', `Từ chối LSX Tuần ${wwo} và trả về PTCN?`, 'Đã trả về PTCN', 'Phát triển công nghệ', `LSX Tuần ${wwo} đã bị từ chối, PTCN vui lòng kiểm tra lại`)
}

async function handle_approve(frm, wwo) {
    frappe.confirm(`Đồng ý duyệt LSX Tuần ${wwo}?`, async function () {
        let response = await wwo_flow(frm, wwo, 'Duyệt xong');
        if (response.alert === true) {
            frappe.confirm(
                "Không thể duyệt LSX Tuần này vì NV đã hủy trình. Nhấn Ok để tải lại trang",
                () => { frm.reload_doc(); }
            );
            return;
        } 
        
        if (response.error_html) {
            const error_dialog = new frappe.ui.Dialog({
                title: "Phát hiện trùng lịch",
                size: 'extra-large', // tùy chọn: 'small', 'large', 'extra-large'
                indicator: 'red',
                fields: [
                    {
                        fieldtype: "HTML",
                        options: response.error_html
                    }
                ],
                primary_action_label: "Đã hiểu",
                primary_action: () => {
                    error_dialog.hide();
                }
            });
        
            error_dialog.show();
            return;
        }

        
        await frappe.call({ method: "tahp.api.wwo_notify", args: { role: 'Kế hoạch sản xuất', subject: `LSX Tuần ${wwo} đã được duyệt`, document_type: "Week Work Order", document_name: wwo}});
        frappe.show_alert({
            message:__('Duyệt phương án thành công!'),
            indicator:'green'
        }, 5);
        frm.reload_doc();
    });
}

function ensure_tooltip_container() {
    if (!$('#custom-tooltip').length) {
        $('body').append('<div id="custom-tooltip" class="custom-tooltip"></div>');
    }
}

function setup_bom_tooltip_events() {
    const $bomLinks = $('[data-fieldname="bom"]');

    $bomLinks.off('mouseenter mouseleave mousemove click');

    $bomLinks.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const bomName = $(this).text().trim();
        if (bomName && bomName !== "CTSX") {
            window.open(`/app/bom/${encodeURIComponent(bomName)}`, '_blank');
        }
    });

    $bomLinks.on('mouseenter', async function () {
        const bomName = $(this).text().trim();
        if (!bomName || bomName === "CTSX") return;
        const tooltipContent = $(this).attr('data-tooltip-content');
        if (tooltipContent) {
            $('#custom-tooltip').text(tooltipContent).show();
            return;
        }

        try {
            const bom = await frappe.db.get_doc('BOM', bomName);
            let tooltipText = `Nguyên liệu:\n`;
            (bom.items || []).forEach(item => {
                tooltipText += `• ${item.item_code} - ${item.item_name || ''} (${item.qty} ${item.uom})\n`;
            });

            if (Array.isArray(bom.custom_param_items) && bom.custom_param_items.length > 0) {
                tooltipText += `\nThông số:\n`;
                bom.custom_param_items.forEach(param => {
                    tooltipText += `• ${param.parameter}: ${param.min_value ?? '-'} → ${param.max_value ?? '-'}\n`;
                });
            }

            if (bom.custom_density) {
                tooltipText += `\nTỷ trọng: ${bom.custom_density}`;
            }

            const finalTooltip = tooltipText.trim();
            $('#custom-tooltip').text(finalTooltip).show();
            $(this).attr('data-tooltip-content', finalTooltip);
        } catch (err) {
            console.warn('Lỗi tooltip BOM:', bomName, err);
        }
    });

    $bomLinks.on('mousemove', function (e) {
        $('#custom-tooltip').css({
            top: e.pageY + 15 + 'px',
            left: e.pageX + 15 + 'px'
        });
    });

    $bomLinks.on('mouseleave', function () {
        $('#custom-tooltip').hide();
    });

    if (!$('#custom-tooltip').length) {
        ensure_tooltip_container()
    }
}

function setup_item_tooltip_events() {
    const $itemLinks = $('[data-fieldname="item"]');

    $itemLinks.off('mouseenter mouseleave mousemove click');

    $itemLinks.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const itemCode = $(this).text().trim();
        if (itemCode && itemCode !== "Mặt hàng") {
            window.open(`/app/item/${encodeURIComponent(itemCode)}`, '_blank');
        }
    });

    $itemLinks.on('mouseenter', async function () {
        const itemCode = $(this).text().trim();
        if (!itemCode || itemCode === "Mặt hàng") return;
        const tooltipContent = $(this).attr('data-tooltip-content');
        if (tooltipContent) {
            $('#custom-tooltip').text(tooltipContent).show();
            return;
        }

        try {
           
            const item = await frappe.db.get_doc('Item', itemCode);
            let tooltipText = `Mã: ${item.item_code}\nTên: ${item.item_name || ''}\nNhóm: ${item.item_group || ''}`;
            $('#custom-tooltip').text(tooltipText).show();
            $(this).attr('data-tooltip-content', tooltipText);
        } catch (err) {
            console.warn('Lỗi tooltip Item:', itemCode, err);
        }
    });

    $itemLinks.on('mousemove', function (e) {
        $('#custom-tooltip').css({
            top: e.pageY + 15 + 'px',
            left: e.pageX + 15 + 'px'
        });
    });

    $itemLinks.on('mouseleave', function () {
        $('#custom-tooltip').hide();
    });

    if (!$('#custom-tooltip').length) {
        ensure_tooltip_container()
    }
}

function setup_wwo_link_events() {
    const $wwoLinks = $('[data-fieldname="wwo"]');

    $wwoLinks.off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const wwoName = $(this).text().trim();
        if (wwoName) {
            window.open(`/app/week-work-order/${encodeURIComponent(wwoName)}`, '_blank');
        }
    });
}

function setup_note_tooltip_events() {
    const $noteLinks = $('[data-fieldname="note"] .static-area');

    $noteLinks.off('mouseenter mouseleave mousemove click');

    $noteLinks.on('click', function (e) {
        // Chặn mọi ảnh hưởng đến hàng hoặc trigger mở row
        e.preventDefault();
        e.stopPropagation();
    });

    $noteLinks.on('mouseenter', function () {
        const tooltipContent = $(this).closest('[data-fieldname="note"]').attr('data-tooltip-content') || 'Không có ghi chú';
        $('#custom-tooltip').text(tooltipContent).show();
    });

    $noteLinks.on('mousemove', function (e) {
        $('#custom-tooltip').css({
            top: e.pageY + 15 + 'px',
            left: e.pageX + 15 + 'px'
        });
    });

    $noteLinks.on('mouseleave', function () {
        $('#custom-tooltip').hide();
    });

    if (!$('#custom-tooltip').length) {
        ensure_tooltip_container()
    }
}
