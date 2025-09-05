frappe.ui.form.on("Job Card", {
    refresh: async function(frm) {
        // Ví dụ chỉ cho hiện các nút
        frm.set_intro("")
        await frm.events.generate_layout(frm);
        frm.toolbar.page.add_inner_message('')
        await frm.events.check_status(frm);
        frm.remove_custom_button("Pause Job")
        frm.remove_custom_button("Complete Job")
        frm.remove_custom_button("Start Job")
        frm.remove_custom_button("Resume Job")
        frm.page.clear_primary_action();
    },

    check_status: async function(frm) {
        // await frm.events.start_timer(frm);
        await frm.events.update_status(frm);
        if (!frm.doc.custom_active) {
            if (!frm.doc.custom_start_time) return;
            await frm.events.render_buttons(frm, ["Tiếp tục", "Chuyển việc", "Hoàn thành"], frm.$buttons_section)
        } else {
            await frm.events.render_buttons(frm, ["Tạm dừng", "Chuyển việc", "Hoàn thành"], frm.$buttons_section)
        }
    },

    // === Các hàm action ===
    start_job_card: async function(frm) {
        if (!frm.doc.custom_start_time) await frm.events.update_team(frm);
        await frm.events.update_status(frm, "start");        
        // await frm.events.update_team(frm);
        // await frm.events.update_workstations(frm);
        // await frm.events.update_configs(frm);
        // await frm.events.update_inputs(frm);
    },

    pause_job_card: async function(frm) {
        await frm.events.update_status(frm, "pause");  
    },

    resume_job_card: async function(frm) {
        await frm.events.update_status(frm, "start");
    },

    configure_job: function(frm) {
        frappe.msgprint("Cấu hình Job!");
    },

    transfer_job: async function(frm) {
        const nextTask = (frm.doc.custom_subtask || []).find(t => !t.done);
        if (!nextTask) return
        await frappe.call({method: "tahp.doc_events.job_card.job_card.set_subtask", args: {job_card: frm.doc.name, reason: nextTask.reason}})
    },

    complete_job_card: async function(frm) {
        if (frm.doc.custom_subtask) {
            let subtask_list = frm.doc.custom_subtask || [];
            let done_count = subtask_list.filter(t => t.done === 1).length;
            if (done_count + 1 !== subtask_list.length) {
                const message = `<div>Bạn chưa hoàn thành đủ đầu việc.</div><p>Bạn có chắc chắn muốn tiếp tục Submit không?</p>`;
                
                await new Promise((resolve, reject) => {
                    frappe.confirm(message, resolve, () => {
                        reject();
                        return;
                    });
                });
            }
        }
        const message = `Xác nhận hoàn thành LSX Công đoạn?`;
        await new Promise((resolve, reject) => {
            frappe.confirm(message, resolve, () => {
                reject();
                return;
            });
        });
        await frappe.call({method: "tahp.doc_events.job_card.job_card.submit", args: {job_card: frm.doc.name}})
    },

    update_team: async function(frm) {
        return new Promise(async (resolve, reject) => {
            const response =  await frappe.call({method: "tahp.doc_events.job_card.job_card.get_team", args: {job_card: frm.doc.name}})
            const team = response.message

            const d = new frappe.ui.Dialog({
                title: 'Danh sách nhân viên',
                fields: [{
                    fieldname: "items",
                    fieldtype: "Table",
                    data: team,
                    in_place_edit: true,
                    fields: [
                        {
                            fieldname: "employee",
                            label: __("Mã nhân viên"),
                            fieldtype: "Link",
                            in_list_view: 1,
                            options: "Employee",
                            onchange: async function(e) {
                                let emp = await frappe.db.get_value("Employee", this.value, fields=['employee_name']);
                                this.doc.employee_name = emp.message.employee_name
                                d.fields_dict.items.grid.refresh();
                            },
                            get_query: function() {
                                let selected = (d.get_values().items || [])
                                    .map(r => r.employee)
                                    .filter(Boolean);
                                return {
                                        filters: [
                                            ["Employee", "employee", "not in", selected]
                                        ]
                                    };
                            }
                        },
                        {
                            fieldname: "employee_name",
                            label: __("Nhân viên"),
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
                        frappe.msgprint(__('Trong danh sách phải ít nhất có 1 thành viên'));
                        return;
                    }

                    let has_valid_row = values.items.some(row => row.employee && row.employee.trim() !== "");

                    if (!has_valid_row) {
                        frappe.msgprint(__('Trong danh sách phải có ít nhất 1 thành viên hợp lệ'));
                        return;
                    }

                    if (values && values.items) {
                        await frappe.call({method: "tahp.doc_events.job_card.job_card.set_team", args: {job_card: frm.doc.name, team: values.items}})
                    }
                    d.hide();
                    resolve();
                },
            })
            d.show();
        });
    },

    update_workstations: async function(frm) {
        const response = await frappe.call({method: "tahp.doc_events.job_card.job_card.get_workstations", args: {job_card: frm.doc.name}})
        const workstations = response.message

        const d = new frappe.ui.Dialog({
            title: 'Danh sách thiết bị',
            fields: [{
                fieldname: "items",
                fieldtype: "Table",
                data: workstations,
                cannot_add_rows: true,
                cannot_delete_rows: true,
                read_only: true,
                in_place_edit: true,
                fields: [
                    {
                        fieldname: "workstation",
                        label: __("Tên thiết bị"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1,
                    },
                    {
                        fieldname: "status",
                        label: __("Trạng thái"),
                        fieldtype: "Select",
                        in_list_view: 1,
                        read_only: 1,
                        options: ["Bật", "Chạy", "Hỏng"],
                    }

                ]                
            }],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (values && values.items) {
                    await frappe.call({method: "tahp.doc_events.job_card.job_card.set_workstations", args: {job_card: frm.doc.name, workstations: values.items}})
                }
                d.hide();
            },
            secondary_action_label: "Quay lại"
        });
        d.show();
        requestAnimationFrame(() => { 
            d.$wrapper.find('.row-check').hide();
            cleanerTable(d)
        });
    },

    update_configs: async function(frm) {
        const response = await frappe.call({method: "tahp.doc_events.job_card.job_card.get_configs", args: {job_card: frm.doc.name}})
        const configs = response.message

        const d = new frappe.ui.Dialog({
            title: 'Danh sách cấu hình',
            fields: [{
                fieldname: "items",
                fieldtype: "Table",
                data: configs,
                cannot_add_rows: true,
                cannot_delete_rows: true,
                in_place_edit: true,
                read_only: true,
                fields: [
                    {
                        fieldname: "config_name",
                        label: __("Tên cấu hình"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1,
                        columns: 3
                    },
                    {
                        fieldname: "unit",
                        label: __("Đơn vị"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        columns: 2
                    },
                    {
                        fieldname: "config_value",
                        label: __("Giá trị"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        columns: 2
                    },
                    {
                        fieldname: "workstation",
                        label: __("Thiết bị?"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1,
                        columns: 3
                    },
                ]                
            }],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                let invalid = values.items.some(item => !item.config_value);
                if (invalid) {
                    frappe.msgprint(__('Bạn phải nhập đủ toàn bộ giá trị cấu hình hiện tại'));
                    return;
                }

                if (values && values.items) {
                    await frappe.call({method: "tahp.doc_events.job_card.job_card.set_configs", args: {job_card: frm.doc.name, configs: values.items}})
                }
                d.hide();
            },
        });
        d.show();
        requestAnimationFrame(() => {
            d.$wrapper.find('.row-check').hide();
            cleanerTable(d)
        });
    },

    generate_layout: async function(frm) {
        frm.events.start_layout(frm)
        const visible_buttons = ["Bắt đầu", "Chuyển việc", "Hoàn thành"];
        await frm.events.render_buttons(frm, visible_buttons, frm.$buttons_section)
        await frm.events.render_custom_status({frm, $wrapper: frm.$status_section})
        let sampleNotifications = [
            // { owner: "Trung", name: "Đầu việc A đã hoàn thành", from_time: "2025-08-31T12:20:00" },
            // { owner: "Lan", name: "Đầu việc C bị trì hoãn", from_time: "2025-08-31T12:05:00" },
            // { owner: "Minh", name: "Đầu việc D yêu cầu review", from_time: "2025-08-31T11:50:00" },
            // { owner: "Hoa", name: "Đầu việc E đã cập nhật rất nhiều việc khủng khiếp lắm luôn chời ơi", from_time: "2025-08-31T11:30:00" },
            // { owner: "Nam", name: "Đầu việc F mới tạo", from_time: "2025-08-31T11:00:00" },
            // { owner: "Nam", name: "Đầu việc F mới tạo", from_time: "2025-08-31T11:00:00" }
        ];
        await frm.events.render_notifications({frm, $wrapper: frm.$note_section, notifications: sampleNotifications })
    },

    start_layout: function(frm) {
        let $wrapper = frm.fields_dict["custom_buttons"].$wrapper;
        $wrapper.empty();
        $wrapper.addClass("d-flex flex-column").css({'gap': '10px'});

        
        let $first_layout = $('<div class="first-layout d-flex flex-wrap w-100" style="gap:15px;"></div>');

        // Buttons
        frm.$buttons_section = $(`
            <div class="jc-casual d-flex order-2 order-md-1 flex-wrap"
                style="flex:2 1 200px; height:auto; align-items:flex-start;">
            </div>
        `);

        // Status
        frm.$status_section = $(`
        <div class="jc-casual d-flex flex-column order-1 order-md-2" style="flex:2 1 200px;">
            <div class="status-main text-center w-100">
            </div>
        </div>
        `);

        // Note
        frm.$note_section = $(`
        <div class="d-none d-md-flex flex jc-casual flex-column order-3" style="flex:2 1 200px;">
            <div class="note">Note</div>
        </div>
        `);

        $first_layout.append(frm.$buttons_section)
        $first_layout.append(frm.$status_section)
        $first_layout.append(frm.$note_section)

        let $second_layout = $('<div class="second-layout d-flex my-2" style="flex-wrap:wrap;gap:15px;"></div>');

        frm.$input_ctl = createResponsiveTable({
            frm,
            title: 'Đầu vào nguyên liệu',
            container: $second_layout,
            editAction: async () => await frm.events.edit_input(frm),
            columns: [
                { label: 'Mã mặt hàng', fieldname: 'item_code', is_primary: true }, 
                { label: 'Tên mặt hàng', fieldname: 'item_name', is_secondary: true },
                { label: 'Đã tiêu hao?', fieldname: 'qty', is_value: true },
                { label: 'Đơn vị', fieldname: 'uom', is_unit: true }, 
            ],

            data: (frm.doc.custom_input_table && frm.doc.custom_input_table.length)
                ? frm.doc.custom_input_table.filter(d => !d.is_meter).map(d => {
                    return {
                        item_code: d.item_code,
                        item_name: d.item_name,
                        qty: d.qty,
                        uom: d.uom,
                    };
                })
                : [],
        });

        frm.$input_meter_ctl = createResponsiveTable({
            frm,
            title: 'Đầu vào đo bằng đồng hồ',
            container: $second_layout,
            editAction: async () => await frm.events.edit_meter_input(frm),
            columns: [
                { label: 'Mã mặt hàng', fieldname: 'item_code', is_primary: true }, 
                { label: 'Tên mặt hàng', fieldname: 'item_name', is_secondary: true },
                { label: 'Đã tiêu hao?', fieldname: 'qty' },
                { label: 'Đơn vị', fieldname: 'uom'},
                { label: 'Đồng hồ', fieldname: 'meter', is_value: true },
            ],
            data: (frm.doc.custom_input_table && frm.doc.custom_input_table.length)
                ? frm.doc.custom_input_table.filter(d => d.is_meter).map(d => {
                    const meter_in = d.meter || 0;
                    const meter_out = d.meter_out || 0;
                    const arrow_icon = `<i class="fas fa-arrow-right"></i>`;
                    return {
                        item_code: d.item_code,
                        item_name: d.item_name,
                        qty: d.qty,
                        uom: d.uom,
                        meter: `${meter_in} ${arrow_icon} ${meter_out}`
                    };
                })
                : [],
        });

        frm.$workstation_ctl = createResponsiveTable({
            frm,
            title: 'Thiết bị',
            container: $second_layout,
            in_mobile_button: true,
            // editAction: async () => await frm.events.update_workstations(frm),
            columns: [
                { label: 'Tên thiết bị', fieldname: 'workstation', is_primary: true },
                { label: 'Trạng thái', fieldname: 'status', is_value: true},
            ],
            data: (frm.doc.custom_workstation_table || []).map(row => ({ 
                workstation: row.workstation, 
                status: row.status
            })),
            action: {
                buttons: [
                    {
                        label: "Bật",
                        class: "btn btn-sm btn-success jc-btn",
                        icon: "fas fa-play",
                        condition: (row) => row.status == "Dừng",
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
                        handler: async (row) => await frm.events.pause_workstation(frm, row)
                    },
                    {
                        label: "Báo hỏng",
                        class: "btn btn-sm btn-warning jc-btn",
                        condition: (row) => row.status !== "Hỏng" && row.status !== "Sẵn sàng",
                        handler: async (row) => {
                            frappe.prompt(
                                [
                                    {
                                        fieldname: "reason",
                                        fieldtype: "Data",
                                        label: "Lý do hỏng",
                                        reqd: 1
                                    }
                                ],
                                async (values) => {
                                    await frappe.call({
                                        method: "tahp.doc_events.job_card.job_card.update_workstations",
                                        args: {
                                            job_card: frm.doc.name,
                                            workstations: [{
                                                ...row,
                                                status: "Hỏng",
                                                reason: values.reason
                                            }]
                                        }
                                    });
                                },
                                "Nhập lý do hỏng",
                                "Xác nhận"
                            );
                        }
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
        });

        frm.$config_ctl = createResponsiveTable({
            frm,
            title: 'Cấu hình',
            container: $second_layout,
            editAction: async () => await frm.events.update_configs(frm),
            columns: [
                { label: 'Tên cấu hình', fieldname: 'config_name', is_primary: true },
                { label: 'Giá trị', fieldname: 'config_value', is_value: true },
                { label: 'Đơn vị', fieldname: 'unit', is_unit: true},
                { label: 'Thiết bị', fieldname: 'workstation', is_secondary: true },
            ],
            data: (frm.doc.custom_config_table || []).map(row => ({ 
                config_name: row.config_name, 
                unit: row.unit, 
                config_value: row.config_value, 
                workstation: row.workstation ? row.workstation : "Áp dụng tất cả" })),
        });

        frm.$team_ctl = createResponsiveTable({
            frm,
            title: 'Đội ngũ',
            container: $second_layout,
            editAction: async () => await frm.events.update_team(frm),
            columns: [
                { label: 'Mã nhân viên', fieldname: 'employee', is_primary: true },
                { label: 'Tên nhân viên', fieldname: 'employee_name', is_secondary: true },
            ],
            data: (frm.doc.custom_team_table || []).map(row => ({ employee: row.employee, employee_name: row.employee_name })),
            action: {
                buttons: [
                    {
                        label: "Đổi người",
                        class: "btn btn-sm btn-secondary jc-btn",
                        handler: async (row) => frm.events.change_employee(frm, row)
                    },
                    {
                        label: "Nghỉ",
                        class: "btn btn-sm btn-warning mr-1 jc-btn",
                        handler: async (row) => frm.events.pause_employee(frm, row)
                    },
                ]
            }
        });

        frm.$downtime_ctl = createResponsiveTable({
            frm,
            title: 'Lịch sử dừng máy',
            container: $second_layout,
            columns: [
                { label: 'Thời gian', fieldname: 'time', is_primary: true }, 
                { label: 'Khoảng dừng', fieldname: 'duration', is_secondary: true },
                { label: 'Thiết bị', fieldname: 'workstation', is_secondary: true }, 
                { label: 'Lý do', fieldname: 'reason', is_value: true }, 
            ],

            // Data
            data: (frm.doc.custom_downtime && frm.doc.custom_downtime.length)
                ? frm.doc.custom_downtime.map(d => {
                    const from_time = frappe.datetime.str_to_user(d.from_time, 'HH:mm:ss');
                    const to_time = frappe.datetime.str_to_user(d.to_time, 'HH:mm:ss');
                    const time_str = `${from_time} → ${to_time}`;

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
                    };
                })
                : [],
            // action: {
                // buttons: [
                    // {
                    //     label: "Pause",
                    //     class: "btn btn-sm btn-warning mr-1 jc-btn",
                    //     handler: (row) => alert(`Pause workstation ${row.cpu}`)
                    // },
                    // {
                    //     label: "Change",
                    //     class: "btn btn-sm btn-secondary jc-btn",
                    //     handler: (row) => alert(`Change workstation ${row.ram}`)
                    // }
                // ]
            // }
        });

        $wrapper.append($first_layout)
        $wrapper.append($second_layout)
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

    render_buttons: async function(frm, visible_buttons = [], $wrapper) {
        const ICON_SIZE = 40;
        const BTN_MAX_SIZE = 100; 
        const TOTAL_POSITIONS = 3;

        const buttons = [
            { icon: "fas fa-play", label: "Bắt đầu", position: 0, action: () => frm.events.start_job_card(frm) },
            { icon: "fas fa-pause", label: "Tạm dừng", position: 0, action: () => frm.events.pause_job_card(frm) },
            { icon: "fas fa-play", label: "Tiếp tục", position: 0, action: () => frm.events.resume_job_card(frm) },
            { icon: "fas fa-sliders", label: "Cấu hình", position: 1, action: () => frm.events.configure_job(frm) },
            { icon: "fas fa-forward", label: "Chuyển việc", position: 1, action: () => frm.events.transfer_job(frm) },
            { icon: "fas fa-user-gear", label: "Đổi người", position: 3, action: () => frm.events.update_team(frm) },
            { icon: "fas fa-circle-check", label: "Hoàn thành", position: 2, action: () => frm.events.complete_job_card(frm) }
        ];
        
        if (frm.is_new() || frm.doc.docstatus != 0) return;

        $wrapper.empty();
        $wrapper.addClass("d-flex flex-wrap justify-content-between align-items-start");

        const myClass = "col-4 col-sm-4 text-center d-flex flex-column justify-content-center align-items-center";
        const myButtonClass = "btn btn-xs btn-default btn-primary job-ctl-btn d-flex align-items-center justify-content-center";

        // Điều kiện disable
        const disable_complete = !frm.doc.custom_start_time;
        const disable_transfer = disable_complete || (frm.doc.custom_subtask || []).length === 1;

        for (let pos = 0; pos < TOTAL_POSITIONS; pos++) {
            let btns_at_pos = buttons.filter(b => b.position === pos);
            let btn_to_show = btns_at_pos.find(b => visible_buttons.includes(b.label));

            let $col;
            if (btn_to_show) {
                $col = $(`
                    <div class="${myClass} job-buttons">
                        <button class="${myButtonClass}" style="width:100%; aspect-ratio:1/1;">
                            <i class="${btn_to_show.icon}"></i>
                        </button>
                        <span class="mt-1 job-ctl-title">${btn_to_show.label}</span>
                    </div>
                `);

                let $btn = $col.find("button");

                $btn.click(btn_to_show.action);

                if ((btn_to_show.label === "Chuyển việc" && disable_transfer) ||
                    (btn_to_show.label === "Hoàn thành" && disable_complete)) {
                    $btn.prop("disabled", true)
                        .addClass("disabled")
                        .css({
                            "opacity": "0.5",
                            "pointer-events": "none"
                        });
                }

            } else {
                $col = $(`
                    <div class="${myClass}"></div>
                `);
            }

            $wrapper.append($col);
        }
    },

    render_custom_status: async function({frm, $wrapper, timer = '00:00:00'}) {
        $wrapper.empty();

        const status = frm.doc.status || '';
        let statusColor;
        if (status === 'Work In Progress') statusColor = 'success';
        else if (status === 'Open') statusColor = 'info';
        else if (status === 'On Hold') statusColor = 'warning';
        else if (status === 'Completed') statusColor = 'success';
        else statusColor = 'secondary';

        let tasks = (frm.doc.custom_subtask || []).map(d => ({
            reason: d.reason,
            workstation: d.workstation,
            done: d.done
        }));

        // Task hiện tại
        let currentTaskObj = tasks.find(t => !t.done);
        let taskCount = tasks.length > 0 ? { 
            current: currentTaskObj ? tasks.indexOf(currentTaskObj) + 1 : 0, 
            total: tasks.length 
        } : null;

        // Dòng 1: status + nút/đồng hồ
        let $statusLine = $(`
            <div class="d-flex justify-content-between align-items-center border-bottom pb-1 mb-2 flex-wrap">
                <span class="badge badge-${statusColor} status-badge">${__(status)}</span>
                <div class="jc-timer timer-mobile d-inline d-md-none">${timer}</div>
                <button class="btn btn-sm job-tasks d-none d-md-inline">Xem mọi đầu việc</button>
            </div>
        `);

        // Dòng 2: progress + tên task + nút icon trên mobile
        let $taskLine = $(`
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center job-task-name">
                    <div class="task-circle mr-2 ${status !== 'On Hold' ? 'pulse-circle' : ''}"></div>
                    <span class="task-count mr-2">${taskCount ? `${taskCount.current} / ${taskCount.total}` : ''}:</span>
                    <span class="current-task">${currentTaskObj ? currentTaskObj.reason : ''}</span>
                </div>
                <button class="btn btn-sm d-md-none job-tasks"><i class="fas fa-bars"></i></button>
            </div>
        `);

        // Dòng 3: Đồng hồ desktop
        let $timerLine = $(`
            <div class="jc-timer text-center d-none d-md-block mt-2" style="font-size: 50px; font-weight: bold;">${timer}</div>
        `);

        $wrapper.append($statusLine);
        if (frm.doc.docstatus == 0) $wrapper.append($taskLine)
        $wrapper.append($timerLine)

        $wrapper.find('.job-tasks').off('click').on('click', () => {
            let tasks = (frm.doc.custom_subtask || []).map(d => ({
                reason: d.reason,
                done: d.done
            }));

            let currentTaskIdx = tasks.findIndex(t => !t.done);

            const $dialogWrapper = $('<div class="job-tasks-dialog"></div>');

            tasks.forEach((task, idx) => {
                const isCurrent = idx === currentTaskIdx;
                const $taskDiv = $(`
                    <div class="task-row mb-2" style="padding:5px; border-radius:4px; ${isCurrent ? 'background-color:#d4edda;' : ''}">
                        <div style="font-weight:${isCurrent ? 'bold' : 'normal'}">${task.reason}</div>
                        ${isCurrent && frm.doc.docstatus == 0? '<div style="font-size:0.8rem; color:#155724;">Đang thực hiện</div>' : ''}
                    </div>
                `);
                $dialogWrapper.append($taskDiv);
            });

            frappe.prompt([
                {
                    fieldname: 'tasks_html',
                    fieldtype: 'HTML',
                    label: 'Các đầu việc',
                    options: $dialogWrapper.prop('outerHTML')
                }
            ], () => {}, 'Các đầu việc');
        });

    },

    render_notifications: async function({ $wrapper, notifications = [] }) {
        $wrapper.empty();

        // Sắp xếp mới nhất lên đầu
        notifications.sort((a, b) => new Date(b.from_time) - new Date(a.from_time));

        // Header
        let $header = $(`
            <div class="d-flex justify-content-between align-items-center border-bottom mb-2">
                <span class="fw-bold job-note-title" style="font-size: 20px;">Thông báo</span>
                <span class="job-note-tip">Lướt xuống để xem thông báo cũ</span>
            </div>
        `);

        // Container scrollable: hiển thị tối đa 4 items
        let $list = $('<div class="notification-list" style="max-height: 120px; overflow-y:auto;"></div>');
        if (notifications || notifications.length == 0) $list.append('Không có thông báo')
        notifications.forEach(n => {
            let $item = $(`
                <div class="notification-item d-flex justify-content-start align-items-start p-2 border-bottom">
                    <div class="notification-time text-muted mr-2" style="font-size:0.8rem; width:70px; flex-shrink:0;">
                        ${new Date(n.from_time).toLocaleTimeString()}
                    </div>
                    <div class="notification-text" style="flex:1; word-break:break-word;">
                        <span class="fw-bold">${n.owner}</span>: ${n.name}
                    </div>
                </div>
            `);
            $list.append($item);
        });

        $wrapper.append($header, $list);

        // Hover highlight
        $list.find('.notification-item').hover(
            function() { $(this).css('background-color','#f0f0f0'); },
            function() { $(this).css('background-color','transparent'); }
        );
    },

    update_status: async function(frm, action = null) {
        const now = frappe.datetime.now_datetime();

        function stop_timer_interval() {
            if (frm.__timer_interval) {
                clearInterval(frm.__timer_interval);
                frm.__timer_interval = null;
            }
        }

        function update_timer_display() {
            if (!frm.doc.custom_start_time) return;

            const currentTime = frappe.datetime.now_datetime();
            let diffMs;

            if (frm.doc.custom_active) {
                diffMs = (frm.doc.custom_check_time || 0) + (new Date(currentTime) - new Date(frm.doc.custom_start_time));
            } else {
                diffMs = frm.doc.custom_check_time || 0;
            }

            let diffSec = Math.floor(diffMs / 1000);
            let hours = Math.floor(diffSec / 3600);
            diffSec %= 3600;
            let minutes = Math.floor(diffSec / 60);
            let seconds = diffSec % 60;

            let hStr = String(hours).padStart(2,"0");
            let mStr = String(minutes).padStart(2,"0");
            let sStr = String(seconds).padStart(2,"0");

            $(".jc-timer").text(`${hStr}:${mStr}:${sStr}`);
        }

        function start_timer_interval() {
            stop_timer_interval();
            frm.__timer_interval = setInterval(update_timer_display, 1000);
        }

        update_timer_display()
        stop_timer_interval()
        if (frm.doc.custom_active) start_timer_interval()

        if (action === "start") {
            await frappe.call({
                method: "tahp.doc_events.job_card.job_card.update_time",
                args: { docname: frm.doc.name, timestamp: now, active: true }
            });
            start_timer_interval();
            return;
        }

        if (action === "pause") {
            await frappe.call({
                method: "tahp.doc_events.job_card.job_card.update_time",
                args: { docname: frm.doc.name, timestamp: now, active: false }
            });
            stop_timer_interval();
            return;
        }
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
                    label: __("Chọn nhóm"),
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
            secondary_action_label: "Quay lại"
        });

        const group_field = d.get_field("group_name");
        const reason_field = d.get_field("reason");
        const other_reason_field = d.get_field("other_reason");
        const toggle_field = d.get_field("other_reason_toggle");

        function updateReasonField(group_name, reason_field, items, ws, set_default = false) {
            if (!group_name) {
                reason_field.wrapper.style.display = 'none';
                reason_field.refresh();
                reason_field.set_value("");
                return;
            }

            let filtered = items.filter(i => i.group_name === group_name && i.operation === ws);
            if (filtered.length === 0) filtered = items.filter(i => i.group_name === group_name);

            if (filtered.length > 0) {
                reason_field.wrapper.style.display = '';
                reason_field.df.options = filtered.map(i => i.reason).join("\n");
                reason_field.refresh();

                const current_value = reason_field.get_value();
                const valid = filtered.some(i => i.reason === current_value);

                if (!valid) {
                    reason_field.set_value(set_default ? filtered[0].reason : "");
                } else if (set_default && !current_value) {
                    reason_field.set_value(filtered[0].reason);
                }
            } else {
                reason_field.wrapper.style.display = 'none';
                reason_field.refresh();
                reason_field.set_value("");
            }
        }

        function getDefaultGroup(groups, items, ws) {
            let g = groups.find(g =>
                items.some(i => i.group_name === g.group_name && i.operation === ws)
            );
            if (!g) {
                const first_item = items.find(i => i.group_name);
                if (first_item) g = groups.find(gr => gr.group_name === first_item.group_name);
            }
            return g ? g.group_name : "";
        }

        const ws = frm.doc.workstation;

        if (!groups || groups.length === 0 || !items || items.length === 0 ) {
            reason_field.wrapper.style.display = 'none';
            group_field.wrapper.style.display = 'none';
            toggle_field.set_value(1)
            toggle_field.refresh()
        } else {
            const default_group = getDefaultGroup(groups, items, ws);

            if (default_group) {
                group_field.set_value(default_group);
                updateReasonField(default_group, reason_field, items, ws, true);
            } else {
                reason_field.wrapper.style.display = 'none';
                reason_field.refresh();
            }

            group_field.df.change = function () {
                const group_name = d.get_value("group_name");
                updateReasonField(group_name, reason_field, items, ws, true);
            };
        }

        toggle_field.df.change = function () {
            const use_other = d.get_value("other_reason_toggle");
            if (use_other) {
                reason_field.wrapper.style.display = 'none';
                reason_field.refresh();
                other_reason_field.wrapper.style.display = '';
                other_reason_field.refresh();
            } else {
                if (!items || items.length === 0) return;
                other_reason_field.wrapper.style.display = 'none';
                other_reason_field.refresh();
                reason_field.wrapper.style.display = '';
                reason_field.refresh();
            }
        };

        other_reason_field.df.change = function () {
            const other = d.get_value("other_reason");
            const reason =  d.get_value("reason");
            if (reason && other) {
                reason_field.set_value("");
                reason_field.refresh();
            }
        }

        toggle_field.df.change();

        d.show();
    },

    edit_input: async function(frm) {
        const fields = [
            { fieldname: 'item_code', label: 'Mã mặt hàng', fieldtype: 'Data', read_only: 1, in_list_view: 1 },
            { fieldname: 'item_name', label: 'Tên mặt hàng', fieldtype: 'Data', read_only: 1, in_list_view: 1 },
            { fieldname: 'uom', label: 'Đơn vị', fieldtype: 'Data', read_only: 1, in_list_view: 1 },
            { fieldname: 'qty', label: 'Đã tiêu hao?', fieldtype: 'Float', read_only: 0, in_list_view: 1 }
        ];

        const data = frm.doc.custom_input_table
            .filter(d => !d.is_meter)
            .map(d => ({
                item_code: d.item_code,
                item_name: d.item_name,
                uom: d.uom,
                qty: d.qty
            }));

        const dialog = new frappe.ui.Dialog({
            title: 'Chỉnh sửa đầu vào nguyên liệu',
            fields: [
                {
                    fieldname: 'items',
                    fieldtype: 'Table',
                    fields: fields,
                    data: data,
                    cannot_add_rows: true,
                    cannot_delete_rows: true,
                    in_place_edit: true,
                }
            ],
            primary_action_label: 'Xác nhận',
            primary_action: async function (values) {
                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.set_inputs",
                    args: { job_card: frm.doc.name, inputs: values.items }
                });
                dialog.hide();
            }
        });

        dialog.show();
        requestAnimationFrame(() => {
            dialog.$wrapper.find('.row-check').hide();
            cleanerTable(dialog);
        });
    },

    edit_meter_input: async function(frm) {
        const fields = [
            { fieldname: 'item_code', label: 'Mã mặt hàng', fieldtype: 'Data', read_only: 1, in_list_view: 1, columns: 2 },
            { fieldname: 'item_name', label: 'Tên mặt hàng', fieldtype: 'Data', read_only: 1, in_list_view: 1, columns: 2 },
            { fieldname: 'meter', label: 'Đo lúc đầu', fieldtype: 'Float', read_only: 0, in_list_view: 1, columns: 3 },
            { fieldname: 'meter_out', label: 'Đo lúc sau', fieldtype: 'Float', read_only: 0, in_list_view: 1, columns: 3 },
            { fieldname: 'is_meter', fieldtype: 'Checkbox', hidden: 1, default: 1 }
        ];

        const data = frm.doc.custom_input_table
            .filter(d => d.is_meter)
            .map(d => ({
                item_code: d.item_code,
                item_name: d.item_name,
                meter: d.meter || 0,
                meter_out: d.meter_out || 0
            }));

        const dialog = new frappe.ui.Dialog({
            title: 'Chỉnh sửa đầu vào đo đồng hồ',
            fields: [
                {
                    fieldname: 'items',
                    fieldtype: 'Table',
                    cannot_add_rows: true,
                    cannot_delete_rows: true,
                    in_place_edit: true,
                    fields: fields,
                    data: data
                }
            ],
            primary_action_label: 'Xác nhận',
            primary_action: async function (values) {

                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.set_inputs",
                    args: { job_card: frm.doc.name, inputs: values.items }
                });
                dialog.hide();
            }
        });

        dialog.show();

        requestAnimationFrame(() => {
            dialog.$wrapper.find('.row-check').hide();
            cleanerTable(dialog);
        });
    },
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

function createResponsiveTable({ frm, title, columns = [], data = [], editAction, container, action = null, in_mobile_button = false }) {
    let collapseId = "collapse_" + Math.random().toString(36).substring(2,9);

    // --- Wrapper chính ---
    let $col = $('<div class="d-flex flex-column responsive-col"></div>');
    let $wrapper = $('<div class="responsive-table flex-fill h-100 w-100"></div>');
    $col.append($wrapper);
    $(container).append($col);

    // --- Desktop layout ---
    let $desktopWrapper = $(`
        <div class="d-none d-md-flex flex-column flex-fill h-100 p-2" style="border-radius: 15px;border: 1px solid rgb(197, 197, 197);">
            <div class="d-flex align-items-center mb-2" style="gap:10px;">
                <button class="btn btn-sm btn-primary edit-btn jc-btn" style="font-size:1.25rem;">Sửa</button>
                <div class="title fw-bold" style="font-size:1.25rem;">${title}</div>
            </div>
            <div class="table-responsive flex-fill">
                <table class="table table-bordered table-sm m-0">
                    <thead><tr></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `);

    const $titleDiv = $desktopWrapper.find('.title');
    if (!editAction || frm.doc.docstatus != 0) {
        $desktopWrapper.find('.edit-btn').remove();
        $titleDiv.css('line-height', '2.4rem');
    }

    // --- Mobile layout ---
    let $mobileHeader = $(`
        <div class="d-flex d-md-none justify-content-between align-items-center mb-3 cursor-pointer" 
             style="user-select:none;font-size:1.25rem;">
            <div class="title fw-bold" style="font-weight: bold;">${title}</div>
            <i class="fas fa-chevron-down"></i>
        </div>
    `);
    let $mobileCollapse = $(`<div class="collapse d-md-none show" id="${collapseId}"></div>`)
        .append(`<button class="btn btn-primary w-100 mb-2">Sửa</button>`);

    if (!editAction  || frm.doc.docstatus != 0) {
        $mobileCollapse.find('button').remove();
    }

    // Append layout vào wrapper
    $wrapper.append($desktopWrapper, $mobileHeader, $mobileCollapse);

    // --- Hàm render row ---
    function renderTableRows(frm, rows) {
        // Desktop render
        let $thead = $desktopWrapper.find("thead tr").empty().css({'background':'#eee'});
        columns.forEach(c => $thead.append(`<th>${c.label}</th>`));
        if (action?.buttons) $thead.append(`<th class="text-nowrap" style="width:1%;">Thao tác</th>`);

        let $tbody = $desktopWrapper.find("tbody").empty();
        rows.forEach(r => {
            let $tr = $("<tr></tr>");
            columns.forEach(c => $tr.append(`<td class="align-middle">${r[c.fieldname] || ""}</td>`));
            if (action) $tr.append($("<td></td>").append(renderActionButtons(frm, action.buttons, r)));
            $tbody.append($tr);
        });

        // Mobile render
        $mobileCollapse.find(".header-row,.data-row").remove(); 
        let primary = columns.find(c => c.is_primary);
        let middle = columns.find(c => !c.is_primary && !c.is_secondary && !c.is_value && !c.is_unit);
        let value = columns.find(c => c.is_value);

        let $headerRow = $('<div class="header-row d-flex w-100 mb-1 border-bottom py-1 font-weight-bold"></div>');

        if (middle) {
            // 3 cột bằng nhau
            $headerRow.append(`<div style="flex:1;text-align:left">${primary?.label || ""}</div>`);
            $headerRow.append(`<div style="flex:1;text-align:center">${middle.label}</div>`);
            $headerRow.append(`<div style="flex:1;text-align:right">${value?.label || ""}</div>`);
        } else {
            $headerRow.append(`<div style="flex:2;text-align:left">${primary?.label || ""}</div>`);
            $headerRow.append(`<div style="flex:1;text-align:right">${value?.label || ""}</div>`);
        }

        $mobileCollapse.append($headerRow);

        rows.forEach(r => {
            let $row = $('<div class="data-row d-flex w-100 mb-2 border-bottom py-1" style="font-size:1rem"></div>');

            let $left = $('<div></div>');
            let $right = $('<div></div>');
            let $middle = null;

            if (middle) {
                $left.css('flex', '1 1 0%').css('text-align','left');
                $middle = $('<div style="flex:1;text-align:center"></div>').append(r[middle.fieldname] || "");
                $right.css('flex', '1 1 0%').css('text-align','right');
            } else {
                $left.css('flex', '2 1 0%').css('text-align','left');
                $right.css('flex', '1 1 0%').css('text-align','right');
            }

            // Điền dữ liệu vào left/right
            columns.forEach(c => {
                if(c.is_primary && r[c.fieldname]) $left.append(`<div class="fw-bold">${r[c.fieldname]}</div>`);
                if(c.is_secondary && r[c.fieldname]) $left.append(`<div style="font-size:0.75rem">${r[c.fieldname]}</div>`);
                if(c.is_value && r[c.fieldname]) $right.append(`<span>${r[c.fieldname]}</span>`);
                if(c.is_unit && r[c.fieldname]) $right.append(`<span class="ml-1">${r[c.fieldname]}</span>`);
            });

            // Chỉ append các cột tồn tại
            if ($middle) $row.append($left, $middle, $right);
            else $row.append($left, $right);

            $mobileCollapse.append($row);

            if (in_mobile_button && action?.buttons && frm.doc.docstatus == 0) {
                const $btnRow = $('<div class="action-row d-flex flex-wrap mb-2" style="gap:7px;"></div>');
                action.buttons.forEach(b => {
                    if (b.condition(r)) {
                        const $btn = $(`<button class="${b.class}"><i class="${b.icon}"></i> ${b.label}</button>`);
                        $btn.on("click", () => b.handler(r));
                        $btnRow.append($btn);
                    }
                });
                $mobileCollapse.append($btnRow);
            }
        });

    }

    // --- Event binding ---
    $mobileHeader.on("click", function() {
        $mobileCollapse.collapse("toggle");
        $(this).find("i").toggleClass("fa-chevron-down fa-chevron-up");
    });
    $desktopWrapper.find(".edit-btn").on("click", editAction);
    $mobileCollapse.find("button").first().on("click", editAction);

    // --- Initial render ---
    renderTableRows(frm, data);

    // --- Return object để reload sau này ---
    return {
        reload: (newData) => renderTableRows(frm, newData || []),
        wrapper: $wrapper
    };
}

function renderActionButtons(frm, buttons, row) {
    if (frm.doc.docstatus != 0) return;
    let $c = $("<div class='d-flex' style='gap:10px;'></div>");
    buttons.forEach(cfg => {
        // Kiểm tra điều kiện hiển thị
        let visible = true;
        if (typeof cfg.condition === "function") {
            visible = cfg.condition(row);
        } else if (typeof cfg.condition === "boolean") {
            visible = cfg.condition;
        }
        if (!visible) return; // bỏ qua nếu không thỏa

        let $btn = $("<button>").appendTo($c).css({"white-space": "nowrap"});

        const cls = typeof cfg.class === "function" ? cfg.class(row) : (cfg.class || "btn btn-sm btn-primary");
        $btn.addClass(cls);

        const label = typeof cfg.label === "function" ? cfg.label(row) : cfg.label;
        if (typeof label === "string" && /^fa[srldb]? fa-/.test(label)) {
            $btn.html(`<i class="${label}"></i>`);
        } else {
            $btn.text(label);
        }

        $btn.on("click", () => cfg.handler(row));
    });

    return $c;
}
