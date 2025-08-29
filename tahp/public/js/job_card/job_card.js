frappe.ui.form.on("Job Card", {
    refresh: async function(frm) {
        // Ví dụ chỉ cho hiện các nút
        frm.set_intro("")
        const visible_buttons = ["Bắt đầu", "Cấu hình", "Chuyển việc", "Đổi người", "Hoàn thành"];
        await frm.events.render_button(frm, visible_buttons);
    },

    // === Các hàm action ===
    start_job: async function(frm) {
        await frm.events.update_team(frm);
        // await frm.events.update_workstations(frm);
        // await frm.events.update_configs(frm);
        // await frm.events.update_inputs(frm);
    },

    pause_job: function(frm) {
        frappe.msgprint("Tạm dừng Job!");
    },

    resume_job: function(frm) {
        frappe.msgprint("Tiếp tục Job!");
    },

    configure_job: function(frm) {
        frappe.msgprint("Cấu hình Job!");
    },

    transfer_job: function(frm) {
        frappe.msgprint("Chuyển việc Job!");
    },

    update_team: function(frm) {
        frappe.msgprint("Đổi người Job!");
    },

    complete_job: function(frm) {
        frappe.msgprint("Hoàn thành Job!");
    },

    update_team: async function(frm) {
        const response =  await frappe.call({method: "tahp.doc_events.job_card.job_card.get_team", args: {job_card: frm.doc.name}})
        const team = response.message

        const d = new frappe.ui.Dialog({
            title: 'Danh sách thiết bị',
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
                        get_label: function(value) {
                            return value; // chỉ trả về mã, không hiển thị tên
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
                if (values && values.items) {
                    await frappe.call({method: "tahp.doc_events.job_card.job_card.set_team", args: {job_card: frm.doc.name, team: values.items}})
                }
                d.hide();
            },
        })
        d.show();
    },

    update_workstations: async function(frm) {
        const response = await frappe.call({method: "tahp.doc_events.job_card.job_card.get_workstations", args: {job_card: frm.doc.name}})
        const workstations = response.message

        const d = new frappe.ui.Dialog({
            title: 'Danh sách thiết bị',
            size: 'small',
            fields: [{
                fieldname: "items",
                fieldtype: "Table",
                data: workstations,
                cannot_add_rows: true,
                cannot_delete_rows: true,
                read_only: true,
                in_place_edit: true,
                editable_grid: false,
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
                        options: ["Sẵn sàng", "Đang bảo trì", "Đang hỏng"],
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
        requestAnimationFrame(() => { d.$wrapper.find('.row-check').hide();});
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
                fields: [
                    {
                        fieldname: "config_name",
                        label: __("Tên cấu hình"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1,
                    },
                    {
                        fieldname: "config_value",
                        label: __("Giá trị"),
                        fieldtype: "Data",
                        in_list_view: 1,
                    },
                    {
                        fieldname: "workstation",
                        label: __("Thiết bị?"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1,
                    },
                ]                
            }],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (values && values.items) {
                    await frappe.call({method: "tahp.doc_events.job_card.job_card.set_configs", args: {job_card: frm.doc.name, configs: values.items}})
                }
                d.hide();
            },
            secondary_action_label: "Quay lại"
        });
        d.show();
        requestAnimationFrame(() => { d.$wrapper.find('.row-check').hide();});
    },

    // === render_button nằm trong events để tái sử dụng ===
    render_button: async function(frm, visible_buttons = []) {
        const ICON_SIZE = 40;
        const BTN_MAX_SIZE = 100; 
        const TOTAL_POSITIONS = 5;

        const buttons = [
            { icon: "fas fa-play", label: "Bắt đầu", position: 0, action: () => frm.events.start_job(frm) },
            { icon: "fas fa-pause", label: "Tạm dừng", position: 0, action: () => frm.events.pause_job(frm) },
            { icon: "fas fa-play", label: "Tiếp tục", position: 0, action: () => frm.events.resume_job(frm) },
            { icon: "fas fa-sliders", label: "Cấu hình", position: 1, action: () => frm.events.configure_job(frm) },
            { icon: "fas fa-forward", label: "Chuyển việc", position: 2, action: () => frm.events.transfer_job(frm) },
            { icon: "fas fa-user-gear", label: "Đổi người", position: 3, action: () => frm.events.update_team(frm) },
            { icon: "fas fa-circle-check", label: "Hoàn thành", position: 4, action: () => frm.events.complete_job(frm) }
        ];
        
        if (frm.is_new() && frm.doc.docstatus != 0) return;

        let $wrapper = frm.fields_dict["custom_buttons"].$wrapper;
        $wrapper.empty();
        $wrapper.addClass("d-flex flex-wrap justify-content-between align-items-start");

        const myClass = "col-4 col-sm-2 text-center d-flex flex-column justify-content-center align-items-center mb-2";
        const myButtonClass = "btn btn-xs btn-default btn-primary d-flex align-items-center justify-content-center";

        for (let pos = 0; pos < TOTAL_POSITIONS; pos++) {
            let btns_at_pos = buttons.filter(b => b.position === pos);
            let btn_to_show = btns_at_pos.find(b => visible_buttons.includes(b.label));

            let $col;
            if (btn_to_show) {
                let iconSize = (btn_to_show.label === "Hoàn thành") ? ICON_SIZE * 1.2 : ICON_SIZE;

                $col = $(`
                    <div class="${myClass}">
                        <button class="${myButtonClass}" 
                            style="width:100%; max-width:${BTN_MAX_SIZE}px; aspect-ratio:1/1;">
                            <i class="${btn_to_show.icon}" style="font-size: ${iconSize}px;"></i>
                        </button>
                        <span class="mt-1">${btn_to_show.label}</span>
                    </div>
                `);

                // Gắn click handler
                $col.find("button").click(btn_to_show.action);

            } else {
                $col = $(`
                    <div class="${myClass}"></div>
                `);
            }

            $wrapper.append($col);
        }
    }
});
