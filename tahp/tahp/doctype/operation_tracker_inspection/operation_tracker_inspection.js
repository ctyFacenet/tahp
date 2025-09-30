// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Operation Tracker Inspection", {
	refresh: async function (frm) {
        frm.events.clean_display(frm)
        await frm.events.define_layout(frm)
	},

    clean_display: function(frm) {
        frm.set_intro("")
        frm.toolbar.page.add_inner_message('')
        frm.page.clear_primary_action()
        frm.timeline.wrapper.hide()
        frm.comment_box.comment_wrapper.hide()

        let background = '#f4f7fc';
        const isMobile = window.innerWidth <= 768;

        // Lấy wrapper chỉ cho form này
        let $wrapper = $(frm.$wrapper);

        $wrapper.find('.tab-content').css({'background': background})
        $wrapper.find('.page-container').css({'background': background})
        if (isMobile) {
            $wrapper.find('.form-tabs-list').css({'background': background})
        } else {
            $wrapper.find('.form-tabs-list').css({'background': background})
        }
        $wrapper.find('.form-tabs-list .nav.form-tabs .nav-item').css({'background': background})
        $wrapper.find('.form-tabs-list .nav.form-tabs .nav-item .nav-link').css({'background': background})
        $wrapper.find('.layout-main').css({'margin-inline': '-30px'})
        $wrapper.find('.form-page').css({'border': 'none'})
        $wrapper.find('.layout-main-section-wrapper').attr('style', 'padding-left:5px !important; padding-right:5px !important;')
        $wrapper.find('.form-column').attr('style', 'padding-left:5px !important; padding-right:5px !important;')
    },

    define_layout: async function(frm) {
        let $wrapper = frm.fields_dict["display"].$wrapper
        $wrapper.empty()
        $wrapper.addClass("jc-layout d-flex flex-wrap w-100")
        let $row1 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $row2 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $row3 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $col21 = $(`<div class="jc-col w-100"></div>`)
        let $col31 = $(`<div class="jc-col w-100"></div>`)
        let $col32 = $(`<div class="jc-col w-100 d-block d-md-flex justify-content-between">
            <div class="font-weight-bold">Chú thích</div>
            <div>
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:#ef4444;vertical-align:middle;margin-right:5px;"></span>
                Phiếu chưa được nhân viên đo đạc điền
            </div>
            <div>
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:#3b82f6;vertical-align:middle;margin-right:5px;"></span>
                Phiếu đã điều xong, đang đợi công nhận xác nhận
            </div>
            <div>
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:#22c55e;vertical-align:middle;margin-right:5px;"></span>
                Phiếu đã được điền và xác nhận
            </div>
        </div>`)
        if (frm.doc.docstatus == 0) $row2.append($col21)
        $row3.append($col31)
        $row3.append($col32)
        $wrapper.append($row1, $row2, $row3)

        frm.events.define_label(frm, $row1)

        let items = frm.doc.items || [];
        let grouped = {};
        items.forEach(row => {
            if (!row.from_time) return;
            if (!grouped[row.from_time]) {
                grouped[row.from_time] = [];
            }
            grouped[row.from_time].push(row);
        });

        let latest_from_time = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a))[0];
        let latest_rows = [];
        if (latest_from_time) {
            latest_rows = grouped[latest_from_time].filter(r => !r.to_time);

            if (latest_rows.length) {
                // format lại: YYYY-MM-DD HH:MM
                let dt = new Date(latest_from_time);
                let hh = String(dt.getHours()).padStart(2, "0");
                let min = String(dt.getMinutes()).padStart(2, "0");

                let title = `Phiếu đo lúc ${hh}:${min} - ${frm.doc.operation}`;

                let data = latest_rows.map(r => {
                    let param = (frm.doc.parameters || []).find(p => p.specification === r.specification);
                    return {
                        specification: r.specification,
                        value: r.value,
                        unit: param ? param.unit : ""
                    };
                });

                frm.events.define_table(
                    frm, $col21, title,
                    columns=[
                        { label: 'Chỉ số', fieldname: 'specification', is_primary: true },
                        { label: 'Đơn vị', fieldname: 'unit', is_secondary: true },
                        { label: 'Giá trị', fieldname: 'value', is_value: true },
                    ],
                    data=data,
                    edittable=true,
                    action="update_params",
                    action_param=latest_from_time,
                    confirmAction=false
                );
            } else {
                let $temp = $(`<div class="text-center">Chưa có phiếu đo mới</div>`)
                $col21.append($temp)
            }
        } else {
            let $temp = $(`<div class="text-center">Chưa có phiếu đo mới</div>`)
            $col21.append($temp)            
        }


        let parameters = frm.doc.parameters || [];

        let spec_units = {};
        parameters.forEach(p => {
            spec_units[p.specification] = p.unit || "";
        });

        // build dynamic columns
        let dynamic_columns = parameters.map(p => {
            return {
                label: p.specification,
                fieldname: frappe.scrub(p.specification),
            };
        });

        // base columns
        let base_columns = [
            { label: 'Tạo lúc', fieldname: 'from_time', is_primary: true },
            { label: 'Điền lúc', fieldname: 'to_time'},
            { label: 'Yêu cầu', fieldname: 'feedback', is_secondary: true },
        ];

        // gộp cột
        let all_columns = [...base_columns, ...dynamic_columns];
        // build data: mỗi from_time là một row
        let history = Object.keys(grouped).map(ft => {
            let rows = grouped[ft];
            let d = {};

            // parse from_time, to_time sang Date object
            let from_obj = frappe.datetime.str_to_obj(ft);
            let to_obj = rows[0].to_time ? frappe.datetime.str_to_obj(rows[0].to_time) : null;

            // helper format hh:mm:ss
            function fmt_time(obj) {
                if (!obj) return "";
                let hh = String(obj.getHours()).padStart(2, "0");
                let mm = String(obj.getMinutes()).padStart(2, "0");
                return `${hh}:${mm}`;
            }

            d.from_time = `${fmt_time(from_obj)}`;
            d.to_time = `${fmt_time(to_obj)}`;

            // feedback (nếu có nhiều thì ghép lại)
            d.feedback = rows[0]?.feedback || "";

            // fill các spec
            rows.forEach(r => {
                let fname = frappe.scrub(r.specification);
                let unit = spec_units[r.specification] || "";
                d[fname] = r.value ? (unit ? `${r.value} ${unit}` : r.value) : "";
                d.feedback = r.feedback
            });


            if (!to_obj) {
                d.background = "danger"; 
            } else {
                if (d.feedback) {
                    d.background = rows[0].sent ? "success" : "info";
                } else {
                    d.background = "success";
                }
            }

            d._from_obj = from_obj;
            return d;
        });

        history.sort((a, b) => b._from_obj - a._from_obj);
        // render bảng
        frm.events.define_table(
            frm, $col31, "Lịch sử đo đạc",
            columns=all_columns,
            data=history,
        );
    },

    define_label: function(frm, $row) {
        $row.empty();

        // Phiếu đã hoàn thành
        if (frm.doc.docstatus === 1) {
            $row.append($(`
                <div class="next_time alert w-100 text-center alert-success border border-success" style="margin:0" role="alert">
                    Hoàn thành đo đạc chỉ số
                </div>
            `));
            return;
        } else if (frm.doc.docstatus === 2) {
            $row.append($(`
                <div class="next_time alert w-100 text-center alert-danger border border-danger" style="margin:0" role="alert">
                    Phiếu đã bị huỷ
                </div>
            `));
            return;            
        }

        // Xác định reference_time
        let reference_time = null;
        let latest_item = null;

        if (frm.doc.items && frm.doc.items.length) {
            // Nếu có dòng, dùng from_time của dòng mới nhất
            latest_item = frm.doc.items.reduce((latest, item) => {
                if (!latest) return item;
                return frappe.datetime.str_to_obj(item.from_time) > frappe.datetime.str_to_obj(latest.from_time) ? item : latest;
            }, null);
            reference_time = frappe.datetime.str_to_obj(latest_item.from_time);
        } else if (frm.doc.next_time) {
            // Nếu chưa có dòng, dùng next_time - frequency
            reference_time = new Date(frappe.datetime.str_to_obj(frm.doc.next_time).getTime() - frm.doc.frequency * 60 * 1000);
        } else {
            // Không có gì để tính
            $row.append($(`
                <div class="next_time alert w-100 text-center alert-warning border border-warning" style="margin:0" role="alert">
                    Chưa có phiếu nào
                </div>
            `));
            return;
        }

        // Tạo div hiển thị
        let $next_time_div = $(`
            <div class="next_time alert w-100 text-center alert-danger border border-danger" style="margin:0" role="alert">
                Thời gian còn lại: 00:00:00
            </div>
        `);
        $row.append($next_time_div);

        function updateCountdown() {
            let now = new Date();
            let end_time = new Date(reference_time.getTime() + frm.doc.frequency * 60 * 1000);
            let diff = end_time.getTime() - now.getTime();

            if (diff <= 0) {
                if ((latest_item && latest_item.to_time) || (!latest_item)) {
                    // Phiếu mới xuất hiện, đang tạo
                    $next_time_div.text("Đang tạo phiếu...");
                    $next_time_div
                        .removeClass("alert-danger border-danger")
                        .addClass("alert-info border border-info");
                } else {
                    // Quá hạn
                    $next_time_div.text("Thời gian điền phiếu sắp hết..");
                    $next_time_div
                        .removeClass("alert-info border-info")
                        .addClass("alert-danger border border-danger");
                }
                clearInterval(interval);
                return;
            }

            let hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
            let minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
            let seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");

            if ((latest_item && latest_item.to_time) || (!latest_item)) {
                $next_time_div.text(`Phiếu mới xuất hiện sau: ${hours}:${minutes}:${seconds}`);
                $next_time_div.removeClass("alert-danger border-danger").addClass("alert-info border border-info");
            } else {
                $next_time_div.text(`Thời gian còn lại: ${hours}:${minutes}:${seconds}`);
                $next_time_div.removeClass("alert-info border-info").addClass("alert-danger border border-danger");
            }
        }

        let interval = setInterval(updateCountdown, 1000);
        updateCountdown();
    },

    define_table: function(frm, $wrapper, title, columns, data, edittable=false, action=null, action_param=null, confirmAction=true) {

        // Header
        let $header = $(`
            <div class="d-flex flex-wrap justify-content-between jc-title jc-tb-title">
                <div class="flex-grow-1">${title}</div>
            </div>
        `);
        $wrapper.append($header);

        // Nút sửa
        if ((edittable || action) && frm.doc.docstatus === 0) {
            if (data.length > 0) {
                let $editBtn = $('<button class="btn btn-secondary d-none d-md-table jc-edit-btn">Sửa</button>')
                $header.append($editBtn)
            }

            if (!edittable && action && data.length > 0) {
                let $editBtn = $('<button class="btn btn-secondary d-md-none jc-edit-btn">Sửa</button>')       
                $header.append($editBtn)                
            }

            // let $editMobileBtn = $('<button class="btn btn-secondary d-md-none w-100 mt-2 jc-edit-btn jc-mobile-input">Sửa</button>')
            // $wrapper.append($editMobileBtn)
        }


        // Desktop
        let $desktopWrapper = $('<div class="d-none d-md-block overflow-auto"></div>');
        let $desktopTable = $('<table class="table table-sm table-bordered"></table>')
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
            if (rowIndex % 2 === 0) {
                $tr.css("background-color", "#f5f5f5ff");
            } else {
                $tr.css("background-color", "#ffffff");
            }
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
                } else if (col.is_primary) {
                    $td = $('<td></td>')
                    let $primaryDiv = $('<div class="d-flex align-items-center"></div>')

                    // Nếu có background thì thêm chấm tròn
                    if (row.background) {
                        let colorMap = {
                            danger: "#ef4444",
                            success: "#22c55e",
                            warning: "#f59e0b",
                            info: "#3b82f6"
                        };
                        let dotColor = colorMap[row.background] || "#9ca3af";
                        let $dot = $(`<span style="
                            display:inline-block;
                            width:8px;
                            height:8px;
                            border-radius:50%;
                            background-color:${dotColor};
                            margin-right:6px;
                            vertical-align:middle;
                        "></span>`);
                        $primaryDiv.append($dot);
                    }

                    $primaryDiv.append(row[col.fieldname] || '')
                    $td.append($primaryDiv)
                } else if (col.is_value) {
                    if (col.type !== 'string') {
                        let value = row[col.fieldname] != null ? row[col.fieldname] : '';
                        if (col.type === 'number' && value !== '') value = parseFloat(value);

                        let $input = $(`<input type="number" class="jc-tb-mobile-value text-left" value="${value}" style="max-width:10ch;">`);
                        $input.attr('data-fieldname', col.fieldname);
                        $input.attr('data-rowindex', rowIndex);
                        $input.css('pointer-events', 'none')
                        $input.css('background-color', 'transparent')
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
        let middles = columns.filter(c =>
            !c.is_primary &&
            !c.is_secondary &&
            !c.is_value &&
            !c.is_unit &&
            !c.action
        );

        let value = columns.find(c => c.is_value);
        let $theadMobile = $(`<div class="d-flex"></div>`);
        let totalColumns = 1 + middles.length + (value ? 1 : 0);
        if (totalColumns > 4) {
            $mobileTable.css({
                "overflow-x": "auto",
            });
        }
        function getFlexStyle() {
            if (totalColumns > 5) {
                return 'min-width:70px;'; // tuỳ chỉnh độ rộng tối thiểu mỗi cột
            }
            return 'flex:1;';
        }

        if (middles.length) {
            $theadMobile.append(`<div style="${getFlexStyle()}" class="text-left">${primary?.label || ""}</div>`);
            middles.forEach(m => {
                $theadMobile.append(`<div style="${getFlexStyle()}" class="text-center">${m.label}</div>`);
            });
            if (value) $theadMobile.append(`<div style="${getFlexStyle()}" class="text-right">${value?.label || ""}</div>`);
        } else {
            $theadMobile.append(`<div style="${getFlexStyle()}" class="text-left">${primary?.label || ""}</div>`);
            if (value) $theadMobile.append(`<div style="${getFlexStyle()}" class="text-right">${value?.label || ""}</div>`);
        }
        $mobileTable.append($theadMobile);
        $wrapper.append($mobileTable);


        let mobileInputs = [];
        data.forEach((row, rowIndex) => {
            let $row = $(`<div class="d-flex jc-tb-mobile-row" style="height: 40px; line-height: 40px; align-items:center;"></div>`)
            let bgColor = rowIndex % 2 === 0 ? "#f5f5f5ff" : "#ffffff";
            $row.css({
                "background-color": bgColor,
            });
            let $left, $right, $realRight, $middlesDivs = [];
            let $secondary = []

            if (middles.length) {
                $left = $(`<div style="${getFlexStyle()}" class="text-left"></div>`);
                middles.forEach(() => {
                    $middlesDivs.push($(`<div style="${getFlexStyle()}" class="text-center"></div>`));
                });
                if (value) {
                    $right = $(`<div style="${getFlexStyle()}" class="text-right"></div>`);
                    $realRight = $('<div class="jc-tb-right"></div>');
                    $right.append($realRight);
                } else {
                    $row.css({'width':'fit-content'})
                }
            } else {
                $left = $(`<div style="${getFlexStyle(2)}" class="text-left"></div>`);
                if (value) {
                    $right = $(`<div style="${getFlexStyle()}" class="text-right"></div>`);
                    $realRight = $('<div class="jc-tb-right"></div>');
                    $right.append($realRight);
                }
            }

            let $buttons = $(`<div></div>`)
            columns.forEach((col, colIndex) => {
                if (col.is_primary && row[col.fieldname]) {
                    let $primaryDiv = $(`<div></div>`);
                    if (row.background) {
                        let colorMap = {
                            danger: "#ef4444",   // red-500
                            success: "#22c55e",  // green-500
                            warning: "#f59e0b",   // amber-500
                            info: "#3b82f6"
                        };
                        let dotColor = colorMap[row.background] || "#9ca3af"; // gray-400 mặc định
                        let $dot = $(`<span style="
                            display:inline-block;
                            width:8px;
                            height:8px;
                            border-radius:50%;
                            background-color:${dotColor};
                            margin-right:6px;
                            vertical-align:middle;
                        "></span>`);
                        $primaryDiv.append($dot);
                    }
                    $primaryDiv.append(row[col.fieldname])
                    $left.append($primaryDiv);
                }
                else if (col.is_secondary && row[col.fieldname]) {
                    $secondary.push(`<div class="">${row[col.fieldname]}</div>`)
                }
                else if (col.is_value) {
                    if (col.type !== 'string') {
                        let value = row[col.fieldname] != null ? row[col.fieldname] : '';
                        if (col.type === 'number' && value !== '') value = parseFloat(value);
                        let $input = $(`<input type="number" class="jc-tb-mobile-value" value="${value}">`);
                        $input.attr('data-fieldname', col.fieldname);
                        $input.attr('data-rowindex', rowIndex);
                        $input.css('pointer-events', 'none');
                        $row.css('height', '60px');
                        $row.css('line-height', '60px');
                        $input.css('height', '50px');
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
                else if (col.is_unit && row[col.fieldname]) {
                    $right.append(`<div class="jc-tb-secondary">${row[col.fieldname]}</div>`)
                }
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
                    // gán dữ liệu vào đúng cột middle
                    let midIndex = middles.findIndex(m => m.fieldname === col.fieldname)
                    if (midIndex !== -1 && $middlesDivs[midIndex]) {
                        $middlesDivs[midIndex].append(
                            `<div data-fieldname=${col.fieldname} data-rowindex=${rowIndex}>${row[col.fieldname] || ''}</div>`
                        )
                    }
                }
            })

            if (middles.length) {
                $row.append($left, ...$middlesDivs, $right)
            } else {
                $row.append($left, $right)
            }

            let $wrapper = $('<div></div>');
            $wrapper.append($row);

            if (!$buttons.is(':empty')) {
                $wrapper.append($buttons);
            }

            if ($secondary.length) {
                let $secondaryRow = $('<div></div>');
                $secondary.forEach(sec => $secondaryRow.append(sec));

                // cùng màu với row
                $secondaryRow.css({
                    "background-color": bgColor,
                    "line-height": "0.75rem",
                    "font-size": "0.75rem",
                    "padding-bottom": "10px",
                    "width": "100%"
                });

                $wrapper.append($secondaryRow);
            }


            $mobileTable.append($wrapper);

        })

        if (edittable === false && action) {
             $wrapper.on("click", ".jc-edit-btn", action)
             return;
        }

        // ----- XỬ LÝ CHẾ ĐỘ EDIT -----
        if (frm.doc.docstatus != 0) return;
        let editing = false;

        function enableEditing(inputs ,$btn=null) {
            if (editing) return;
            editing = true;

            inputs.forEach(($input, index) => {
                $input.css('pointer-events', 'auto').addClass('jc-edit-editing');
                $input.data("original-value", $input.val());
                // Enter để nhảy qua input kế tiếp
                $input.on('keydown.nextFocus', function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        const nextIndex = index + 1;
                        if (nextIndex < inputs.length) {
                            scrollAndFocus(inputs, nextIndex);
                        } else {
                            $input.blur(); // giả lập blur cuối cùng
                        }
                    }
                });
                // Khi blur thì kiểm tra xem có phải input cuối hoặc rời hết không
                $input.on('blur.saveCheck', function() {
                    setTimeout(() => {
                        if (!$(".jc-edit-editing:focus").length) { // không còn input nào focus
                            if (confirmAction) {
                                frappe.confirm(
                                    "Lưu thay đổi?",
                                    () => {
                                        const result = covertAllData(data, inputs);
                                        if (action) frm.events[action](frm, result, action_param);;
                                        disableEditing(inputs, $btn);
                                    },
                                    () => { disableEditing(inputs, $btn); }
                                );
                            } else {
                                const result = covertAllData(data, inputs);
                                if (action) frm.events[action](frm, result, action_param);
                                disableEditing(inputs, $btn);                                
                            }
                        }
                    }, 150);
                });
            });
            if ($btn) $btn.addClass('jc-edit-btn-save').text('Lưu');
            if (inputs[0]) scrollAndFocus(inputs, 0);
        }

        function disableEditing(inputs, $btn) {
            editing = false;
            inputs.forEach($input => {
                $input.val($input.data("original-value"));
                $input
                    .css('pointer-events', 'none')
                    .removeClass('jc-edit-editing')
                    .off('keydown.nextFocus')
                    .off('blur.saveCheck');
            });
            if ($btn) $btn.removeClass('jc-edit-btn-save').text('Sửa');
        }

        // Desktop: vẫn dùng nút Sửa
        $wrapper.on("click", ".jc-edit-btn", function() {
            const $btn = $(this);
            enableEditing(desktopInputs, $btn);
        });

        // Mobile: click vào bảng để bật edit
        $wrapper.on("click", ".jc-tb-mobile-row", function() {
            if (!editing) enableEditing(mobileInputs);
        });
    },

    update_params: async function(frm, data, from_time) {
        if (!Array.isArray(data) || !data.length) return;

        let feedback_map = await frappe.call({
            method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.send_recommendation",
            args: {
                inspection: frm.doc.name,
                items: data.map(d => ({
                    specification: d.specification,
                    value: d.value
                }))
            }
        });

        async function ensureCameraAccess() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                frappe.msgprint(__("Trình duyệt không hỗ trợ camera. Vui lòng dùng Chrome hoặc Safari trên điện thoại."));
                return false;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop()); // dừng stream sau khi check
                return true;
            } catch (err) {
                frappe.msgprint(__("Không thể truy cập camera: " + err.message));
                return false;
            }
        }

        const showPrompt = () => {
            frappe.prompt(
                {
                    fieldname: "feedback",
                    fieldtype: "Text",
                    label: "Điền yêu cầu gửi tới công nhân nếu có",
                    default: feedback_map.message,
                    reqd: 0
                },
                async (values) => {
                    const feedback = values.feedback?.trim() || "";

                    const items = data.map(d => ({
                        specification: d.specification,
                        value: d.value,
                        from_time: from_time,
                        feedback: feedback || null
                    }));

                    // Gọi check is_qr_check trước
                    const qr_check = await frappe.call({
                        method: "tahp.tahp.doctype.operation_tracker.operation_tracker.is_qr_check"
                    });

                    if (qr_check.message) {
                        // Bật scanner
                        if (await ensureCameraAccess()) {
                            new frappe.ui.Scanner({
                                dialog: true,
                                multiple: false,
                                async on_scan(scan_data) {
                                    const scanned = scan_data.decodedText;

                                    const res = await frappe.call({
                                        method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.check_qr",
                                        args: {
                                            inspection: frm.doc.name,
                                            scanned: scanned
                                        }
                                    });

                                    if (res.message) {
                                        // Đúng QR → gọi update_params
                                        await frappe.call({
                                            method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.update_params",
                                            args: { inspection: frm.doc.name, items: items }
                                        });
                                    } else {
                                        frappe.msgprint(__("Mã QR không đúng, vui lòng quét lại."));
                                        showPrompt(); // quay lại dialog
                                    }
                                }
                            });
                        }
                    } else {
                        // Không yêu cầu QR → gọi thẳng update_params
                        await frappe.call({
                            method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.update_params",
                            args: { inspection: frm.doc.name, items: items }
                        });
                    }
                },
                __("Hoàn tất phiếu đo đạc chỉ số"),
                __("OK")
            );
        };

        showPrompt();
    }
});

function scrollAndFocus(mobileInputs, index) {
    const $input = mobileInputs[index];
    const $row = $input.closest('.jc-tb-mobile-row');
    const isMobile = window.innerWidth <= 768;
    if (isMobile && $row.length) {
        $row[0].scrollIntoView({ behavior: 'smooth'});
    }
    $input.focus();

}

function covertAllData(data, inputs) {
    const newData = data.map((row, rowIndex) => {
        const newRow = { ...row };
        inputs.forEach($input => {
            if (Number($input.attr('data-rowindex')) === rowIndex) {
                const field = $input.attr('data-fieldname');
                const type = $input.attr('type');

                let val = $input.val();
                if (type === 'number') {
                    newRow[field] = val !== '' ? parseFloat(val) : 0;
                } else {
                    newRow[field] = val;
                }
            }
        });
        return newRow;
    });
    return newData;
}