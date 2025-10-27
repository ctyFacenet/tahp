frappe.ui.form.on("Custom Planner", {
    refresh: async function(frm) {
        frm.events.clean_display(frm)
        await frm.events.define_layout(frm)
        if (frm.is_new()) {
            if (!frm.code_name) {
                let response = await frappe.xcall("tahp.tahp.doctype.custom_planner.custom_planner.recommend_code_name")
                frm.set_value("code_name", response)
                frm.refresh_field("code_name")
            }
            await frm.events.apply_new_post(frm)
        }
        await frm.events.define_trigger(frm)
        frm.toggle_display("posts", false)
        frm.toggle_display("items", false)
    },

    clean_display: function(frm) {
        frm.set_intro("");
        frm.page.clear_primary_action();
        frm.page.clear_inner_toolbar();

        const $w = $(frm.$wrapper);

        // CSS tùy chỉnh
        $w.find('.layout-main').css({'margin-inline': '-30px'});
        $w.find('.form-page').css({'border': 'none'});
        $w.find('.layout-main-section-wrapper, .form-column').attr('style', 'padding-left:5px !important; padding-right:5px !important;');

        // Ẩn nút primary action (Save / Submit)
        $w.find('.btn-primary').not($w.find('[data-fieldname] .btn-primary')).hide();
    },

    define_layout: async function(frm) {
        if (frm._is_rendering) return;
        frm._is_rendering = true;
        
        try {
            let $wrapper = frm.fields_dict.wrapper.$wrapper;
            $wrapper.empty();
            
            let $control_row = $(`<div class="w-100 planner-control-section"></div>`);
            let $content_row = $(`<div class="w-100 planner-content-section"></div>`);

            await frm.events.define_control(frm, $control_row);
            await frm.events.define_content(frm, $content_row);

            $wrapper.append($control_row, $content_row);
        } finally {
            frm._is_rendering = false;
        }
    },

    define_control: async function(frm, $wrapper) {
        $wrapper.empty();
        if (frm.doc.docstatus !== 0) return;

        let $skeleton = $(`<div class="d-flex justify-content-between align-items-center w-100">
            <div class="left-section"></div>
            <div class="right-section"></div>
        </div>`)
        $wrapper.append($skeleton)
        let $left_section = $skeleton.find('.left-section')
        let $right_section = $skeleton.find('.right-section')

        let permissions = await frappe.xcall("tahp.tahp.doctype.custom_planner.custom_planner.check_permission", {"workflow_state": frm.doc.workflow_state ? frm.doc.workflow_state : "Nháp"})
        let can_edit_post = permissions.edit_post
        let can_edit_workflow = permissions.edit_workflow

        let $add_post_button = $(`<div class="btn planner-btn btn-default btn-primary planner-add-post">Thêm phương án</div>`)
        if (can_edit_post) $left_section.append($add_post_button)

        let $save_button = $(`<div class="btn planner-btn btn-default btn-primary planner-save-btn"> <i class="fa fa-save mr-2"></i> Lưu </div>`)
        $save_button.hide()
        $right_section.append($save_button)

        let $workflow_buttons = $(`<div class="planner-workflows"></div>`)
        if (frm.is_new()) $workflow_buttons.hide()
        if (can_edit_workflow) $right_section.append($workflow_buttons)

        if (!frm.doc.workflow_state) return
        let transitions = frappe.workflow.workflows[frm.doctype].transitions.filter(t => t.state === frm.doc.workflow_state)
        let actions = [...new Set(transitions.map(t => t.action))]
        let roles = frappe.user_roles;
        actions.forEach((action, i) => {
            if (action === "Hủy trình" && !roles.includes("Kế hoạch sản xuất")) return;
            let $btn = $(`<button class="btn planner-btn btn-default ${i === 0? "btn-primary": "btn-secondary"}">${action}</button>`)
            $btn.off("click").on("click", async () => frm.events.apply_action(frm, action));
            $workflow_buttons.append($btn)
        })
    },

    define_content: async function(frm, $wrapper) {
        $wrapper.empty();
        if (!frm.doc.posts) return
        for (let post of frm.doc.posts) {
            let items = frm.doc.items.filter(row => row.parent_name == post.name || row.parent_name == post.routing)
            let response = await frm.events.render_post(frm, post, items);
            $wrapper.append(response);
        }
    },

    define_change: async function(frm) {
        let $wrapper = frm.fields_dict.wrapper.$wrapper

        // Bấm nút Lưu
        let $save_button = $wrapper.find('.planner-save-btn')
        $save_button.off("click").on("click", async () => {
            if (!frm.doc.code_name) frappe.throw("Vui lòng điền mã lệnh sản xuất trước khi lưu")
            frm.save()
            frm.events.display_save_button(frm, false)
        })

        // Bấm nút Thêm phương án
        let $add_post_button = $wrapper.find('.planner-add-post')
        $add_post_button.off("click").on("click", async () => {
            frm.events.apply_new_post(frm)
            frm.events.display_save_button(frm, true)
        })

        // Bấm nút Action
        let $action_button = $wrapper.find('.planner-action')
        $action_button.off("click").on("click", async function () {
            const action = $(this).attr('title');
            frm.events.apply_primary_action(frm, this, action)
        })

        // Bấm nút Thêm mặt hàng
        let $add_item_button = $wrapper.find('.planner-add-item')
        $add_item_button.off("click").on("click", async function() {
            frm.events.apply_new_item(frm, this)
            frm.events.display_save_button(frm, true)
        })

        // Bấm nút Xóa phương án
        let $delete_post_button = $wrapper.find('.planner-delete-post')
        $delete_post_button.off("click").on("click", async function() {
            frm.events.apply_delete_post(frm, this)
        })

        // Bấm nút Sao chép phương án
        let $copy_post_button = $wrapper.find('.planner-copy-post')
        $copy_post_button.off("click").on("click", async function() {
            frm.events.apply_copy_post(frm, this)
            frm.events.display_save_button(frm, true)
        })

        // Bấm nút Xóa mặt hàng
        let $delete_item_button = $wrapper.find('.planner-delete-item')
        $delete_item_button.off("click").on("click", async function() {
            frm.events.apply_delete_item(frm, this)
        })
    },

    define_materials: async function(frm) {
        let $wrapper = frm.fields_dict.wrapper.$wrapper;
        let $materials_list = $wrapper.find('.planner-bom-materials');
        if (!$materials_list.length) return;

        // Lấy danh sách BOM cần fetch duy nhất
        const boms_to_fetch = {};
        $materials_list.each(function() {
            const $el = $(this);
            const $rowWrapper = $el.closest('[data-idx]');
            const row_idx = parseInt($rowWrapper.attr('data-idx'), 10);
            const item = frm.doc.items[row_idx];
            const bom_name = item?.bom;
            if (bom_name) boms_to_fetch[bom_name] = true;

            // Đồng bộ lại data-bom của container
            $el.attr('data-bom', bom_name || '');
        });

        // Fetch BOM 1 lần cho mỗi bom_name
        const bom_docs = {};
        for (let bom_name of Object.keys(boms_to_fetch)) {
            try {
                const doc = await frappe.db.get_doc('BOM', bom_name);
                bom_docs[bom_name] = doc.items || [];
            } catch (e) {
                bom_docs[bom_name] = [];
            }
        }

        // Render vào từng container
        $materials_list.each(function() {
            const $el = $(this);
            const is_mobile = $el.hasClass('planner-bom-materials-mobile');
            $el.empty();

            const $rowWrapper = $el.closest('[data-idx]');
            const row_idx = parseInt($rowWrapper.attr('data-idx'), 10);
            const item = frm.doc.items[row_idx];
            const bom_name = item?.bom;
            const items = bom_docs[bom_name] || [];

            if (!items.length) {
                return;
            }

            for (let material of items) {
                const name_html = is_mobile
                    ? `${material.item_code} - ${material.item_name}`
                    : material.item_name;

                const html = `
                    <div class="d-flex justify-content-between align-items-center" style="color: grey;">
                        <div>${name_html}</div>
                        <div>${material.qty} ${material.stock_uom}</div>
                    </div>
                `;
                $el.append(html);
            }
        });

        const $desktop_eyes = $wrapper.find('.planner-bom-eye');
        $desktop_eyes.each(function() {
            const $eye = $(this);
            const $materials = $eye.closest('td').find('.planner-bom-materials');

            if ($eye.hasClass('fa-eye')) {
                $materials.attr('style', 'display:block !important; color: grey; font-size: 10px; margin-top: 0.5rem;');
            } else if ($eye.hasClass('fa-eye-slash')) {
                $materials.attr('style', 'display:none !important');
            }

            $eye.off('click').on('click', function() {
                const isVisible = $eye.hasClass('fa-eye');
                if (isVisible) {
                    $eye.removeClass('fa-eye').addClass('fa-eye-slash');
                    $materials.attr('style', 'display:none !important');
                } else {
                    $eye.removeClass('fa-eye-slash').addClass('fa-eye');
                    $materials.attr('style', 'display:block !important; color: grey; font-size: 10px; margin-top: 0.5rem;');
                }
            });

        });

    },

    define_input: async function(frm) {
        // Lấy tất cả td có fieldname là item_code
        let $wrapper = frm.fields_dict.wrapper.$wrapper;

        const item_code_containers = $wrapper.find('td[data-fieldname="item_code"], div[data-role="mobile-row"] div[data-fieldname="item_code"]');
        for (const el of item_code_containers.toArray()) {
            const container = $(el);
            if (container.data('link-initialized') || container.children().length > 0) continue;

            const $rowWrapper = container.closest('[data-idx]');
            const row_idx = parseInt($rowWrapper.attr('data-idx'), 10);
            if (Number.isNaN(row_idx)) continue;
            const item = frm.doc.items[row_idx];

            const control = frappe.ui.form.make_control({
                df: {
                    fieldtype: 'Link',
                    options: 'Item',
                    fieldname: 'item_code',
                    only_select: true,
                    get_query: () => ({
                        filters: {
                            "item_group": ["like", "%Sản phẩm%"],
                            "disabled": 0,
                            "has_variants": 0
                        }
                    }),
                },
                parent: container,
                only_input: true,
                frm: frm
            });

            control.refresh();
            if (item && item.item_code) control.$input.val(item.item_code);
            control.$input.addClass('text-center');

            // Sự kiện chọn item
            control.$input.on('awesomplete-selectcomplete', async () => {
                const value = control.get_value();
                if (!item || !item.name) return;

                await frappe.model.set_value(item.doctype, item.name, 'item_code', value);

                const result = await frappe.db.get_value('Item', value, ['item_name', 'stock_uom']);
                const item_name = result?.message?.item_name || '';
                const stock_uom = result?.message?.stock_uom || '';

                await frappe.model.set_value(item.doctype, item.name, 'item_name', item_name);
                await frappe.model.set_value(item.doctype, item.name, 'stock_uom', stock_uom);
                await frappe.model.set_value(item.doctype, item.name, 'qty', 100);
                frm.refresh_field('items');

                const $rows = $wrapper.find(`[data-role$="-row"][data-idx="${row_idx}"]`);

                $rows.each(function() {
                    const $r = $(this);
                    $r.find('[title="item_name"]').text(item_name);
                    $r.find('[title="stock_uom"]').text(stock_uom);
                    const $qty = $r.find('[title="qty"]');
                    const $qty_input = $qty.find('input');
                    if ($qty_input.length) $qty_input.val(100);
                    else $qty.text(100);
                    const $input = $r.find('[data-fieldname="item_code"] input');
                    if ($input.length) $input.val(value);
                });

                frm.events.display_save_button(frm, true);
            });

            container.data('link-initialized', true);
        }

        let bom_containers = $wrapper.find('div[data-fieldname="bom"]');      
        for (const el of bom_containers.toArray()) {
            let container = $(el);
            if (container.data('link-initialized') || container.children().length > 0) continue;

            let $rowWrapper = container.closest('[data-idx]');
            let row_idx = parseInt($rowWrapper.attr('data-idx'), 10);
            if (Number.isNaN(row_idx)) continue;
            let item = frm.doc.items[row_idx];

            let input_parent = container;
            let temp = frappe.ui.form.make_control({
                df: {
                    fieldtype: 'Link',
                    options: 'BOM',
                    fieldname: 'bom',
                    only_select: true,
                    get_query: function () {
                        return {
                            filters: {
                                item: item.item_code || ""
                            }
                        };
                    }
                },
                parent: input_parent,
                only_input: true,
                frm: frm,
            });

            temp.refresh();
            if (item && item.bom) {
                temp.$input.val(item.bom);
                let $materials = container.closest('td').find('.planner-bom-materials');
                $materials.attr('data-bom', item.bom);
                frm.events.define_materials(frm)
            }
            temp.$input.addClass("text-center");

            temp.$input.on('awesomplete-selectcomplete', async function (e) {
                let value = temp.get_value();
                if (!item || !item.name) return;

                frappe.model.set_value(item.doctype, item.name, 'bom', value);
                frm.refresh_field('items');

                const $rows = $wrapper.find(`[data-role$="-row"][data-idx="${row_idx}"]`);
                $rows.each(function() {
                    const $r = $(this);
                    const $bom = $r.find('[title="bom"]');
                    const $bom_input = $bom.find('input');
                    if ($bom_input.length) $bom_input.val(value);
                    else $bom.text(value);
                    const $input = $r.find('[data-fieldname="bom"] input');
                    if ($input.length) $input.val(value);
                    frm.events.define_materials(frm)
                })

                frm.events.display_save_button(frm, true);
            });

            container.parent().find('.bom-icon').on('click', async function () {
                if (frm.is_dirty()) {
                    await frm.save();
                }
                frappe.set_route('query-report', 'BOM Custom Search', {
                    custom_plan: frm.doc.name,
                    row_name: item.name,
                    item_code: item.item_code
                });
            });

            container.data("link-initialized", true);
        }

        let fields = [
            {fieldname: 'qty', fieldtype: 'Float', class: 'text-center'},
            {fieldname: 'start_date', fieldtype: 'Date', class: 'text-center'},
            {fieldname: 'end_date', fieldtype: 'Date', class: 'text-center'},
            {fieldname: 'note', fieldtype: 'Small Text'},
        ];

        function adjustTextareaHeight(el) {
            if (!el) return;
            const isMobile = el.closest('div[data-role="mobile-row"]');
            const minHeight = isMobile ? 50 : 30;
            el.style.setProperty('height', `${minHeight}px`, 'important');

            requestAnimationFrame(() => {
                const targetHeight = Math.max(el.scrollHeight, minHeight);
                el.style.setProperty('height', `${targetHeight}px`, 'important');
            });
        }

        if (window._allTextareaResizeHandlers) {
            window._allTextareaResizeHandlers.forEach(h => window.removeEventListener('resize', h));
        }
        window._allTextareaResizeHandlers = [];
        let createdTextareas = [];

        for (let f of fields) {
            let containers = $wrapper.find(`td[data-fieldname="${f.fieldname}"], div[data-role="mobile-row"] div[data-fieldname="${f.fieldname}"]`);
            for (const el of containers.toArray()) {
                const container = $(el);
                if (container.data('link-initialized') || container.children().length > 0) continue;
                const $rowWrapper = container.closest('[data-idx]');
                const row_idx = parseInt($rowWrapper.attr('data-idx'), 10);
                if (Number.isNaN(row_idx)) continue;     
                
                const item = frm.doc.items[row_idx];
                let temp = frappe.ui.form.make_control({
                    df: {
                        fieldtype: f.fieldtype,
                        fieldname: f.fieldname,
                        options: f.options ? f.options : null
                    },
                    parent: container,
                    only_input: true,
                    frm: frm,
                });

                temp.refresh();
                if (item && item[f.fieldname] != null) {
                    if (f.fieldtype === 'Float') {
                        temp.$input.val(Number(item[f.fieldname]));
                    } else if (f.fieldtype === 'Date') {
                        temp.$input.val(frappe.datetime.str_to_user(item[f.fieldname]));
                    } else {
                        temp.$input.val(item[f.fieldname]);
                    }
                }

                if (temp.df.fieldtype === "Small Text") {
                    let inMobileRow = container.closest('div[data-role="mobile-row"]').length > 0;
                    let inputHeight = inMobileRow ? 50 : 30;

                    if (temp.df.fieldtype === "Small Text") {
                        temp.$input.attr("style", `
                            overflow: hidden !important;
                            resize: none !important;
                            box-sizing: border-box !important;
                            line-height: 1.2 !important;
                            min-height: 30px !important;
                            height: 30px !important;
                        `);

                        temp.$input.on("input", function () {
                            adjustTextareaHeight(this);
                        });

                        // khởi tạo chiều cao ban đầu
                        adjustTextareaHeight(temp.$input[0]);
                    }
                }

                createdTextareas.push(temp.$input[0]); 
                if (f.class) temp.$input.addClass(f.class);
                temp.$input.on('change', async function(e) {
                    let value = temp.get_value();
                    if (!item || !item.name) return;

                    frappe.model.set_value(item.doctype, item.name, f.fieldname, value);

                    const $rows = $wrapper.find(`[data-role$="-row"][data-idx="${row_idx}"]`);
                    $rows.each(function() {
                        let $r = $(this);
                        let $field = $r.find(`[title="${f.fieldname}"]`);
                        let $field_input = $field.find('input')
                        if ($field_input.length) {
                            if ($field_input[0] !== temp.$input[0]) {
                                if (f.fieldtype === 'Float') {
                                    $field_input.val(Number(value));
                                } else if (f.fieldtype === 'Date') {
                                    $field_input.val(frappe.datetime.str_to_user(value));
                                } else {
                                    $field_input.val(value);
                                }
                            }
                        } else if (f.fieldtype === "Small Text") {
                            let $textarea = $field.find('textarea');
                            if ($textarea.length && $textarea[0] !== temp.$input[0]) {
                                $textarea.val(value);
                                requestAnimationFrame(() => adjustTextareaHeight($textarea[0]));
                            }
                        } else {
                            $field.text(value);
                        }
                    })

                    frm.events.display_save_button(frm, true);
                });                

                container.data('link-initialized', true);
            }
        }

        const resizeHandler = () => {
            createdTextareas.forEach(el => adjustTextareaHeight(el));
        };

        window._allTextareaResizeHandlers.push(resizeHandler);
        window.addEventListener('resize', resizeHandler);
    },

    define_trigger: async function(frm) {
        await frm.events.define_change(frm)
        await frm.events.define_input(frm)
        await frm.events.define_materials(frm)
    },

    display_save_button: function(frm, action) {
        let $wrapper = frm.fields_dict.wrapper.$wrapper
        if (action === true) {
            $wrapper.find('.planner-save-btn').show()
            $wrapper.find('.planner-workflows').hide()
        } else {
            $wrapper.find('.planner-save-btn').hide()
            $wrapper.find('.planner-workflows').show()            
        }
    },

    render_post: async function(frm, post, items) {
        return await frappe.xcall(
            "tahp.tahp.doctype.custom_planner.custom_planner.render_content",
            { planner: frm.doc.name, post, items }
        );
    },

    apply_action: async function(frm, action) {
        const prompt_actions = ["Trả về KHSX", "Trả về PTCN"];
        let comment = "";

        // Nếu là action trả về → hiển thị prompt + confirm
        if (prompt_actions.includes(action)) {
            comment = await new Promise((resolve, reject) => {
                frappe.prompt(
                    [
                        {
                            fieldname: "reason",
                            fieldtype: "Small Text",
                            label: "Lý do trả về",
                            reqd: 1,
                            placeholder: "Điền vào đây..."
                        }
                    ],
                    (values) => {
                        resolve(values.reason)
                    },
                    `Vui lòng nhập lý do trả về`,
                    "Xác nhận",
                    "Hủy"
                );
            });
        } else {
            // Các action khác → confirm bình thường
            await new Promise((resolve, reject) => {
                frappe.confirm(
                    `Xác nhận thực hiện ${action}?`,
                    () => resolve(),
                    () => reject()
                );
            });
        }

        // Sau khi có comment (hoặc không) → thực hiện workflow
        switch (frm.doc.workflow_state) {
            case "Nháp":
                if (action === "Gửi PTCN") {
                    frm.doc.items.forEach((row) => {
                        if (!row.item_code) frappe.throw("Vui lòng điền đủ mã mặt hàng trong các phương án!");
                        if (row.qty <= 0) frappe.throw(`Sản lượng dự kiến của mặt hàng phải lớn hơn 0. Bạn đang điền: ${row.item_name} với SL là ${row.qty}`);
                        if (!row.start_date) frappe.throw(`Vui lòng điền ngày dự kiến bắt đầu sản xuất của mặt hàng ${row.item_name}!`);
                        if (!row.end_date) frappe.throw(`Vui lòng điền ngày dự kiến kết thúc sản xuất của mặt hàng ${row.item_name}!`);
                    });
                    await frm.events.apply_notify(frm, "Phát triển công nghệ", `Kế hoạch sản xuất ${frm.doc.name} đang cần PTCN xét duyệt công nghệ`);
                }
                break;

            case "Đợi PTCN Duyệt":
                if (action === "Gửi KHSX") {
                    frm.doc.items.forEach((row) => {
                        if (!row.bom) frappe.throw(`Phát hiện mặt hàng ${row.item_name} chưa được điền Công thức sản xuất`);
                    });
                    await frm.events.apply_notify(frm, "Kế hoạch sản xuất", `Kế hoạch sản xuất ${frm.doc.name} đã được xét duyệt công nghệ, vui lòng kiểm tra trước khi trình GĐ`);
                } else if (action === "Trả về KHSX") {
                    await frm.events.apply_notify(frm, "Kế hoạch sản xuất", `Kế hoạch sản xuất ${frm.doc.name} bị PTCN trả về phòng KHSX. Lý do trả về: ${comment}`, comment);
                }
                break;

            case "Đã được PTCN duyệt":
                if (action === "Gửi GĐ") {
                    await frm.events.apply_notify(frm, "Giám đốc", `Kế hoạch sản xuất ${frm.doc.name} đã được cập nhật. Giám đốc vui lòng vào kiểm tra`);
                } else if (action === "Trả về PTCN") {
                    await frm.events.apply_notify(frm, "Phát triển công nghệ", `Kế hoạch sản xuất ${frm.doc.name} bị KHSX trả về phòng PTCN. Lý do trả về: ${comment}`, comment);
                }
                break;

            case "Đợi GĐ duyệt":
                if (action === "Trả về KHSX") {
                    await frm.events.apply_notify(frm, "Kế hoạch sản xuất", `Kế hoạch sản xuất ${frm.doc.name} bị Giám đốc trả về phòng KHSX. Lý do trả về: ${comment}`, comment);
                } else if (action === "Trả về PTCN") {
                    await frm.events.apply_notify(frm, "Phát triển công nghệ", `Kế hoạch sản xuất ${frm.doc.name} bị Giám đốc trả về phòng PTCN. Lý do trả về: ${comment}`, comment);
                }
                break;

            default:
                break;
        }

        await frappe.xcall("frappe.model.workflow.apply_workflow", {doc: frm.doc, action});
    },

    apply_notify: async function(frm, role, subject, comment=null) {
        await frappe.xcall(
            "tahp.tahp.doctype.custom_planner.custom_planner.wwo_notify", 
            {role: role, subject: subject, document_type: "Custom Planner", document_name: frm.doc.name, comment: comment}
        )
    },

    apply_new_post: async function(frm) {
        let new_post = frm.add_child("posts")
        let new_item = frm.add_child("items")
        new_post.routing = frappe.utils.get_random(8)
        new_item.parent_name = new_post.routing
        let now = frappe.datetime.now_datetime();
        let tomorrow = frappe.datetime.add_days(now, 1);
        new_item.start_date = tomorrow 
        new_item.end_date = tomorrow
        frm.refresh_field("posts")
        frm.refresh_field("items")

        let response = await frm.events.render_post(frm, new_post, [new_item]);
        let $wrapper = frm.fields_dict.wrapper.$wrapper
        let $content_section = $wrapper.find('.planner-content-section')
        $content_section.append(response)
        await frm.events.define_trigger(frm)
    },

    apply_new_item: async function(frm, wrapper) {
        const post_idx = $(wrapper).closest('.planner-post').data('idx')
        const post = frm.doc.posts.find(p => p.idx === post_idx);

        let new_item = frm.add_child("items")
        let now = frappe.datetime.now_datetime();
        let tomorrow = frappe.datetime.add_days(now, 1);
        new_item.parent_name = post.routing || post.name
        new_item.start_date = tomorrow 
        new_item.end_date = tomorrow
        frm.refresh_field("items")

        let items = frm.doc.items.filter(i => i.parent_name === post.routing || i.parent_name == post.name)
        let response = await frm.events.render_post(frm, post, items)
        const $wrapper = frm.fields_dict.wrapper.$wrapper
        const $content_section = $wrapper.find('.planner-content-section')
        const $old_post_div = $content_section.find(`.planner-post[data-idx="${post.idx}"]`)
        $old_post_div.replaceWith(response)
        await frm.events.define_trigger(frm)
    },

    apply_delete_post: async function(frm, wrapper) {
        const post_idx = $(wrapper).closest('.planner-post').data('idx')
        const post = frm.doc.posts.find(p => p.idx === post_idx)
        if (!post) return;
        const routing = post.routing || post.name

        frappe.confirm(
            `Bạn có chắc chắn muốn xóa phương án #${post_idx} không?`,
            async () => {
                frm.doc.items
                    .filter(i => i.parent_name === routing || i.parent_name === post.name)
                    .forEach(i => frappe.model.clear_doc(i.doctype, i.name))
                frappe.model.clear_doc(post.doctype, post.name)
                frm.refresh_field("posts")
                frm.refresh_field("items")
                frm.dirty()

                wrapper.closest('.planner-post').remove()
                const $wrapper = frm.fields_dict.wrapper.$wrapper;
                const $content_section = $wrapper.find('.planner-content-section')
                const $all_posts = $content_section.find('.planner-post')
                $all_posts.each(function(index) {
                    $(this).attr('data-idx', index + 1)
                    $(this).find('.first-title').text(`Phương án #${index + 1}`)
                });

                await frm.events.define_change(frm);
                frm.events.display_save_button(frm, true)
            }
        );
    },

    apply_copy_post: async function(frm, wrapper) {
        let $post = $(wrapper).closest('.planner-post')
        let post_idx = parseInt($post.attr('data-idx'))
        let original_post = frm.doc.posts[post_idx - 1]
        let original_items = frm.doc.items.filter(it => it.parent_name === original_post.routing || it.parent_name === original_post.name)
        let new_post = frm.add_child("posts")
        new_post.routing = frappe.utils.get_random(8)

        original_items.forEach(row => {
            let new_item = frm.add_child("items")
            new_item.parent_name = new_post.routing
            new_item.item_code = row.item_code
            new_item.item_name = row.item_name
            new_item.qty = row.qty
            new_item.bom = row.bom
            new_item.stock_uom = row.stock_uom
            new_item.start_date = row.start_date
            new_item.end_date = row.end_date
            new_item.note = row.note 
        })

        frm.refresh_field("posts")
        frm.refresh_field("items")
        let items = frm.doc.items.filter(row => row.parent_name === new_post.routing)
        let response = await frm.events.render_post(frm, new_post, items)
        let $wrapper = frm.fields_dict.wrapper.$wrapper
        let $content_section = $wrapper.find('.planner-content-section')
        $content_section.append(response)
        await frm.events.define_trigger(frm)
    },

    apply_delete_item: async function(frm, wrapper) {
        const $row = $(wrapper).closest('[data-idx]');
        const item_idx = parseInt($row.attr('data-idx'), 10);
        const item = frm.doc.items[item_idx]
        console.log(item)
        let post = frm.doc.posts.find(p => p.routing === item.parent_name || p.name === item.parent_name)
        if (!item) return;

        frappe.confirm(
            `Bạn có chắc chắn muốn xóa mặt hàng ${item.item_name} trong phương án #${post.idx} không?`,
            async () => {
                frappe.model.clear_doc(item.doctype, item.name);
                frm.refresh_field("items");
                frm.dirty()

                const items = frm.doc.items.filter(i => i.parent_name === post.routing || i.parent_name === post.name)
                const response = await frm.events.render_post(frm, post, items);
                const $wrapper = frm.fields_dict.wrapper.$wrapper;
                const $content_section = $wrapper.find('.planner-content-section');
                const $old_post_div = $content_section.find(`.planner-post[data-idx="${post.idx}"]`);
                $old_post_div.replaceWith(response);

                await frm.events.define_trigger(frm);
                frm.events.display_save_button(frm, true);
            }
        );
    },

    apply_primary_action: async function(frm, wrapper, action) {
        switch (action) {
            case "Phê duyệt":
                const $post = $(wrapper).closest('.planner-post');
                let post_idx = parseInt($post.attr('data-idx'))
                let post = frm.doc.posts[post_idx - 1]
                if (!post) return

                let d = new frappe.ui.Dialog({
                    title: `Xác nhận phê duyệt phương án #${post_idx}?`,
                    fields: [
{
                            fieldname: "comment",
                            fieldtype: "Small Text",
                            label: "Gửi kèm bình luận cho đội ngũ sản xuất (nếu có)",
                            placeholder: "Điền vào đây..."
                        }
                    ],
                    primary_action_label: "Xác nhận",
                    primary_action: async (values) => {
                        d.hide();
                        await frappe.xcall("tahp.tahp.doctype.custom_planner.custom_planner.handle_approve", {
                            planner: frm.doc.name,
                            post: post.name,
                            comment: values.comment || "",
                        });                        
                    }
                });

                d.show();
                break;
            
            default:
                break
        }
    },
})
