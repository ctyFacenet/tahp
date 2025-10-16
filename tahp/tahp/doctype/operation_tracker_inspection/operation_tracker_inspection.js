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
        let $wrapper = frm.fields_dict["display"].$wrapper;
        $wrapper.empty().addClass("jc-layout d-flex flex-wrap w-100");

        let $row1 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`);
        let $row2 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`);
        let $row3 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`);

        let $col21 = $(`<div class="jc-col w-100"></div>`);
        let $col22 = $(`<div class="jc-col w-100"></div>`);
        let $col23 = $(`<div class="jc-col w-100"></div>`);
        let $col31 = $(`<div class="jc-col w-100"></div>`);
        let $col32 = $(`<div class="jc-col w-100"></div>`);

        $row3.append($col31, $col32);
        $wrapper.append($row1, $row2, $row3);

        frm.events.define_label(frm, $row1);
        frm.events.display_history(frm, $col31);
        frm.events.display_legend(frm, $col32);

        if (frm.doc.docstatus == 0) {
            if (frm.doc.posts && frm.doc.posts.length != 0) {
                if (!frm.doc.posts[frm.doc.posts.length - 1].checked_date) {
                    $row2.append($col22);
                    frm.events.display_post(frm, $col22);
                }

                // Nếu tồn tại ít nhất 1 post chưa có filled_date
                const hasUnfilled = frm.doc.posts.some(post => !post.filled_date && post.checked_date);
                if (hasUnfilled) {
                    $row2.append($col23);
                    frm.events.display_pick(frm, $col23);
                }
            }
        }
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

        let reference_time = null;
        let latest_post = null;
        let has_posts = frm.doc.posts && frm.doc.posts.length;

        if (has_posts) {
            latest_post = frm.doc.posts[frm.doc.posts.length - 1];
            reference_time = frappe.datetime.str_to_obj(latest_post.created_date);
        } else if (frm.doc.next_time) {
            reference_time = new Date(frappe.datetime.str_to_obj(frm.doc.next_time).getTime() - frm.doc.frequency * 60 * 1000);
        }

        let $next_time_div = $(`
            <div class="next_time alert w-100 text-center alert-info border border-info" style="margin:0" role="alert">
                Phiếu mới xuất hiện sau: 00:00:00
            </div>
        `);
        $row.append($next_time_div);

        function updateCountdown() {
            let now = new Date();

            // Chưa có phiếu nào
            if (!has_posts) {
                let end_time = new Date(reference_time.getTime() + frm.doc.frequency * 60 * 1000);
                let diff = end_time.getTime() - now.getTime();

                if (diff <= 0) {
                    $next_time_div.text("Đang tạo phiếu mới, vui lòng đợi...");
                    $next_time_div
                        .removeClass("alert-info border-info alert-danger border-danger")
                        .addClass("alert-info border border-info");
                    clearInterval(interval);
                    return;
                }

                let hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
                let minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
                let seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");
                $next_time_div.text(`Phiếu mới xuất hiện sau: ${hours}:${minutes}:${seconds}`);
                $next_time_div
                    .removeClass("alert-danger border-danger")
                    .addClass("alert-info border border-info");
                return;
            }

            // Phiếu đã có nhưng chưa checked_time
            if (latest_post && !latest_post.checked_date) {
                let end_time = new Date(reference_time.getTime() + frm.doc.frequency * 60 * 1000);
                let diff = end_time.getTime() - now.getTime();

                if (diff <= 0) {
                    $next_time_div.text("Thời gian lấy mẫu sắp kết thúc...");
                    $next_time_div
                        .removeClass("alert-info border-info")
                        .addClass("alert-danger border border-danger");
                    clearInterval(interval);
                    return;
                }

                let hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
                let minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
                let seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");
                $next_time_div.text(`Thời gian lấy mẫu còn lại: ${hours}:${minutes}:${seconds}`);
                $next_time_div
                    .removeClass("alert-info border-info")
                    .addClass("alert-danger border border-danger");
                return;
            }

            // Phiếu đã có và đã checked_time → countdown tới phiếu mới
            if (latest_post && latest_post.checked_date) {
                let end_time = new Date(reference_time.getTime() + frm.doc.frequency * 60 * 1000);
                let diff = end_time.getTime() - now.getTime();

                if (diff <= 0) {
                    $next_time_div.text("Đang tạo phiếu mới, vui lòng đợi...");
                    $next_time_div
                        .removeClass("alert-danger border-danger")
                        .addClass("alert-info border border-info");
                    clearInterval(interval);
                    return;
                }

                let hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
                let minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
                let seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");
                $next_time_div.text(`Phiếu mới xuất hiện sau: ${hours}:${minutes}:${seconds}`);
                $next_time_div
                    .removeClass("alert-danger border-danger")
                    .addClass("alert-info border border-info");
                return;
            }
        }

        let interval = setInterval(updateCountdown, 1000);
        updateCountdown();
    },

    display_post: async function(frm, $wrapper) {
        $wrapper.empty();
        let created_str = frm.doc.posts[frm.doc.posts.length - 1].created_date
        let dt = frappe.datetime.str_to_obj(created_str);
        let response = await frappe.db.get_value("Operation", frm.doc.operation, "workstation")
        let workstation = response.message.workstation || "Chưa có"
        let formatted = frappe.datetime.obj_to_user(dt).split(" ")[0] + " " +
            String(dt.getHours()).padStart(2, "0") + ":" +
            String(dt.getMinutes()).padStart(2, "0");

        let specs = [];

        if (frm.doc.parameters && frm.doc.parameters.length > 0) {
            specs = frm.doc.parameters
                .map(row => row.specification)
                .filter(spec => spec); // loại bỏ null/undefined
        }


        // 🏗️ Container chính
        let $container = $(`
            <div class="tracker-post w-100">
                <div class="font-weight-bold mb-2" style="font-size: 1.1rem;">Phiếu đo đạc mới - ${frm.doc.operation}</div>
                <div>Thời điểm tạo phiếu: ${formatted}</div>
                <div>Vị trí lấy mẫu: ${workstation}</div>
                <div>Danh sách chỉ số: ${specs.join(', ')}</div>
                <button class="btn w-100 mt-2 tracker-btn-confirm p-3">
                    <i class="fa fa-check-circle mr-1"></i> Xác nhận đã lấy mẫu
                </button>
            </div>
        `);

        $wrapper.append($container);

        // 🧭 Sự kiện click cho nút "Xác nhận lấy mẫu"
        $container.find(".tracker-btn-confirm").on("click", async function() {
            frappe.confirm(
                "Xác nhận rằng bạn đã đến vị trí và lấy mẫu đo đạc?",
                async () => {
                    // TODO: Gọi server method hoặc xử lý logic tạo phiếu mới ở đây
                    const result = await check_qr_and_validate(frm.doc.name);
                    if (result) {
                        await frappe.call({
                            method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.generate_input",
                            args: {inspection: frm.doc.name}
                        })
                    }
                }
            );
        });
    },

    display_pick: async function(frm, $wrapper) {
        $wrapper.empty();

        const $container = $(`
            <div>
                <div class="d-flex justify-content-between align-items-center mb-2 jc-title jc-tb-title">
                    <div class="fw-bold">Danh sách phiếu đã lấy mẫu</div>
                </div>
                <div class="list-group"></div>
            </div>
        `);
        const $list = $container.find(".list-group");

        const valid_posts = (frm.doc.posts || []).filter(p => p.checked_date && !p.filled_date);
        if (!valid_posts.length) {
            $list.append(`<div class="text-muted text-center p-2 border rounded">Chưa có phiếu xác nhận nào</div>`);
            $wrapper.append($container);
            return;
        }

        valid_posts.forEach((item, idx) => {
            const checked_time = frappe.datetime.str_to_user(item.checked_date).split(" ")[1].slice(0, 5);
            const $row = $(`
                <div class="d-flex justify-content-between align-items-center rounded p-2 mb-2">
                    <div class="text-body">
                        Phiếu đã lấy mẫu <b>${checked_time}</b>
                    </div>
                    <button class="btn btn-secondary btn-sm px-4 py-2">Điền phiếu</button>
                </div>
            `);

            $row.find("button").on("click", () => {
                const d = new frappe.ui.Dialog({
                    title: `Điền phiếu #${idx + 1}`,
                    fields: [{ fieldname: "html_field", fieldtype: "HTML" }],
                    primary_action_label: "Xác nhận",
                    primary_action: async () => {
                        const result = covertAllData(data, d.$wrapper.find(".wo-value-input, .wo-select-middle"));
                        try {
                            const parent_name = item.name;
                            await frm.events.update_params(frm, result, parent_name);
                            d.hide();
                        } catch (err) {
                            console.warn("Người dùng hủy hoặc lỗi:", err);
                        }
                    },
                });

                d.show();
                const $inner_wrapper = d.fields_dict.html_field.$wrapper;

                const related_items = (frm.doc.items || []).filter(r => r.parent_name === item.name);
                if (!related_items.length) {
                    $inner_wrapper.append(`<div class="text-center text-muted p-2">Không có dữ liệu cho phiếu này</div>`);
                    return;
                }

                const data = related_items.map(r => {
                    const param = (frm.doc.parameters || []).find(p => p.specification === r.specification);
                    return {
                        specification: r.specification,
                        value: r.value,
                        unit: param ? param.unit : ""
                    };
                });

                define_table(frm, $inner_wrapper, "", [
                    { label: 'Chỉ số', fieldname: 'specification', is_primary: true },
                    { label: 'Đơn vị', fieldname: 'unit', is_secondary: true },
                    { label: 'Giá trị', fieldname: 'value', is_value: true },
                ], data);
            });

            $list.append($row);
        });

        $wrapper.append($container);
    },

    display_history: function(frm, $wrapper) {
        let posts = (frm.doc.posts || []).filter(p => p.checked_date);
        let items = frm.doc.items || [];
        let parameters = frm.doc.parameters || [];

        // 🔹 Map đơn vị cho từng specification
        let spec_units = {};
        parameters.forEach(p => {
            spec_units[p.specification] = p.unit || "";
        });

        // 🔹 Xác định cột động từ parameters
        let dynamic_columns = parameters.map(p => ({
            label: p.specification,
            fieldname: frappe.scrub(p.specification),
        }));

        // 🔹 Cột cố định
        let base_columns = [
            { label: "Lấy mẫu lúc", fieldname: "from_time", is_primary: true },
            { label: "Điền lúc", fieldname: "to_time" },
            { label: "Yêu cầu", fieldname: "feedback", is_secondary: true },
        ];

        let all_columns = [...base_columns, ...dynamic_columns];

        // 🔹 Map items theo parent_name
        let items_by_post = {};
        items.forEach(r => {
            if (!r.parent_name) return;
            if (!items_by_post[r.parent_name]) items_by_post[r.parent_name] = [];
            items_by_post[r.parent_name].push(r);
        });

        // 🔹 Tạo danh sách history dựa trên posts
        let history = posts.map(post => {
            let d = {};
            let from_obj = frappe.datetime.str_to_obj(post.checked_date);
            let to_obj = post.filled_date ? frappe.datetime.str_to_obj(post.filled_date) : null;

            function fmt_time(obj) {
                if (!obj) return "";
                let hh = String(obj.getHours()).padStart(2, "0");
                let mm = String(obj.getMinutes()).padStart(2, "0");
                return `${hh}:${mm}`;
            }

            d.from_time = fmt_time(from_obj);
            d.to_time = fmt_time(to_obj);
            d.feedback = post.feedback || "";

            // 🔹 Gắn giá trị từng chỉ số
            let related_items = items_by_post[post.name] || [];
            related_items.forEach(r => {
                let fname = frappe.scrub(r.specification);
                let unit = spec_units[r.specification] || "";
                d[fname] = r.value ? (unit ? `${r.value} ${unit}` : r.value) : "";
            });

            // 🔹 Background logic
            if (!post.approved_date) {
                if (post.filled_date) {
                    d.background = post.feedback ? "info" : "success";
                } else {
                    d.background = "danger"
                }
            } else {
                d.background = "success";
            }

            d._from_obj = from_obj;
            return d;
        });

        // 🔹 Sắp xếp giảm dần theo thời gian lấy mẫu
        history.sort((a, b) => b._from_obj - a._from_obj);

        define_basic_table(frm, $wrapper, "Lịch sử đo đạc", all_columns, history);
    },

    display_legend: function(frm, $wrapper) {
        let legendHTML = `
            <div class="font-weight-bold mb-2">Chú thích</div>
            <div>
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#ef4444;vertical-align:middle;margin-right:5px;"></span>
                Phiếu chưa được nhân viên đo đạc điền
            </div>
            <div>
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#3b82f6;vertical-align:middle;margin-right:5px;"></span>
                Phiếu đã điền xong, đang đợi công nhận xác nhận
            </div>
            <div>
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#22c55e;vertical-align:middle;margin-right:5px;"></span>
                Phiếu đã được điền và xác nhận
            </div>
        `;
        $wrapper.addClass("jc-col w-100 d-block d-md-flex justify-content-between").html(legendHTML);
    },

    update_params: function(frm, data, parent_name) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!Array.isArray(data) || !data.length)
                    return reject("Không có dữ liệu hợp lệ.");

                const hasZero = data.some(row => row.value == 0);
                if (hasZero) {
                    frappe.msgprint("Vui lòng nhập đủ mọi chỉ số!");
                    return reject("Thiếu chỉ số.");
                }

                // 📡 Gửi dữ liệu để lấy feedback gợi ý (nếu có)
                const feedback_map = await frappe.call({
                    method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.send_recommendation",
                    args: {
                        inspection: frm.doc.name,
                        items: data.map(d => ({
                            specification: d.specification,
                            value: d.value
                        })),
                        operation: frm.doc.operation
                    }
                });

                // 🧩 Hàm xử lý cập nhật dữ liệu
                const handleUpdate = async (feedback = "") => {
                    await frappe.call({
                        method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.update_params",
                        args: {
                            inspection: frm.doc.name,
                            items: data.map(d => ({
                                specification: d.specification,
                                value: d.value
                            })),
                            parent_name: parent_name,
                            feedback: feedback || null
                        }
                    });

                    resolve(true);
                };

                // 🧠 Nếu có feedback gợi ý → hiển thị prompt
                if (feedback_map.message && feedback_map.message.trim()) {
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
                            await handleUpdate(feedback);
                        },
                        __("Hoàn tất phiếu đo đạc chỉ số"),
                        __("Gửi")
                    )
                } else {
                    await handleUpdate();
                }

            } catch (err) {
                console.error(err);
                reject(err);
            }
        });
    }

});

