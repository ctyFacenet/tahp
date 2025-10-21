frappe.ui.form.on("Custom Planner", {
    refresh: async function(frm) {
        frm.events.clean_display(frm);
        await frm.events.define_layout(frm);
    },

    // --- Giao diện chung ---
    clean_display: function(frm) {
        frm.set_intro("");
        frm.toolbar.page.add_inner_message('');
        frm.page.clear_primary_action();
        frm.timeline.wrapper.hide();
        frm.comment_box.comment_wrapper.hide();

        const bg = '#f4f7fc';
        const $w = $(frm.$wrapper);

        $w.find('.tab-content, .page-container, .form-tabs-list, .form-tabs-list .nav-item, .form-tabs-list .nav-link').css({'background': bg});
        $w.find('.layout-main').css({'margin-inline': '-30px'});
        $w.find('.form-page').css({'border': 'none'});
        $w.find('.layout-main-section-wrapper, .form-column').attr('style', 'padding-left:5px !important; padding-right:5px !important;');
    },

    // --- Layout chính ---
    define_layout: async function(frm) {
        const $wrapper = frm.fields_dict.wrapper.$wrapper.empty().addClass("jc-layout d-flex flex-wrap w-100");
        const $row = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`);
        const $col1 = $(`<div class="w-100"></div>`), $col2 = $(`<div class="w-100"></div>`);
        $row.append($col1, $col2); $wrapper.append($row);

        await frm.events.display_button(frm, $col1);
        await frm.events.display_list(frm, $col2);
        frm.events.track_changes(frm);
    },

    // --- Nút thao tác ---
    display_button: async function(frm, $wrapper) {
        $wrapper.empty();
        if (frm.is_new() || frm.doc.docstatus !== 0) return;

        const $action_row = $(`<div class="d-flex justify-content-between align-items-start w-100" style="gap:10px"></div>`);
        const $add_post = $(`<div class="btn btn-primary btn-add-post" style="height:40px; line-height:30px; min-width:150px;">+ Thêm phương án</div>`);
        $action_row.append($add_post);

        // --- Nút bên phải ---
        const $right_buttons = $(`<div class="d-flex flex-row flex-wrap" style="gap:10px"></div>`);
        const $save_btn = $(`<button class="btn btn-primary planner-save-btn" style="height:40px; min-width:100px; display:none;"><i class="fa fa-save"></i> Lưu</button>`);
        $save_btn.on("click", async () => { 
            await frm.events.save_planner_data(frm); 
            frm.events.hide_save_button(frm); 
        });
        $right_buttons.append($save_btn);

        // --- Nút workflow ---
        if (frm.doc.workflow_state) {
            const wf = frappe.workflow.workflows[frm.doctype];
            if (wf) {
                const transitions = wf.transitions.filter(t => t.state === frm.doc.workflow_state);
                const actions = [...new Set(transitions.map(t => t.action))];
                actions.forEach((action, i) => {
                    const btn_class = i === 0 ? "btn-primary" : "btn-secondary";
                    const $btn = $(`<button class="btn ${btn_class} workflow-btn" style="height:40px; min-width:100px;">${action}</button>`);
                    $btn.on("click", async () => frm.events.apply_workflow(frm, action));
                    $right_buttons.append($btn);
                });
            }
        }

        $action_row.append($right_buttons);
        $wrapper.append($action_row);
    },

    show_save_button: function(frm) {
        $('.planner-save-btn').show();
        $('.workflow-btn').hide(); 
    },

    hide_save_button: function(frm) {
        $('.planner-save-btn').hide();
        $('.workflow-btn').show();
    },

    // --- Theo dõi thay đổi ---
    track_changes: function(frm) {
        $(document).off('.planner');
        const markChanged = () => frm.events.show_save_button(frm);

        $(document).on('input.planner', '.jc-layout [contenteditable="true"]', markChanged);

        // --- Thêm phương án ---
        $(document).on('click.planner', '.btn-add-post', async function() {
            const post_name = frappe.utils.get_random(8);
            const htmls = await frappe.call({
                method: "tahp.tahp.doctype.custom_planner.custom_planner.render_template",
                args: { planner: cur_frm.doc.name, post_name }
            });

            if (htmls.message?.length) {
                const $new_post = $(htmls.message[0]);
                const $trow = $(`<div class="w-100"></div>`).append($new_post);
                $('.jc-container').append($trow);

                // Thêm dòng mặt hàng trống
                const $tbody = $new_post.find('tbody');
                const item_name = frappe.utils.get_random(8);
                $tbody.append(`
                    <tr data-item="${item_name}">
                        ${'<td><div contenteditable="true" class="form-control"></div></td>'.repeat(8)}
                        <td class="text-center"><button class="btn btn-danger">Xóa</button></td>
                    </tr>
                `);
                markChanged();
            }
        });

        // --- Thêm/xóa mặt hàng ---
        $(document).on('click.planner', '.planner-wrapper .btn-info.btn-sm', function() {
            const $tbody = $(this).closest('.planner-wrapper').find('tbody');
            const item_name = frappe.utils.get_random(8);
            $tbody.append(`
                <tr data-item="${item_name}">
                    ${'<td><div contenteditable="true" class="form-control"></div></td>'.repeat(8)}
                    <td class="text-center"><button class="btn btn-danger">Xóa</button></td>
                </tr>
            `);
            markChanged();
        });

        $(document).on('click.planner', '.planner-wrapper tbody .btn-danger', function(e) {
            e.stopPropagation();
            $(this).closest('tr').remove();
            markChanged();
        });
    },

    // --- Lưu dữ liệu ---
    save_planner_data: async function(frm) {
        const data = [];
        $('.planner-wrapper').each(function() {
            const post_name = $(this).data('post');
            const rows = [];
            $(this).find('tbody tr').each(function() {
                const item_name = $(this).data('item');
                const fields = ['item_code','item_name_display','uom','qty','bom','start_date','end_date','note'];
                const row = { item_name };
                $(this).find('[contenteditable]').each((i, el) => row[fields[i]] = $(el).text().trim());
                rows.push(row);
            });
            data.push({ post_name, rows });
        });

        await frappe.xcall("tahp.tahp.doctype.custom_planner.custom_planner.save_planner_data", {
            planner: frm.doc.name, data
        });

        frappe.show_alert({ message: "Đã lưu thay đổi", indicator: "green" });
        frm.events.hide_save_button(frm);
    },

    // --- Hiển thị danh sách ---
    display_list: async function(frm, wrapper) {
        if (!frm.doc.posts) return;
        const htmls = await frappe.call("tahp.tahp.doctype.custom_planner.custom_planner.render_template", {
            planner: frm.doc.name
        });
        htmls.message.forEach(row => wrapper.append(row));
    },

    // --- Workflow ---
    apply_workflow: async function(frm, action) {
        frappe.confirm(`Thực hiện hành động "${action}"?`, () => {
            frappe.xcall("frappe.model.workflow.apply_workflow", { doc: frm.doc, action });
        });
    },
});
