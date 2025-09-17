// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Quality Card", {
	refresh(frm) {
        frm.events.clean_display(frm)
        frm.events.define_layout(frm)
	},

    define_layout: async function(frm) {
        let $wrapper = frm.fields_dict["display"].$wrapper
        $wrapper.empty()
        $wrapper.addClass("jc-layout d-flex flex-wrap w-100")

        let $row1 = $(`<div class="jc-container w-100 jc-col"></div>`)
        $wrapper.append($row1)

        frm.events.define_table(
            frm, $row1, 'Điều khiển',
            columns=[
                { label: 'Công đoạn', fieldname: 'tracker', is_primary: true },
                { label: 'Nhân viên', fieldname: 'employee', is_secondary: true },
                { label: 'Tần suất', fieldname: 'frequency' },
                { label: 'Bắt đầu lúc', fieldname: 'from_time', is_secondary: true },
                { label: 'Kết quả', fieldname: 'is_done', is_value: true, type: "string" },
                { label: 'SP đã điền', fieldname: 'qty', is_unit: true},
                {
                    label: 'Hành động',
                    fieldname: 'action',
                    action: [
                        {
                            label: "Xem phiếu",
                            class: "btn btn-sm btn-success jc-btn",
                            handler: async (row) => {
                                let response = await frappe.call({method: "tahp.tahp.doctype.quality_card.quality_card.get_qc", args:{work_order: frm.doc.work_order, tracker: row.tracker}})
                                if (response.message) {
                                    frappe.set_route("Form", "Quality Inspection", r.message);
                                } else {
                                    frappe.show_alert("Không tìm thấy phiếu QC")
                                }
                            }
                        },
                    ]
                }
            ],
            data=(frm.doc.items || []).map(d => {
                return {
                    employee: d.employee,
                    tracker: d.tracker,
                    frequency: d.frequency,
                    is_done: d.is_done ? 'Đạt' : "Không đạt"  ,
                    from_time: d.from_time ? frappe.datetime.str_to_obj(d.from_time).toTimeString().split(" ")[0] : null,
                    qty: `${d.qty_done}`
                };
            }),
            edittable=false,
            action = async () => {await frm.events.update_team_async(frm)},
        )
    },

    clean_display: function(frm) {
        frm.set_intro("")
        frm.page.clear_primary_action()
        frm.timeline.wrapper.hide()
        frm.comment_box.comment_wrapper.hide()

        let background = '#f4f7fc';
        const isMobile = window.innerWidth <= 768;

        let $wrapper = $(frm.$wrapper);
        $wrapper.find('[data-fieldname="__section_1"]').css({'background': background, 'border-radius': '10px'})
        $wrapper.find('.layout-main').css({'margin-inline': '-30px'})
        $wrapper.find('.form-page').css({'border': 'none'})
        $wrapper.find('.layout-main-section-wrapper').attr('style', 'padding-left:5px !important; padding-right:5px !important;')
        $wrapper.find('.form-column').attr('style', 'padding-left:5px !important; padding-right:5px !important;')
    },

    define_table: function(frm, $wrapper, title, columns, data, edittable=false, action=null) {

        // Header
        let $header = $(`
            <div class="d-flex flex-wrap justify-content-between jc-title jc-tb-title">
                <div class="flex-grow-1">${title}</div>
            </div>
        `);
        $wrapper.append($header);

        // Nút sửa
        if ((edittable || action) && frm.doc.docstatus === 0 && frm.doc.active === 0) {
            if (data.length > 0) {
                let $editBtn = $('<button class="btn btn-primary d-none d-md-table jc-edit-btn">Bắt đầu</button>')
                $header.append($editBtn)
            }

            if (!edittable && action && data.length > 0) {
                let $editBtn = $('<button class="btn btn-primary d-md-none jc-edit-btn">Bắt đầu</button>')       
                $header.append($editBtn)                
            }

            // let $editMobileBtn = $('<button class="btn btn-secondary d-md-none w-100 mt-2 jc-edit-btn jc-mobile-input">Sửa</button>')
            // $wrapper.append($editMobileBtn)
        }


        // Desktop
        let $desktopWrapper = $('<div class="d-none d-md-block overflow-auto"></div>');
        let $desktopTable = $('<table class="table table-sm"></table>')
        let $thead = $('<thead><tr></tr></thead>')
        columns.forEach(col => {
            let th = `<th>${col.label || ""}</th>`
            $thead.find('tr').append(th)
        })
        $desktopWrapper.append($desktopTable);
        $desktopTable.append($thead)
        $wrapper.append($desktopWrapper)

        let $tbody = $('<tbody></tbody>')
        let desktopInputs = [];
        data.forEach((row, rowIndex) => {
            let $tr = $('<tr></tr>')
            columns.forEach(col => {
                let $td
                if (col.action && frm.doc.docstatus === 0) {
                    $td = $('<td class="text-nowrap"></td>')
                    col.action.forEach(btn => {
                        if (!btn.condition || btn.condition(row)) {
                            let $b = $(`<button class="${btn.class} btn btn-sm mr-2">${btn.label}</button>`)
                            $b.on("click", () => btn.handler(row, rowIndex))
                            $td.append($b)
                        }
                    })
                } else if (col.is_value) {
                    if (col.type !== 'string') {
                        let value = row[col.fieldname] != null ? row[col.fieldname] : '';
                        if (col.type === 'number' && value !== '') value = parseFloat(value);

                        let $input = $(`<input type="number" class="jc-tb-mobile-value text-left" value="${value}" style="max-width:10ch;">`);
                        $input.attr('data-fieldname', col.fieldname);
                        $input.attr('data-rowindex', rowIndex);
                        $input.css('pointer-events', 'none')
                        $td = $('<td></td>');
                        desktopInputs.push($input);
                        $td.append($input);
                    } else {
                        $td = $(`<td>${row[col.fieldname] || ''}</td>`);
                    }
                } else {
                    $td = $(`<td>${row[col.fieldname] || ''}</td>`)
                    $td.attr('data-fieldname', col.fieldname)
                    $td.attr('data-rowindex', rowIndex)
                }
                $tr.append($td)
            })
            $tbody.append($tr);
        })
        $desktopTable.append($tbody)

        // Mobile
        let $mobileTable = $('<div class="d-md-none"></div>')
        let primary = columns.find(c => c.is_primary);
        let middle = columns.find(c => !c.is_primary && !c.is_secondary && !c.is_value && !c.is_unit && !c.action);
        let value = columns.find(c => c.is_value);
        let $theadMobile = $(`<div class="d-flex py-1 mb-1 border-bottom"></div>`)
        if (middle) {
            $theadMobile.append(`<div style="flex:1" class="text-left">${primary?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:1" class="text-center">${middle?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:1" class="text-right">${value?.label || ""}</div>`)
        } else {
            $theadMobile.append(`<div style="flex:2" class="text-left">${primary?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:1" class="text-right">${value?.label || ""}</div>`)
        }
        $mobileTable.append($theadMobile)
        $wrapper.append($mobileTable)

        let mobileInputs = [];
        data.forEach((row, rowIndex) => {
            let $row = $(`<div class="d-flex mb-2 py-1 jc-tb-mobile-row"></div>`)
            let $left, $right, $middle

            if (middle) {
                $left = $(`<div style="flex:1" class="text-left"></div>`)
                $middle = $(`<div style="flex:1" class="text-center"></div>`)
                $right = $(`<div style="flex:1" class="text-right"></div>`)
                $realRight = $('<div class="jc-tb-right"></div>')
                $right.append($realRight)
            } else {
                $left = $(`<div style="flex:2" class="text-left"></div>`)
                $right = $(`<div style="flex:1" class="text-right"></div>`)
                $realRight = $('<div class="jc-tb-right"></div>')
                $right.append($realRight)

            }

            let $buttons = $(`<div></div>`)
            columns.forEach(col => {
                if (col.is_primary && row[col.fieldname]) {$left.append(`<div class="">${row[col.fieldname]}</div>`)}
                else if(col.is_secondary && row[col.fieldname]) $left.append(`<div class="jc-tb-secondary">${row[col.fieldname]}</div>`)
                else if(col.is_value) {
                    if (col.type !== 'string') {
                        let value = row[col.fieldname] != null ? row[col.fieldname] : '';
                        if (col.type === 'number' && value !== '') value = parseFloat(value);
                        let $input = $(`<input type="number" class="jc-tb-mobile-value" value="${value}">`);
                        $input.attr('data-fieldname', col.fieldname);
                        $input.attr('data-rowindex', rowIndex);
                        $input.css('pointer-events', 'none')
                        if (col.nowrap) $input.css({'max-width': '5ch'})
                        else $input.css({'width':'100%'})
                        if (frm.doc.docstatus == 0) $input.addClass('jc-tb-mobile-value-new')
                        $realRight.append($input);
                        if (col.symbolize) $realRight.append(col.symbolize);
                        mobileInputs.push($input);
                    } else {
                        $realRight.append(`<div>${row[col.fieldname] || ''}</div>`);
                    }
                }
                else if(col.is_unit && row[col.fieldname]) $right.append(`<div class="ml-2 jc-tb-secondary">${row[col.fieldname]}</div>`)
                else if (col.action && frm.doc.docstatus === 0) {
                    col.action.forEach(btn => {
                        if (!btn.condition || btn.condition(row)) {
                            let $b = $(`<button class="${btn.class} btn btn-sm mr-2">${btn.label}</button>`)
                            $b.on("click", () => btn.handler(row, rowIndex))
                            $buttons.append($b)
                        }
                    })
                }
                else {
                    if (middle && col.fieldname !== "action") $middle.append(`<div data-fieldname=${col.fieldname} data-rowindex=${rowIndex} class="text-center">${row[col.fieldname]}</div>`)
                }
            })

            if ($middle) $row.append($left, $middle, $right)
            else $row.append($left, $right)
            $mobileTable.append($row)
            if (!$buttons.is(':empty')) {
                let $wrapper = $('<div class="border-bottom mb-2 pb-2"></div>')
                $wrapper.append($row)
                $wrapper.append($buttons)
                $mobileTable.append($wrapper)
            } else {
                $row.addClass("border-bottom mb-2 pb-1")
                $mobileTable.append($row)
            }
        })

        if (edittable === false && action) {
             $wrapper.on("click", ".jc-edit-btn", action)
             return;
        }
    },

    update_team_async: async function(frm) {
        const data = (frm.doc.items || []).map(row => {
            return {
                tracker: row.tracker,
                employee: row.employee || ""
            };
        });

        const d = new frappe.ui.Dialog({
            title: 'Chỉ định nhân viên QC',
            fields: [{
                fieldname: "items",
                fieldtype: "Table",
                data: data,
                in_place_edit: true,
                cannot_add_rows: true,
                cannot_delete_rows: true,
                fields: [
                    {
                        fieldname: "employee",
                        label: __("Mã nhân viên"),
                        fieldtype: "Link",
                        options: "Employee",
                        in_list_view: 1
                    },
                    {
                        fieldname: "tracker",
                        label: __("Công đoạn"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1
                    }
                ]
            }],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (!values || !values.items || values.items.length === 0) {
                    frappe.msgprint(__('Không có dữ liệu để cập nhật'));
                    return;
                }

                await frappe.call({method: "tahp.tahp.doctype.quality_card.quality_card.start", args:{quality_card: frm.doc.name, items:frm.doc.items}})
                d.hide();
            }
        });
        d.show();
        requestAnimationFrame(() => { 
            d.$wrapper.find('.row-check').hide();
            cleanerTable(d)
        });
    }
});

function cleanerTable(dialog) {
    const $wrapper = dialog.$wrapper;

    // Header - cột cuối cùng
    const $headerLastCol = $wrapper.find('.grid-heading-row .data-row.row .grid-static-col').last();
    $headerLastCol.removeClass(function(index, className) {
        return (className.match(/col-xs-\d+/g) || []).join(' ');
    });

    // Body - từng row
    $wrapper.find('.grid-body .data-row.row').each(function() {
        const $lastCol = $(this).find('.grid-static-col').last();
        $lastCol.removeClass(function(index, className) {
            return (className.match(/col-xs-\d+/g) || []).join(' ');
        });
    });
}