async function check_qr_and_validate(inspection_name) {
    // Kiểm tra xem có cần quét QR không
    const qr_check = await frappe.call({
        method: "tahp.tahp.doctype.operation_tracker.operation_tracker.is_qr_check"
    });

    // Nếu không cần QR check → trả về true ngay
    if (!qr_check.message) {
        return true;
    }

    // Nếu cần QR check → kiểm tra quyền camera
    async function ensureCameraAccess() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            frappe.msgprint(__("Trình duyệt không hỗ trợ camera. Vui lòng dùng Chrome hoặc Safari trên điện thoại."));
            return false;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            frappe.msgprint(__("Không thể truy cập camera: " + err.message));
            return false;
        }
    }

    if (!(await ensureCameraAccess())) return false;

    // Quét QR
    return new Promise((resolve) => {
        new frappe.ui.Scanner({
            dialog: true,
            multiple: false,
            async on_scan(scan_data) {
                const scanned = scan_data.decodedText;

                const res = await frappe.call({
                    method: "tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection.check_qr",
                    args: {
                        inspection: inspection_name,
                        scanned: scanned
                    }
                });

                if (res.message) {
                    resolve(true);
                } else {
                    frappe.msgprint(__("Mã QR không đúng, vui lòng quét lại."));
                    resolve(false);
                }
            }
        });
    });
}

