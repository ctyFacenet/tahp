frappe.ui.form.on('Job Card', {
    refresh: async function(frm) {
        frm.events.clean_display(frm);
        frm.events.define_layout(frm);
    },

    clean_display: function(frm) {
        frm.set_intro("")
        frm.remove_custom_button("Pause Job")
        frm.remove_custom_button("Complete Job")
        frm.remove_custom_button("Start Job")
        frm.remove_custom_button("Resume Job")
        frm.toolbar.page.add_inner_message('')
        frm.page.clear_primary_action()
        frm.timeline.wrapper.hide()
        frm.comment_box.comment_wrapper.hide()

        let background = '#f4f7fc';

        // Lấy wrapper chỉ cho form này
        let $wrapper = $(frm.$wrapper);

        $wrapper.find('.tab-content').css({'background': background})
        $wrapper.find('.page-container').css({'background': background})
        $wrapper.find('.form-tabs-list .nav.form-tabs .nav-item').css({'background': background})
        $wrapper.find('.form-tabs-list .nav.form-tabs .nav-item .nav-link').css({'background': background})
        $wrapper.find('.form-tabs-list').css({'background': background})
        $wrapper.find('.layout-main').css({'margin-inline': '-30px'})
        $wrapper.find('.form-page').css({'border': 'none'})
        $wrapper.find('.layout-main-section-wrapper').attr('style', 'padding-inline: 1px !important;')
        $wrapper.find('.form-column').attr('style', 'padding-inline:1px !important;')
    },

    define_layout: async function(frm) {
        let $wrapper = frm.fields_dict["custom_buttons"].$wrapper
        $wrapper.empty()
        $wrapper.addClass("jc-layout d-flex flex-wrap w-100")

        let $row0 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $col0 = $(`<div class="jc-col jc-comment text-center w-100 bold" style="cursor:pointer">Thêm bình luận</div>`)
        $row0.append($col0);

        let $row1 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $row2 = $(``)
        let $col
        for (let workstation of frm.doc.custom_workstation_table) {
            $col = $(`<div class="jc-col col-25s"></div>`)
            data = frm.doc.custom_config_table.filter(r => r.workstation === workstation.workstation)
            if (data.length === 0) continue;
            $row2 = $(`<div class="jc-container d-flex flex-wrap w-100 justify-content-start"></div>`)
            let tracker;
            frm.events.define_table(
                frm, $col, `Cấu hình ${workstation.workstation}`,
                columns = [
                    { label: 'Cấu hình', fieldname: 'config_name', is_primary: true },
                    { label: 'Đơn vị', fieldname: 'unit', is_unit: true},
                    { label: 'Giá trị', fieldname: 'config_value', is_value: true },
                ],
                data = data,
                edittable=true,
                action="update_configs",
                action_param=workstation.workstation,
            )
            $row2.append($col)
        }

        let $row3 = $(``)
        let $col4, $col5
        if (frm.doc.custom_input_table && frm.doc.custom_input_table.length > 0) {
            $row3 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)

            if (frm.doc.custom_input_table.length > 0) {
                $col4 = $(`<div class="jc-col col-50"></div>`).append(`<div class="jc-title">Đầu vào phụ gia</div>`);
                $row3.append($col4);
            }

            if (frm.doc.custom_input_table.some(r => r.is_meter)) {
                $col5 = $(`<div class="jc-col col-50"></div>`).append(`<div class="jc-title">Đầu vào đo bằng đồng hồ</div>`);
                $row3.append($col5);
            }
        }
        let $row4 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)

        // Row 1
        let $col1 = $(`<div class="jc-col col-25"></div>`)
        let $col2 = $(`<div class="jc-col col-45"></div>`)
        let $col3 = $(`<div class="jc-col col-30 d-none d-md-block"></div>`)
        $row1.append($col1, $col2, $col3)

        // Row 4
        let $col6 = $(`<div class="jc-col col-50"></div>`)
        let $col7 = $(`<div class="jc-col col-50"></div>`).append(`<div class="jc-title">Lịch sử dừng máy</div>`)
        $row4.append($col6, $col7)

        if (frm.doc.custom_workstation_table && frm.doc.custom_workstation_table.length > 0) $wrapper.append($row0, $row1, $row2, $row3, $row4)
        else $wrapper.append($row0, $row1, $row3, $row4)

        frm.events.define_controller(frm, $col1)

        frm.events.define_table(
            frm, $col2, 'Điều khiển',
            columns=[
                { label: 'Tên thiết bị', fieldname: 'workstation', is_primary: true },
                { label: 'Đã chạy được', fieldname: 'time' },
                { label: 'Trạng thái', fieldname: 'status', is_value: true, type: "string" },
                {
                    label: 'Hành động',
                    fieldname: 'action',
                    action: [
                        {
                            label: "Bật",
                            class: "btn btn-sm btn-success jc-btn",
                            condition: (row) => row.status === "Dừng",
                            handler: async (row) => await frappe.call({
                                method: "tahp.doc_events.job_card.job_card.update_workstations",
                                args: {
                                    job_card: frm.doc.name,
                                    workstations: [{
                                        ...row,
                                        status: "Chạy",
                                    }]
                                }
                            })
                        },
                        {
                            label: "Dừng",
                            class: "btn btn-sm btn-danger jc-btn",
                            condition: (row) => row.status === "Chạy",
                            handler: async (row) => await frm.events.pause_workstation(frm, row),
                        },
                        {
                            label: "Báo hỏng",
                            class: "btn btn-sm btn-warning jc-btn",
                            condition: (row) => row.status !== "Hỏng" && row.status !== "Sẵn sàng",
                            handler: async (row) => await frm.events.problem_workstation(frm, row),
                        },
                        {
                            label: "Khôi phục",
                            class: "btn btn-sm btn-secondary jc-btn",
                            condition: (row) => row.status === "Hỏng",
                            handler: async (row) => {
                                await frappe.call({
                                    method: "tahp.doc_events.job_card.job_card.update_workstations",
                                    args: {
                                        job_card: frm.doc.name,
                                        workstations: [{
                                            ...row,
                                            status: "Chạy",
                                        }]
                                    }
                                })
                                frappe.show_alert({ message: __('Khôi phục thành công'), indicator: 'green' })
                            }
                        }
                    ]
                }
            ],
            data=(frm.doc.custom_workstation_table || []).map(d => {
                return {
                    workstation: d.workstation,
                    time: '00:00:00',
                    status: d.status,
                };
            }),
            edittable=false,
            action=null,
            action_param=null,
            focus=true,
            tracker=null,
            ratio=[1.5, 0.8, 0.7]
        )
        if (frm.__workstation_timer) clearInterval(frm.__workstation_timer);
        frm.__workstation_timer = setInterval(() => frm.events.update_workstations_timer_display(frm, $col2), 1000);
        frm.events.update_workstations_timer_display(frm, $col2)

        let has_input = frm.doc.custom_input_table.find(row=>!row.is_meter)
        if (has_input) {
            $col4.empty()
            frm.events.define_table(
                frm, $col4, 'Đầu vào phụ gia',
                columns=[
                    { label: 'Mã mặt hàng', fieldname: 'item_code', is_primary: true },
                    { label: 'Tên mặt hàng', fieldname: 'item_name', is_secondary: true },
                    { label: 'Đã tiêu hao?', fieldname: 'qty', is_value: true },
                    { label: 'Đơn vị', fieldname: 'uom', is_unit: true},
                ],
                data=frm.doc.custom_input_table.filter(d => !d.is_meter).map(d => {
                    return {
                        item_code: d.item_code,
                        item_name: d.item_name,
                        qty: d.qty,
                        uom: d.uom,
                    };
                }),
                edittable=true,
                action="edit_inputs"
            )
        }

        let has_input_meter = frm.doc.custom_input_table.find(row=>row.is_meter)
        if (has_input_meter) {
            $col5.empty()
            frm.events.define_table(
                frm, $col5, 'Đầu vào đo bằng đồng hồ',
                columns=[
                    { label: 'Mã mặt hàng', fieldname: 'item_code', is_primary: true },
                    { label: 'Tên mặt hàng', fieldname: 'item_name', is_secondary: true },
                    { label: 'Đã tiêu hao', fieldname: 'qty' },
                    { label: 'Đơn vị', fieldname: 'uom', is_middle_unit: true},
                    { label: 'Số đo đầu', fieldname: 'meter', is_value: true, symbolize: '<i class="fas fa-arrow-right jc-i mx-1"></i>', nowrap: true },
                    { label: 'Số đo mới', fieldname: 'meter_out', is_value: true, nowrap: true },
                ],
                data=frm.doc.custom_input_table.filter(d => d.is_meter).map(d => {
                    return {
                        item_code: d.item_code,
                        item_name: d.item_name,
                        qty: d.qty,
                        uom: d.uom,
                        meter: d.meter,
                        meter_out: d.meter_out
                    };
                }),
                edittable=true,
                action="edit_inputs_meter",
                action_param=null,
                focus=true,
                tracker=null,
                ratio=[1, 0.5, 1.5]
            )
        }

        frm.events.define_table(
            frm, $col6, 'Đội ngũ làm việc',
            columns=[
                { label: 'Mã nhân viên', fieldname: 'employee', is_value: true, type: "string" },
                { label: 'Tên nhân viên', fieldname: 'employee_name', is_primary: true },
                {
                    label: 'Hành động',
                    fieldname: 'action',
                    action: [
                        {
                            label: "Đổi người",
                            class: "btn btn-sm btn-secondary jc-btn",
                            condition: row => true,
                            handler: async (row, rowIndex) => {
                                await frm.events.change_employee(frm, row)
                            }
                        },
                        {
                            label: "Nghỉ",
                            class: "btn btn-sm btn-warning jc-btn",
                            condition: row => true,
                            handler: async (row, rowIndex) => {
                                await frm.events.pause_employee(frm, row)
                            }
                        }
                    ]
                }
            ],
            data=(frm.doc.custom_team_table || []).map(d => {
                return {
                    employee: d.employee,
                    employee_name: d.employee_name
                };
            }),
            edittable=false,
            action = async () => {await frm.events.update_team_async(frm)},
            action_param = null,
            focus = true,
            tracker = null,
        )

        if (frm.doc.custom_downtime && frm.doc.custom_downtime.length > 0) {
            $col7.empty()
            frm.events.define_table(
                frm, $col7, 'Lịch sử dừng máy',
                columns=[
                    { label: 'Thời gian', fieldname: 'time', is_primary: true },
                    { label: 'Khoảng dừng', fieldname: 'duration', is_secondary: true },
                    { label: 'Thiết bị', fieldname: 'workstation', is_secondary: true },
                    { label: 'Lý do', fieldname: 'reason', is_value: true, type: "string" },
                    { label: 'Phân loại lý do', fieldname: 'group_name', is_unit: true, type: "string" },
                ],
                data=frm.doc.custom_downtime.map(d => {
                    const from_time = d.from_time ? d.from_time.slice(11, 19) : "";
                    const to_time   = d.to_time   ? d.to_time.slice(11, 19)   : "";
                    const time_str  = `${from_time} → ${to_time}`;

                    // Duration
                    let duration_str = '';
                    if (d.duration) {
                        let duration = d.duration;
                        const hours = Math.floor(duration / 3600);
                        duration %= 3600;
                        const minutes = Math.floor(duration / 60);
                        const seconds = Math.floor(duration % 60);
                        if (hours) duration_str += `${hours} giờ `;
                        if (minutes) duration_str += `${minutes} phút `;
                        if (seconds || (!hours && !minutes)) duration_str += `${seconds} giây`;
                    } else {
                        duration_str = 'Chưa có';
                    }

                    // Workstation
                    const workstation_str = d.workstation || '';

                    // is_danger
                    let reason_str = d.reason;
                    if (d.is_danger) reason_str = `<i class="fas fa-exclamation-triangle" style="color: red;"></i> Hỏng: ${d.reason}`

                    return {
                        time: time_str,
                        duration: duration_str,
                        workstation: workstation_str,
                        reason: reason_str,
                        group_name: d.group_name,
                    };
                }),
                edittable=false,
                action=null,
                action_param=null, 
                focus=true,
                tracker=null,
                ratio=[1, 2]
            )
        }

        frm.events.create_chart(frm, $col3)
        frm.events.update_feedback(frm, $col0)
    },

    update_feedback: async function(frm, $col0) {
        const tracker = frm.doc.custom_tracker;
        if (!tracker || !tracker.length || frm.doc.docstatus != 0) {
            $col0.hide();
            return;
        }

        const latest_feedback = tracker[tracker.length - 1]; // lấy dòng cuối cùng

        if (!latest_feedback.to_time) {
            $col0.html(`
                Yêu cầu từ PTCN: ${latest_feedback.feedback} <br>
                <small style="color:#3b82f6; cursor:pointer">Nhấn vào để xác nhận</small>
            `);

            $col0.off("click").on("click", async function () {
                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.update_feedback",
                    args: { docname: frm.doc.name }
                });
                frappe.show_alert("Đã xác nhận yêu cầu từ PTCN");
            });
        } else {
            $col0.hide();
        }
    },

    create_chart(frm, $col3) {
        $col3.empty()
        frm.events.define_table(frm, $col3, "Phản ánh của nhân viên",
            columns=[
                { label: "Ghi nhận", fieldname: "from_date", is_primary: true},
                { label: "Phản ánh bởi", fieldname: "employee" , is_secondary: true},
                { label: "Bị ảnh hưởng", fieldname: "workstation", is_unit: true, type: "string"},
                { label: "Nội dung", fieldname: "reason", is_value: true, type: "string"},
            ],
            data=(frm.doc.custom_comment || []).map(row => {
                let employee_name = row.employee
                if (row.employee !== "Toàn bộ công nhân") employee_name = row.employee_name
                else employee_name = "Toàn bộ"
                let workstation = row.workstation
                if (row.workstation == "Toàn bộ thiết bị") workstation = "Mọi thiết bị"
                const from_date = row.from_date ? row.from_date.slice(11, 16) : "";
                return {
                    employee: employee_name,
                    workstation: workstation,
                    reason: row.reason,
                    from_date: from_date
                }
            }),
            edittable=false,
            action=null,
            action_param=null,
            focus=true,
            tracker=null,
            ratio=null,
            overflow=true
        )
    },

    update_workstations_timer_display(frm, $wrapper) {
        const now = frappe.datetime.now_datetime();
        frm.doc.custom_workstation_table.forEach((row, rowIndex) => {
            if (!row.start_time) return;

            let diffMs = 0;
            if (row.active) {
                diffMs = (row.time || 0) + (new Date(now) - new Date(row.start_time));
            } else {
                diffMs = row.time || 0;
            }

            let diffSec = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSec / 3600);
            diffSec %= 3600;
            const minutes = Math.floor(diffSec / 60);
            const seconds = diffSec % 60;

            const hStr = String(hours).padStart(2, "0");
            const mStr = String(minutes).padStart(2, "0");
            const sStr = String(seconds).padStart(2, "0");

            const $timeField = $wrapper.find(`[data-fieldname="time"][data-rowindex="${rowIndex}"]`);
            $timeField.text(`${hStr}:${mStr}:${sStr}`);
        });
    },

    define_controller: async function(frm, $wrapper) {
        // Định nghĩa khung
        let $status = $(`<div class="flex justify-content-between align-items-center jc-header">
            <div>
                <span class="jc-circle"></span>
                <span class="jc-title">${__(frm.doc.status)}</span>
            </div>
            <div>
                <span class="jc-count">Đầu việc số 1 / 1</span>
                <i class="fas fa-bars jc-icon"></i>
            </div>
        </div>`)
        let $task = $(`<div class="jc-task"></div>`)
        let $button = $('<div class="flex justify-content-between jc-g"></div>')
        // $wrapper.append($status, $task, $button)
        if (frm.doc.docstatus === 0) $wrapper.append($status, $task, $button)
        else $wrapper.append($status)

        // Kiểm tra trạng thái
        let list;
        if (frm.doc.status === "Open") {
            list = ["Bắt đầu", "Chuyển việc", "Hoàn thành"]
            $status.find('.jc-circle').css({'background': '#047f88ff'})
        } else if (frm.doc.status === "Work In Progress") {
            list = ["Tạm dừng", "Chuyển việc", "Hoàn thành"]
            $status.find('.jc-circle').css({'background': '#1cca42ff'})
        } else if (frm.doc.status === "On Hold") {
            list = ["Tiếp tục", "Chuyển việc", "Hoàn thành"]
            $status.find('.jc-circle').css({'background': '#f04848ff'})
        } else {
            list = []
        }

        // Kiểm tra đầu việc
        let subtasks = frm.doc.custom_subtask || [];
        let currentIndex = subtasks.findIndex(row => row.done === "Đang thực hiện");
        if (currentIndex !== -1) {
            $status.find('.jc-count').text(`Đầu việc số ${currentIndex + 1} / ${frm.doc.custom_subtask.length}`);
            $task.text(`Đang thực hiện: ${subtasks[currentIndex].reason}`);
        } else {
            currentIndex = subtasks.findIndex(row => row.done === "Đang mở");
            if (currentIndex !== -1) {
                $status.find('.jc-count').text(`Đầu việc số ${currentIndex + 1} / ${frm.doc.custom_subtask.length}`);
                $task.text(`Đang mở: ${subtasks[currentIndex].reason}`);
            } else {
                const currentDone = subtasks.filter(row => row.done === "Xong").length;
                $status.find('.jc-count').text(`Hoàn thành ${currentDone} / ${frm.doc.custom_subtask.length}`);

            }
        }


        let cOpen = frm.doc.status !== "Open"
        let cTask = false;
        if (frm.doc.custom_subtask && frm.doc.custom_subtask.length > 0) {
            const pending = frm.doc.custom_subtask.filter(t => t.done === "Đang mở").length;
            if (pending > 0) cTask = true;
        }
        let cGood = false;
        if (frm.doc.custom_workstation_table && frm.doc.custom_workstation_table.length > 0) {
            cGood = frm.doc.custom_workstation_table.some(ws => ws.status !== "Hỏng")
        }

        // Định nghĩa nút điều khiển
        const buttons = [
            { icon: "fas fa-play", label: "Bắt đầu", action: () => frm.events.start_job_card(frm), condition: null },
            { icon: "fas fa-pause", label: "Tạm dừng", action: () => frm.events.pause_job_card(frm), condition: cGood },
            { icon: "fas fa-play", label: "Tiếp tục", action: () => frm.events.resume_job_card(frm), condition: cGood },
            { icon: "fas fa-forward", label: "Chuyển việc", action: () => frm.events.transfer_job_card(frm), condition: cOpen && cTask },
            { icon: "fas fa-circle-check", label: "Hoàn thành", action: () => frm.events.complete_job_card(frm), condition: cOpen }
        ]

        list.forEach(label => {
            let btnConfig = buttons.find(b => b.label === label)
                let $btn = $(`<button type="button" class="jc-button btn btn-light"><i class="${btnConfig.icon}"></i></button>`)
                $btn.on("click", btnConfig.action)
                if (btnConfig.condition === false) $btn.addClass("jc-button-disabled")
                $button.append($btn)
        })

        // Toggle hiển thị danh sách
        let expanded = false
        let $originalContent = $('<div class="jc-content"></div>');
        if (frm.doc.docstatus === 0)  {
            $originalContent.append($task, $button);

                let $commentButton = $('<div class="w-100 text-center jc-comment-button"><span>Gửi phản ánh, đề xuất</span></div>');
            $originalContent.append($commentButton);

            $commentButton.on("click", async function() {
                await frm.events.send_comment(frm);
            });
        }

        $wrapper.append($originalContent);
        
        let $listView = $(`<div class="jc-list" style="display:none"></div>`)
        subtasks.forEach((row, idx) => {
            let $row = $(`<div></div>`);
            $row.append(`${row.reason} — <b>${row.done}</b>`);

            if (row.done === "Đang thực hiện") {
                $row.addClass('jc-undone');
            }
            $listView.append($row);
        });
        $wrapper.append($originalContent)

        $status.find(".jc-icon").on("click", function() {
            if (!expanded) {
                $originalContent.slideUp(200, function() {
                    $originalContent.detach()
                    $wrapper.append($listView)
                    $listView.hide().slideDown(200)
                })
            } else {
                $listView.slideUp(200, function() {
                    $listView.detach()
                    $wrapper.append($originalContent)
                    $originalContent.hide().slideDown(200)
                })
            }
            expanded = !expanded
        })
    },

    define_table: function(frm, $wrapper, title, columns, data, edittable=false, action=null, action_param=null, focus=true, tracker=null, ratio=null, overflow=false) {
        // Header
        const $header = $(`<div class="d-flex flex-wrap justify-content-between jc-title jc-tb-title"><div>${title || ""}</div></div>`)
        $wrapper.append($header)

        // Edit Button
        if (frm.doc.docstatus === 0 && !edittable && action && data.length > 0) {
            const $editBtn = $(`<button class="btn btn-secondary jc-edit-btn">Sửa</button>`).on("click", action)
            $header.append($editBtn)
        }

        // Desktop
        const $desktopWrapper = $(`
            <div class="d-none d-md-block" style="user-select:none;">
                <table class="table table-sm table-bordered">
                    <thead><tr></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        `);

        const $container = $('<div></div>').css({
            ...(overflow ? {
                maxHeight: "220px",
                overflowY: "auto",
            } : {})
        });

        $container.append($desktopWrapper);
        $wrapper.append($container);
        const $desktopTable = $desktopWrapper.find('table')
        const desktopInputs = [] 
        columns.forEach((col, i) => {
            const isLast = i === columns.length - 1;
            const thStyle = `
                ${overflow && !isLast ? 'white-space: nowrap;' : ''}
                ${col.action ? 'text-align: end; width: 1%; min-width: 100px; padding-right: 15px;' : ''}
            `;
            const th = `<th style="${thStyle}">${col.label || ""}</th>`;
            $desktopTable.find('tr').append(th);
        });


        data.forEach((row, index) => {
            let $tr = $(`<tr class="desktop-row" style="background-color: ${index % 2 == 0 ? '#f9f9f9' : '#ffffff'}"></tr>`)
            $desktopTable.find('tbody').append($tr)
            columns.forEach(col => {
                let $td = null
                if (col.action && frm.doc.docstatus === 0) {
                    $td = $(`<td class="text-nowrap" style="text-align: end;"></td>`)
                    col.action.forEach(btn => {
                        if (!btn.condition || btn.condition(row)) {
                            const $button = $(`<button class="${btn.class} btn btn-sm mr-2">${btn.label}</button>`).on("click", () => btn.handler(row, index))
                            $td.append($button)
                        }
                    })
                } else {
                    $td = $(`<td style="vertical-align: middle;">${row[col.fieldname] || ''}</td>`)
                    let flag = true
                    if (col.is_value && col.type !== "string" && frm.doc.docstatus === 0) {
                        const $input = $(`<input data-display="desktop" data-fieldname="${col.fieldname}" data-rowindex="${index}" class="wo-input wo-value-input" style="max-width:100px;" value="${row[col.fieldname] || ''}">`)
                        $td.empty().append($input)
                        desktopInputs.push($input)
                        flag = false
                    }
                        if (flag) {
                        $td.attr('data-fieldname', col.fieldname)
                        $td.attr('data-rowindex', index)                    
                    }
                }
                $tr.append($td)
            })
        })

        // Mobile
        const $mobileWrapper = $(`<div class="d-md-none mt-2" style="font-size: 14px;"><div class="d-flex mobile-head" style="font-weight:bold"></div></div>`)
        $wrapper.append($mobileWrapper)
        const primary = columns.find(c => c.is_primary)
        const middle = columns.filter(c => !c.is_primary && !c.is_secondary && !c.is_value && !c.is_unit && !c.action)
        const secondary = columns.filter(c => c.is_secondary)
        const value = columns.filter(c => c.is_value)
        const unit = columns.filter(c => c.is_unit)
        const is_middle_unit = columns.filter(c => c.is_middle_unit)
        const mobileInputs = []
        let $theadMobile = $mobileWrapper.find('.mobile-head')
        const columnCount = middle.length > 0 ? 3 : 2
        const defineRatio = ratio ?? Array(columnCount).fill(1)
        if (middle.length > 0) {
            $theadMobile.append(`<div style="flex:${defineRatio[0]}" class="text-left border-bottom">${primary?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:${defineRatio[1]}; border-left:1px solid #dee2e6; border-right:1px solid #dee2e6;" class="text-center border-bottom">${middle[0]?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:${defineRatio[2]}" class="text-right border-bottom">${value[0]?.label || ""}</div>`)
        } else {
            $theadMobile.append(`<div style="flex:${defineRatio[0]}; border-right:1px solid #dee2e6;" class="text-left border-bottom">${primary?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:${defineRatio[1]}" class="text-right border-bottom">${value[0]?.label || ""}</div>`)
        }
        data.forEach((row, index) => {
            const $row = $(`<div class="d-flex flex-column align-items-stretch mobile-row" style="background-color: ${index % 2 == 0 ? '#f9f9f9' : '#ffffff'}"><div class="mobile-row-wrapper d-flex"></div></div>`)
            const $rowWrapper = $row.find('.mobile-row-wrapper')
            $mobileWrapper.append($row)
            let $left, $middle, $right
            if (middle.length > 0) {
                $left = $(`<div style="flex:${defineRatio[0]}" class="text-left py-2"></div>`)
                $middle = $(`<div style="flex:${defineRatio[1]}; border-left:1px solid #dee2e6; border-right:1px solid #dee2e6;" class="text-center py-2"></div>`)
                $right = $(`<div style="flex:${defineRatio[2]}" class="text-right py-2"></div>`)
                $rowWrapper.append($left, $middle, $right)
            } else {
                $left = $(`<div style="flex:${defineRatio[0]}; border-right:1px solid #dee2e6;" class="text-left py-2"></div>`)
                $right = $(`<div style="flex:${defineRatio[1]}" class="text-right py-2"></div>`)
                $rowWrapper.append($left, $right)
            }

            if (primary.fieldname in row) $left.append($(`<div data-fieldname="${primary.fieldname}" data-rowindex=${index}>${row[primary.fieldname]}</div>`))
            if (secondary.length > 0) {
                secondary.forEach((item) => {
                    if (item.fieldname in row) $left.append($(`<div style="font-size: 11px; line-height: 11px;padding-bottom: 10px;" data-fieldname="${row.fieldname}" data-rowindex=${index}>${row[item.fieldname]}</div>`))
                })
            }

            if (middle.length > 0) {
                let middle_unit = '';
                if (is_middle_unit.length > 0)  middle_unit = row[is_middle_unit[0].fieldname]
                if (middle[0].fieldname in row) $middle.append($(`<div data-fieldname="${middle[0].fieldname}" data-rowindex=${index}>${row[middle[0].fieldname]} ${middle_unit}</div>`))
            }

            if (value.length > 0) {
                const $rightWrapper = $(`<div class="d-flex justify-content-end align-items-center" style="gap:5px;padding-left:10px;"></div>`)
                value.forEach((item) => {
                    if (item.type != "string" && frm.doc.docstatus === 0) {
                        const $input = $(`<input data-display="mobile" data-fieldname="${item.fieldname}" data-rowindex=${index} class="wo-input wo-value-input" style="max-width:100px;text-align:end" value="${row[item.fieldname] || ''}">`)
                        $rightWrapper.append($input)
                        mobileInputs.push($input)
                        if (item.symbolize) $rightWrapper.append(item.symbolize)
                    } else {
                        $rightWrapper.append($(`<div class="" data-fieldname="${row.fieldname}" data-rowindex=${index}>${row[item.fieldname]}</div>`))
                    }
                })
                $right.append($rightWrapper)
                if (unit.length > 0) {
                    const only_unit = unit[0]
                    if (only_unit.type === "string") $right.append($(`<div style="font-size: 11px; line-height: 11px;padding-bottom: 10px;">${row[only_unit.fieldname]}</div>`))
                    else $rightWrapper.append($(`<div>${row[only_unit.fieldname]}</div>`))
                }
            }

            const actionColumns = columns.filter(col => col.action);
            if (frm.doc.docstatus === 0 && actionColumns.length > 0) {
                const $rowButtons = $(`<div class="py-2"></div>`)
                $left.append($rowButtons)
                actionColumns.forEach(col => {
                    col.action.forEach(btn => {
                        if (!btn.condition || btn.condition(row)) {
                            const $button = $(`<button class="${btn.class} btn btn-sm mr-2 mb-2 text-nowrap">${btn.label}</button>`)
                                .on("click", () => btn.handler(row, index));
                            $rowButtons.append($button);
                        }
                    });
                });
            }
            
            if (secondary.length === 0 && actionColumns.length === 0) {
                $left.css({'display': 'flex', 'align-items': 'center'})
            }
        })

        if (frm.doc.docstatus != 0) return;
        let editing = false;

        $wrapper.on('input', '.wo-value-input', function() {
            const $this = $(this)
            const field = $this.data('fieldname')
            const rowIndex = $this.data('rowindex')
            const val = $this.val()

            $wrapper.find(`[data-fieldname="${field}"][data-rowindex="${rowIndex}"]`).not($this).val(val)
            if (!focus) {
                const inputsArray = $wrapper.find('.wo-value-input').map((_, el) => $(el)).get()
                const result = covertAllData(data, inputsArray)
                tracker.data = result;
            }
        })

        function enableEditing(inputs) {
            if (editing) return
            editing = true

            inputs.forEach(($input, index) => {
                $input.data("original-value", $input.val());
                $input.on('keydown.nextFocus', function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        const nextIndex = index + 1;
                        if (nextIndex < inputs.length) scrollAndFocus(inputs, nextIndex);
                        else $input.blur();
                    }
                });

                $input.on('blur.saveCheck', function() {
                    const hasChanges = inputs.some($inp => $inp.val() !== $inp.data("original-value"));
                    if (!hasChanges) return;
                    setTimeout(() => {
                        const stillEditing = inputs.some($inp => $inp.is(':focus'));
                        if (!stillEditing) {
                            if (focus) {
                                frappe.confirm(
                                    "Lưu thay đổi?",
                                    () => {
                                        const result = covertAllData(data, inputs);
                                        if (action) frm.events[action](frm, result, action_param);
                                        disableEditing(inputs);
                                    },
                                    () => disableEditing(inputs)
                                );
                            }
                        }
                    }, 150);
                });                
            })
            if (inputs[0]) scrollAndFocus(inputs, 0);
        }

        function disableEditing(inputs) {
            editing = false;

            inputs.forEach($input => {
                const original = $input.data("original-value");
                $input.val(original).off('keydown.nextFocus').off('blur.saveCheck');

                const field = $input.data('fieldname');
                const rowIndex = $input.data('rowindex');
                $wrapper.find(`[data-fieldname="${field}"][data-rowindex="${rowIndex}"]`).not($input).val(original);
            });
        }

        $wrapper.on("click", ".desktop-row", function() {
            if (!editing) enableEditing(desktopInputs);
        });

        $wrapper.on("click", ".mobile-row", function() {
            if (!editing) enableEditing(mobileInputs);
        });
    },

    send_comment: async function(frm) {
        const teams = ["Toàn bộ công nhân"]
        frm.doc.custom_team_table.forEach(row => teams.push(`${row.employee}: ${row.employee_name}`))
        const workstations  = ["Toàn bộ thiết bị"]
        frm.doc.custom_workstation_table.forEach(row => workstations.push(row.workstation))

        let d = new frappe.ui.Dialog({
            title: "Điền thông tin phản ánh, đề xuất",
            fields: [
                {fieldname: "employee", fieldtype: "Select", options: teams, label: "Chọn người phản ánh", default: "Toàn bộ công nhân"},
                {fieldname: "workstation", fieldtype: "Select", options: workstations, label: "Chọn thiết bị liên quan", default: "Toàn bộ thiết bị"},
                {fieldname: "reason", fieldtype: "Small Text", label: "Nội dung phản ánh"}
            ],
            primary_action_label: "Gửi phản ánh",
            primary_action: async (values) => {
                await frappe.xcall("tahp.doc_events.job_card.job_card.process_comment", 
                      {job_card: frm.doc.name, employee: values.employee, workstation: values.workstation, reason: values.reason})
                d.hide();
                frappe.msgprint("Gửi phản ánh thành công, phản ánh sẽ được thông báo tới Trưởng ca")
            }
        })

        d.show();
    },

    start_job_card: async function(frm) {
        if (
            !frm.doc.custom_workstation_table || 
            !frm.doc.custom_workstation_table.length
        ) {
            await frm.events.start_workstations(frm);
        }

        if (
            !frm.doc.custom_team_table ||
            !frm.doc.custom_team_table.length
        ) {
            await frm.events.update_team(frm);
        }

        await frm.events.transfer_job_card(frm);

        const workstations = frm.doc.custom_workstation_table.map(row => ({
            ...row,
            status: "Chạy"
        }));

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.update_workstations",
            args: {
                job_card: frm.doc.name,
                workstations
            }
        });
    },

    pause_job_card: async function(frm) {
        const running_ws = (frm.doc.custom_workstation_table || []).filter(
            row => row.status === "Chạy"
        );
        if (running_ws.length === 0) return;

        const reason_info = await frm.events.select_pause_reason(frm, running_ws.map(ws => ws.workstation));
        if (!reason_info) return;
        const workstations = running_ws.map(ws => ({
            workstation: ws.workstation,
            status: "Dừng",
            reason: reason_info.reason,
            group_name: reason_info.group_name || null
        }));

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.update_workstations",
            args: {
                job_card: frm.doc.name,
                workstations
            }
        });
    },

    resume_job_card: async function(frm) {
        const workstations_ready = (frm.doc.custom_workstation_table || []).filter(
            row => row.status === "Dừng"
        );
        if (workstations_ready.length === 0) return;
        const workstations = workstations_ready.map(row => ({
            ...row,
            status: "Chạy"
        }));

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.update_workstations",
            args: {
                job_card: frm.doc.name,
                workstations
            }
        });
    },

    complete_job_card: async function(frm) {
        if (frm.doc.custom_subtask) {
            let subtask_list = frm.doc.custom_subtask || [];
            let in_progress_count = subtask_list.filter(t => t.done === "Đang mở").length;
            if (in_progress_count > 0) {
                const message = `<div>Bạn chưa hoàn thành toàn bộ đầu việc của Công đoạn.</div>
                                <p>Bạn có chắc chắn muốn tiếp tục kết thúc công đoạn không?</p>`;

                await new Promise((resolve, reject) => {
                    frappe.confirm(message, resolve, () => {
                        reject();
                        return;
                    });
                });
            }
        }

        frappe.confirm(
            "Xác nhận hoàn thành LSX Công đoạn?",
            () => {
                frappe.call({
                    method: "tahp.doc_events.job_card.job_card.submit",
                    args: { job_card: frm.doc.name }
                });
            }
        );
    },

    transfer_job_card: async function(frm) {
        return new Promise(async (resolve, reject) => {
            const subtasks = frm.doc.custom_subtask || [];
            if (!subtasks.length) {
                resolve(true)
                return
            }
            if (subtasks[0].reason === frm.doc.operation) {
                resolve(true)
                return
            }
            const selectable = subtasks.filter(t => t.done === "Đang mở");
            if (!selectable.length) {
                resolve(true)
                return
            }

            const d = new frappe.ui.Dialog({
                title: __('Chọn đầu việc sắp thực hiện'),
                fields: [{
                    fieldname: 'subtask',
                    fieldtype: 'Select',
                    label: 'Đầu việc',
                    options: selectable.map(t => t.reason),
                    default: selectable[0].reason,
                    reqd: 1
                }],
                primary_action_label: __('Xác nhận'),
                primary_action: async function() {
                    const values = d.get_values();
                    if (!values || !values.subtask) {
                        frappe.msgprint(__('Bạn phải chọn một đầu việc'));
                        return;
                    }

                    await frappe.call({
                        method: "tahp.doc_events.job_card.job_card.set_subtask",
                        args: {
                            job_card: frm.doc.name,
                            reason: values.subtask
                        }
                    });

                    d.hide();
                    resolve(true);
                },
            });

            d.show();
        });
    },

    start_workstations: async function(frm) {
        return new Promise(async (resolve, reject) => {
            try {
                let workstations = (await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.get_workstations",
                    args: { job_card: frm.doc.name }
                })).message;

                if (!workstations || workstations.length === 0) {
                    frappe.msgprint("Không có thiết bị nào để chọn.");
                    return reject();
                }

                const d = new frappe.ui.Dialog({
                    title: 'Chọn thiết bị',
                    fields: [{ fieldname: "html_table", fieldtype: "HTML" }],
                    primary_action_label: "Tiếp tục",
                    primary_action: async () => {
                        await frappe.call({
                            method: "tahp.doc_events.job_card.job_card.set_workstations",
                            args: { job_card: frm.doc.name, workstations }
                        });
                        d.hide(); resolve();
                    },
                });

                d.show();

                const renderTable = () => {
                    const html = `<table class="table table-bordered">
                        <thead style="background: #eee">
                            <tr>
                                <th>Tên thiết bị</th>
                                <th style="width:1%; white-space:nowrap;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workstations.map((ws, i) =>
                                `<tr>
                                    <td>${ws.workstation}</td>
                                    <td  style="text-align:center;">
                                        ${workstations.length > 1 
                                            ? `<button class="btn btn-xs btn-danger" style="padding:5px 10px;" data-idx="${i}">Xóa</button>` 
                                            : ""}
                                    </td>
                                </tr>`
                            ).join('')}
                        </tbody>
                    </table>`;

                    d.fields_dict.html_table.$wrapper.html(html);

                    if (workstations.length > 1) {
                        d.fields_dict.html_table.$wrapper.find('button').click(e => {
                            const i = $(e.currentTarget).data('idx');
                            workstations.splice(i, 1);
                            renderTable();
                        });
                    }
                };

                renderTable();
            } catch (err) { reject(err); }
        });
    },

    update_team: async function(frm) {
        return new Promise(async (resolve, reject) => {
            try {
                if (frm.doc.custom_team_table && frm.doc.custom_team_table.length > 0) {
                    resolve(true);
                    return;
                }

                const response = await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.get_team",
                    args: { job_card: frm.doc.name }
                });

                let team = response.message || [];

                const d = new frappe.ui.Dialog({
                    title: 'Danh sách nhân viên',
                    fields: [
                        { fieldname: "html_table", fieldtype: "HTML" },
                        {
                            label: "Gõ tên nhân viên muốn thêm tại đây",
                            fieldname: "employee_input",
                            fieldtype: "Link",
                            options: "Employee",
                            change: async function() {
                                const emp_id = d.get_value("employee_input");
                                if (!emp_id) return;

                                let emp = await frappe.db.get_value(
                                    "Employee",
                                    emp_id,
                                    "employee_name"
                                );

                                team.push({
                                    employee: emp_id,
                                    employee_name: emp.message.employee_name
                                });

                                d.set_value("employee_input", "");
                                renderTable();
                            },
                            get_query: function() {
                                let selected = team.map(r => r.employee);
                                return {
                                    filters: [["Employee", "employee", "not in", selected]]
                                };
                            }
                        }
                    ],
                    primary_action_label: "Tiếp tục",
                    primary_action: async function() {
                        if (!team || team.length === 0) {
                            frappe.msgprint("Phải có ít nhất 1 thành viên.");
                            return;
                        }

                        await frappe.call({
                            method: "tahp.doc_events.job_card.job_card.set_team",
                            args: { job_card: frm.doc.name, team }
                        });

                        d.hide();
                        resolve();
                    }
                });

                d.show();

                // -------------------------------------------------------------------
                // RENDER TABLE
                // -------------------------------------------------------------------
                const renderTable = () => {
                    const html = `
                        <table class="table table-bordered">
                            <thead style="background:#eee">
                                <tr>
                                    <th>Nhân viên</th>
                                    <th style="width:1%; white-space:nowrap;">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${team
                                    .map(
                                        (row, i) => `
                                    <tr>
                                        <td>
                                            ${row.employee}: ${row.employee_name}
                                        </td>
                                        <td style="text-align:center;">
                                            ${team.length > 1 
                                            ? 
                                            `<button 
                                                class="btn btn-xs btn-danger" 
                                                data-idx="${i}"
                                                style="padding:5px 10px;"
                                            >
                                                Xóa
                                            </button>`
                                            : ""}
                                        </td>
                                    </tr>
                                    `
                                    )
                                    .join("")}
                            </tbody>
                        </table>
                    `;

                    d.fields_dict.html_table.$wrapper.html(html);

                    // event delete
                    d.fields_dict.html_table.$wrapper.find("button").click(e => {
                        const i = $(e.currentTarget).data("idx");
                        team.splice(i, 1);
                        renderTable();
                    });
                };

                renderTable();

            } catch (err) {
                reject(err);
            }
        });
    },

    update_team_async: async function(frm) {
        const response = await frappe.call({
            method: "tahp.doc_events.job_card.job_card.get_team",
            args: { job_card: frm.doc.name }
        });

        let team = response.message || [];

        const d = new frappe.ui.Dialog({
            title: 'Danh sách nhân viên',
            fields: [
                { fieldname: "html_table", fieldtype: "HTML" },
                {
                    label: "Gõ tên nhân viên muốn thêm tại đây",
                    fieldname: "employee_input",
                    fieldtype: "Link",
                    options: "Employee",
                    change: async function() {
                        const emp_id = d.get_value("employee_input");
                        if (!emp_id) return;

                        let emp = await frappe.db.get_value(
                            "Employee",
                            emp_id,
                            "employee_name"
                        );

                        team.push({
                            employee: emp_id,
                            employee_name: emp.message.employee_name
                        });

                        d.set_value("employee_input", "");
                        renderTable();
                    },
                    get_query: function() {
                        let selected = team.map(r => r.employee);
                        return {
                            filters: [["Employee", "employee", "not in", selected]]
                        };
                    }
                }
            ],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                if (!team || team.length === 0) {
                    frappe.msgprint("Phải có ít nhất 1 thành viên.");
                    return;
                }

                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.set_team",
                    args: { job_card: frm.doc.name, team }
                });

                d.hide();
            }
        });

        d.show();

        // RENDER TABLE GIỐNG HỆT update_team
        const renderTable = () => {
            const html = `
                <table class="table table-bordered">
                    <thead style="background:#eee">
                        <tr>
                            <th>Nhân viên</th>
                            <th style="width:1%; white-space:nowrap;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${team
                            .map(
                                (row, i) => `
                            <tr>
                                <td>
                                    ${row.employee}: ${row.employee_name}
                                </td>
                                <td style="text-align:center;">
                                    ${team.length > 1 
                                    ? 
                                    `<button 
                                        class="btn btn-xs btn-danger" 
                                        data-idx="${i}"
                                        style="padding:5px 10px;"
                                    >
                                        Xóa
                                    </button>`
                                    : ""}
                                </td>
                            </tr>
                            `
                            )
                            .join("")}
                    </tbody>
                </table>
            `;

            d.fields_dict.html_table.$wrapper.html(html);

            d.fields_dict.html_table.$wrapper.find("button").click(e => {
                const i = $(e.currentTarget).data("idx");
                team.splice(i, 1);
                renderTable();
            });
        };

        renderTable();
    },

    change_employee: async function(frm, row) {
        frappe.prompt([
            {
                fieldname: 'new_employee',
                label: __('Mã nhân viên mới'),
                fieldtype: 'Link',
                options: 'Employee',
                reqd: 1,
                get_query: function() {
                    const existing_ids = (frm.doc.custom_team_table || []).map(r => r.employee);
                    return {
                        filters: [
                            ['name', 'not in', existing_ids]
                        ]
                    };
                }
            }
        ],
        async function(values) {
            // values.new_employee là giá trị mà người dùng nhập
            try {
                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.change_member",
                    args: {
                        job_card: frm.doc.name,
                        employee: row.employee,
                        new_employee: values.new_employee
                    }
                });
                frappe.show_alert({ message: __('Đổi nhân viên thành công'), indicator: 'green' });
            } catch (err) {
                frappe.show_alert({ message: __('Đổi nhân viên thất bại'), indicator: 'red' });
            }
        },
        __('Đổi nhân viên'), // title của prompt
        __('OK')            // label nút primary
        );
    },

    pause_employee: async function(frm, row) {
        try {
            await frappe.call({
                method: "tahp.doc_events.job_card.job_card.pause_member",
                args: {
                    job_card: frm.doc.name,
                    employee: row.employee
                }
            });
            frappe.show_alert({ message:__('Đã cập nhật lại danh sách nhân viên'), indicator:'green'});
        } catch (err) {
            frappe.show_alert({ message:__('Cập nhật danh sách nhân viên thất bại'), indicator:'red'});
        }
    },

    update_configs: async function(frm, data, workstation) {
        if (!workstation) return;

        const updatedConfigs = data
            .filter(item => item.workstation === workstation)
            .filter(item => frm.doc.custom_config_table[item.config_key] !== item.config_value);

        if (updatedConfigs.length === 0) return;

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.set_configs",
            args: {
                job_card: frm.doc.name,
                workstation: workstation,
                configs: updatedConfigs
            }
        });
    },

    edit_inputs: async function(frm, data) {
        if (!Array.isArray(data) || !data.length) return;
        const to_update = data.map(d => ({ ...d, is_meter: 0 }));
        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.set_inputs",
            args: { job_card: frm.doc.name, inputs: to_update }
        });
    },

    edit_inputs_meter: async function(frm, data) {
        if (!Array.isArray(data) || !data.length) return;

        for (let d of data) {
            if (d.meter_out !== undefined && d.meter !== undefined) {
                if (Number(d.meter) >= Number(d.meter_out)) {
                    frappe.msgprint("Số đo ban đầu phải thấp hơn số đo hiện tại");
                    frm.reload_doc();
                    return;
                }
            }
        }

        const to_update = data.map(d => ({ ...d, is_meter: 1 }));
        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.set_inputs",
            args: { job_card: frm.doc.name, inputs: to_update }
        });
    },

    pause_workstation: async function(frm, workstation) {
        const response = await frappe.call({
            method: "tahp.tahp.doctype.downtime_reason.downtime_reason.get"
        });

        const groups = (response.message.group || []).filter(g => g.group_name);
        const items = response.message.items || [];

        const d = new frappe.ui.Dialog({
            title: `Chọn lý do dừng - ${workstation.workstation}`,
            fields: [
                {
                    fieldname: "group_name",
                    label: __("Chọn phân loại"),
                    fieldtype: "Select",
                    options: groups.map(g => g.group_name)
                },
                {
                    fieldname: "reason",
                    label: __("Lý do dừng"),
                    fieldtype: "Select",
                    options: [""],
                    in_place_edit: 1
                },
                {
                    fieldname: "other_reason_toggle",
                    label: __("Điền lý do khác"),
                    fieldtype: "Check",
                    default: 0
                },
                {
                    fieldname: "other_reason",
                    label: __("Nhập lý do khác"),
                    fieldtype: "Data",
                }
            ],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (!values) return;

                const selected_reason = values.other_reason_toggle ? values.other_reason : values.reason;
                if (!selected_reason) {
                    frappe.msgprint("Vui lòng chọn hoặc nhập lý do dừng");
                    return;
                }

                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.update_workstations",
                    args: {
                        job_card: frm.doc.name,
                        workstations: [{
                            workstation: workstation.workstation,
                            status: "Dừng",
                            reason: selected_reason,
                            group_name: values.group_name ? values.group_name : null
                        }]
                    }
                });

                d.hide();
            },
        });

        // === LOGIC CHÍNH ===
        const reason_field = d.get_field("reason");
        const group_field = d.get_field("group_name");
        const toggle_field = d.get_field("other_reason_toggle");
        const other_reason_field = d.get_field("other_reason");

        // Lọc danh sách theo operation
        let filtered = items.filter(i => i.operation === frm.doc.operation);
        if (filtered.length === 0) {
            filtered = items.filter(i => !i.operation || i.operation.trim() === "");
        } else {
            filtered = filtered.concat(items.filter(i => !i.operation || i.operation.trim() === ""));
        }

        if (filtered.length > 0) {
            // Cập nhật danh sách lý do ban đầu
            reason_field.df.options = filtered.map(i => i.reason).join("\n");
            reason_field.refresh();

            // Xác định default
            let default_item = filtered.find(i => i.operation === frm.doc.operation);
            if (!default_item) default_item = filtered[0];

            if (default_item.group_name) {
                group_field.set_value(default_item.group_name);
            }
            if (default_item.reason) {
                reason_field.set_value(default_item.reason);
            }
        } else {
            reason_field.wrapper.style.display = 'none';
            group_field.wrapper.style.display = 'none';
            toggle_field.set_value(1);
            toggle_field.refresh();
        }

        // --- Xử lý đổi group_name ---
        group_field.df.change = function () {
            const selected_group = d.get_value("group_name");
            if (!selected_group) return;

            let group_filtered = filtered.filter(i => i.group_name === selected_group);
            if (group_filtered.length === 0) {
                // Nếu không có reason nào thuộc group này thì ẩn field reason
                reason_field.wrapper.style.display = 'none';
                reason_field.set_value("");
                reason_field.refresh();
                return;
            }

            // Cập nhật danh sách reason cho group đã chọn
            reason_field.df.options = group_filtered.map(i => i.reason).join("\n");
            reason_field.refresh();

            // Gán default = reason đầu tiên
            reason_field.set_value(group_filtered[0].reason);
        };

        // Toggle cơ chế nhập lý do khác
        toggle_field.df.change = function () {
            const use_other = d.get_value("other_reason_toggle");
            if (use_other) {
                reason_field.wrapper.style.display = 'none';
                reason_field.refresh();
                other_reason_field.wrapper.style.display = '';
                other_reason_field.refresh();
            } else {
                if (!filtered.length) return;
                if (reason_field.wrapper.style.display == 'none') {
                    let exists = filtered.some(row => row.group_name == d.get_value("group_name"));
                    if (!exists) {
                        d.set_value("other_reason_toggle", 1)
                        other_reason_field.refresh();
                        return;
                    }
                }
                other_reason_field.wrapper.style.display = 'none';
                other_reason_field.refresh();
                reason_field.wrapper.style.display = '';
                reason_field.refresh();
            }
        };

        other_reason_field.df.change = function () {
            const other = d.get_value("other_reason");
            const reason = d.get_value("reason");
            if (reason && other) {
                reason_field.set_value("");
                reason_field.refresh();
            }
        };

        toggle_field.df.change();
        d.show();
    },

    select_pause_reason: function(frm, ws_list) {
        return new Promise(async (resolve) => {
            const response = await frappe.call({
                method: "tahp.tahp.doctype.downtime_reason.downtime_reason.get"
            });

            const groups = (response.message.group || []).filter(g => g.group_name);
            const items = response.message.items || [];

            const d = new frappe.ui.Dialog({
                title: `Chọn lý do dừng`,
                fields: [
                    {
                        fieldname: "group_name",
                        label: __("Chọn phân loại"),
                        fieldtype: "Select",
                        options: groups.map(g => g.group_name)
                    },
                    {
                        fieldname: "reason",
                        label: __("Lý do dừng"),
                        fieldtype: "Select",
                        options: [""],
                        in_place_edit: 1
                    },
                    {
                        fieldname: "other_reason_toggle",
                        label: __("Điền lý do khác"),
                        fieldtype: "Check",
                        default: 0
                    },
                    {
                        fieldname: "other_reason",
                        label: __("Nhập lý do khác"),
                        fieldtype: "Data",
                    }
                ],
                primary_action_label: "Xác nhận",
                primary_action: function() {
                    const values = d.get_values();
                    if (!values) return;

                    const selected_reason = values.other_reason_toggle ? values.other_reason : values.reason;
                    if (!selected_reason) {
                        frappe.msgprint("Vui lòng chọn hoặc nhập lý do dừng");
                        return;
                    }

                    d.hide();
                    resolve({
                        reason: selected_reason,
                        group_name: values.group_name || null
                    });
                },
            });

            // === LOGIC CHÍNH ===
            const reason_field = d.get_field("reason");
            const group_field = d.get_field("group_name");
            const toggle_field = d.get_field("other_reason_toggle");
            const other_reason_field = d.get_field("other_reason");

            // Lọc danh sách theo operation
            let filtered = items.filter(i => i.operation === frm.doc.operation);
            if (filtered.length === 0) {
                filtered = items.filter(i => !i.operation || i.operation.trim() === "");
            } else {
                filtered = filtered.concat(items.filter(i => !i.operation || i.operation.trim() === ""));
            }

            if (filtered.length > 0) {
                // Cập nhật danh sách lý do ban đầu
                reason_field.df.options = filtered.map(i => i.reason).join("\n");
                reason_field.refresh();

                // Xác định default
                let default_item = filtered.find(i => i.operation === frm.doc.operation);
                if (!default_item) default_item = filtered[0];

                if (default_item.group_name) {
                    group_field.set_value(default_item.group_name);
                }
                if (default_item.reason) {
                    reason_field.set_value(default_item.reason);
                }
            } else {
                reason_field.wrapper.style.display = 'none';
                group_field.wrapper.style.display = 'none';
                toggle_field.set_value(1);
                toggle_field.refresh();
            }

            // --- Xử lý đổi group_name ---
            group_field.df.change = function () {
                const selected_group = d.get_value("group_name");
                if (!selected_group) return;

                let group_filtered = filtered.filter(i => i.group_name === selected_group);
                if (group_filtered.length === 0) {
                    // Nếu không có reason nào thuộc group này thì ẩn field reason
                    reason_field.wrapper.style.display = 'none';
                    reason_field.set_value("");
                    reason_field.refresh();
                    return;
                }

                // Cập nhật danh sách reason cho group đã chọn
                reason_field.df.options = group_filtered.map(i => i.reason).join("\n");
                reason_field.refresh();

                // Gán default = reason đầu tiên
                reason_field.set_value(group_filtered[0].reason);
            };

            // Toggle cơ chế nhập lý do khác
            toggle_field.df.change = function () {
                const use_other = d.get_value("other_reason_toggle");
                if (use_other) {
                    reason_field.wrapper.style.display = 'none';
                    reason_field.refresh();
                    other_reason_field.wrapper.style.display = '';
                    other_reason_field.refresh();
                } else {
                    if (!filtered.length) return;
                    if (reason_field.wrapper.style.display == 'none') {
                        let exists = filtered.some(row => row.group_name == d.get_value("group_name"));
                        if (!exists) {
                            d.set_value("other_reason_toggle", 1)
                            other_reason_field.refresh();
                            return;
                        }
                    }
                    other_reason_field.wrapper.style.display = 'none';
                    other_reason_field.refresh();
                    reason_field.wrapper.style.display = '';
                    reason_field.refresh();
                }
            };

            other_reason_field.df.change = function () {
                const other = d.get_value("other_reason");
                const reason = d.get_value("reason");
                if (reason && other) {
                    reason_field.set_value("");
                    reason_field.refresh();
                }
            };

            toggle_field.df.change();
            d.show();
        });
    },

    problem_workstation: async function(frm, workstation) {
        const response = await frappe.call({
            method: "tahp.tahp.doctype.problem_reason.problem_reason.get"
        });

        const groups = (response.message.items || []).filter(
            g => !g.workstation || g.workstation === frm.doc.workstation
        );

        let default_group = null;
        if (groups.length) {
            const matched = groups.find(g => g.workstation === frm.doc.workstation);
            default_group = matched ? matched.group_name : groups[0].group_name;
        } else {
            default_group = "Hỏng máy";
        }

        const d = new frappe.ui.Dialog({
            title: `Báo cáo hỏng máy - ${workstation.workstation}`,
            fields: [
                {
                    fieldname: "group_name",
                    label: __("Chọn phân loại"),
                    fieldtype: "Select",
                    options: groups.length ? groups.map(g => g.group_name) : ["Hỏng máy"],
                    default: default_group
                },
                {
                    fieldname: "reason",
                    label: __("Mô tả sự cố"),
                    fieldtype: "Small Text",
                }
            ],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (!values) return;

                if (!values.reason) {
                    frappe.msgprint("Vui lòng nhập mô tả sự cố");
                    return;
                }

                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.update_workstations",
                    args: {
                        job_card: frm.doc.name,
                        workstations: [{
                            workstation: workstation.workstation,
                            status: "Hỏng",
                            reason: values.reason,
                            group_name: values.group_name ? values.group_name : null
                        }]
                    }
                });

                d.hide();
            },
        });

        d.show();
    },
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