function define_basic_table(frm, $wrapper, title, columns, data) {
    // Header
    const $header = $(`
        <div class="d-flex flex-wrap justify-content-between jc-title jc-tb-title">
            <div class="flex-grow-1">${title}</div>
        </div>
    `);
    $wrapper.append($header);

    // --- DESKTOP ---
    const $desktopWrapper = $('<div class="d-none d-md-block overflow-auto"></div>');
    const $table = $('<table class="table table-sm table-bordered mb-0"></table>');
    const $thead = $('<thead><tr></tr></thead>');
    const $tbody = $('<tbody></tbody>');

    // Header row
    columns.forEach(col => $thead.find('tr').append(`<th>${col.label || ""}</th>`));
    $table.append($thead);

    // Data rows
    data.forEach((row, i) => {
        const $tr = $('<tr></tr>').css("background-color", i % 2 ? "#ffffff" : "#f5f5f5ff");
        columns.forEach(col => {
            const val = row[col.fieldname] || '';
            let $td = $('<td></td>');

            if (col.is_primary) {
                const $div = $('<div class="d-flex align-items-center"></div>');
                if (row.background) {
                    const colorMap = {
                        danger: "#ef4444",
                        success: "#22c55e",
                        warning: "#f59e0b",
                        info: "#3b82f6"
                    };
                    const dotColor = colorMap[row.background] || "#9ca3af";
                    $div.append(`<span style="
                        width:8px;height:8px;border-radius:50%;
                        background-color:${dotColor};margin-right:6px;
                        display:inline-block;vertical-align:middle;
                    "></span>`);
                }
                $div.append(val);
                $td.append($div);
            } else {
                $td.text(val);
            }
            $tr.append($td);
        });
        $tbody.append($tr);
    });

    $table.append($tbody);
    $desktopWrapper.append($table);
    $wrapper.append($desktopWrapper);

    // --- MOBILE ---
    const $mobileWrapper = $('<div class="d-md-none"></div>');
    const primary = columns.find(c => c.is_primary);
    const middles = columns.filter(c =>
        !c.is_primary && !c.is_secondary && !c.is_unit
    );
    const units = columns.filter(c => c.is_unit);
    const totalColumns = 1 + middles.length + units.length;

    // Scrollable nếu nhiều cột
    if (totalColumns > 4) $mobileWrapper.css({ "overflow-x": "auto" });

    function getFlexStyle() {
        if (totalColumns <= 3) return 'min-width:120px;flex:1;';
        if (totalColumns <= 5) return 'min-width:90px;flex:1;';
        return 'min-width:70px;';
    }

    // Header row mobile
    const $theadMobile = $('<div class="d-flex fw-bold border-bottom py-1"></div>');
    $theadMobile.append(`<div style="${getFlexStyle()}" class="text-left">${primary?.label || ""}</div>`);
    middles.forEach(m => $theadMobile.append(`<div style="${getFlexStyle()}" class="text-center">${m.label}</div>`));
    units.forEach(u => $theadMobile.append(`<div style="${getFlexStyle()}" class="text-right">${u.label}</div>`));
    $mobileWrapper.append($theadMobile);

    // Data rows
    data.forEach((row, i) => {
        const bg = i % 2 ? "#ffffff" : "#f5f5f5ff";
        const $row = $(`<div class="d-flex align-items-center py-2" style="background:${bg};"></div>`);

        // Left (primary)
        const $left = $(`<div style="${getFlexStyle()}" class="text-left"></div>`);
        if (primary) {
            const $div = $('<div class="d-flex align-items-center"></div>');
            if (row.background) {
                const colorMap = {
                    danger: "#ef4444",
                    success: "#22c55e",
                    warning: "#f59e0b",
                    info: "#3b82f6"
                };
                const dotColor = colorMap[row.background] || "#9ca3af";
                $div.append(`<span style="
                    width:8px;height:8px;border-radius:50%;
                    background-color:${dotColor};margin-right:6px;
                    display:inline-block;vertical-align:middle;
                "></span>`);
            }
            $div.append(row[primary.fieldname] || '');
            $left.append($div);
        }

        // Middles
        const $middles = middles.map(m =>
            $(`<div style="${getFlexStyle()}" class="text-center">${row[m.fieldname] || ''}</div>`)
        );

        // Units (right)
        const $units = units.map(u =>
            $(`<div style="${getFlexStyle()}" class="text-right">${row[u.fieldname] || ''}</div>`)
        );

        $row.append($left, ...$middles, ...$units);
        $mobileWrapper.append($row);

        // Secondary (nếu có)
        const secondaryCols = columns.filter(c => c.is_secondary);
        if (secondaryCols.length) {
            const $sec = $('<div class="ps-2 small text-muted"></div>');
            secondaryCols.forEach(c => {
                if (row[c.fieldname]) $sec.append(`<div>${row[c.fieldname]}</div>`);
            });
            $sec.css({
                background: bg,
                "font-size": "0.75rem",
                "padding-bottom": "8px"
            });
            $mobileWrapper.append($sec);
        }
    });

    $wrapper.append($mobileWrapper);
}

async function define_table(frm, $wrapper, title, columns, data) {
    const $header = $(`
        <div class="wo-header">
            <div class="wo-header-title">${title}</div>
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
