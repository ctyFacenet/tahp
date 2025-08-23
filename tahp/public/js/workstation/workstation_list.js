frappe.listview_settings['Workstation'] = {
    refresh: async function(listview) {
        frappe.custom_utils_primary_action(listview, '+ Tạo nhanh', async () => {
            create_workstations(listview)
        });
    },
};

async function create_workstations(listview) {
    const dialog = new frappe.ui.Dialog({
        title: "Tạo nhanh thiết bị và cụm thiết bị",
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'error',
                options: '',
            },
            {
                label: "Tên cụm thiết bị cha",
                fieldname: "parent_name",
                fieldtype: "Data"
            },
            {
                label: "Tên loại thiết bị",
                fieldname: "workstation_type",
                fieldtype: "Data",
            },
            {
                label: 'Không cần tạo cụm thiết bị cha',
                fieldname: 'hide_parent',
                fieldtype: 'Check',
            },
            {
                label: 'Tự động đặt tên loại thiết bị cho cụm này',
                fieldname: 'auto_type',
                fieldtype: 'Check',
                default: '1'
            },
            {
                label: 'Danh sách thiết bị',
                fieldname: 'workstations',
                fieldtype: 'Table',
                cannot_add_rows: false,
                in_place_edit: true,
                fields: [
                    { label: 'Tên thiết bị', fieldname: 'workstation', fieldtype: 'Data', reqd: 1, in_list_view: 1 }
                ]
            }
        ],
        primary_action_label: 'Tạo nhanh',
        primary_action: async (values) => {
            const response = await handle_create_workstations(values, dialog);
            if (response) {
                dialog.hide();
                listview.refresh();
            }
        }
    })

    dialog.show();
    frappe.custom_utils_checkbox_toggle(dialog, 'hide_parent', ['parent_name', 'auto_type'])
    frappe.custom_utils_checkbox_toggle(dialog, 'auto_type', 'workstation_type', true)

    const grid = dialog.get_field('workstations').grid;
    const original_add = grid.add_new_row.bind(grid);

    grid.add_new_row = function() {
        original_add();
        const data = grid.df.data;
        const new_row = data[data.length - 1];

        const parent_name = dialog.get_value('parent_name') || '';
        const suffixes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const index = data.length - 1;
        const suffix = suffixes[index % suffixes.length];

        new_row.workstation = parent_name ? `${parent_name.trim()} ${suffix}` : '';
        grid.refresh();

        return new_row;
    };
}

async function handle_create_workstations(values, dialog) {
    const error_field = dialog.get_field('error');
    const { parent_name, hide_parent, workstations, auto_type, workstation_type } = values;
    let parent = null;
    let wp_type = null;

    if (hide_parent === 0) {
        if (!parent_name) {
            error_field.$wrapper.html(`
                <div class="alert alert-danger text-center border border-danger">
                    Vui lòng điền tên cho cụm thiết bị cha
                </div>
            `);
            return false;
        }

        if (auto_type) {
            wp_type = parent_name.trim()
        } else {
            wp_type = workstation_type
        }

        if (wp_type) {
            await frappe.db.insert({
                doctype: 'Workstation Type',
                workstation_type: wp_type
            }, { ignore_permissions: true }); 
        }

        let name = parent_name.trim();
        if (!/^Cụm /i.test(name)) name = 'Cụm ' + name;
        parent = name;

        await frappe.db.insert({
            doctype: 'Workstation',
            workstation_name: name,
            custom_is_parent: 1,
            workstation_type: wp_type
        }, { ignore_permissions: true });
    }
    
    if (!values.workstations) {
        error_field.$wrapper.html(`
            <div class="alert alert-danger text-center border border-danger">
                Trong danh sách phải điền ít nhất 1 thiết bị
            </div>
        `);
        return false;
    }
    
    let empty = true;

    for (let row of workstations) {
        if (row.workstation) {
            const name = row.workstation.trim();
            empty = false;

            await frappe.db.insert({
                doctype: 'Workstation',
                workstation_name: name,
                custom_parent: hide_parent ? null : parent,
                workstation_type: wp_type
            }, { ignore_permissions: true });
        }
    }

    if (empty) {
        error_field.$wrapper.html(`
            <div class="alert alert-danger text-center border border-danger">
                Trong danh sách phải điền ít nhất 1 thiết bị
            </div>
        `);
        return false;
    }

    error_field.$wrapper.html("");
    frappe.show_alert({
        message:__('Thành công!'),
        indicator:'green'
    });
    return true;
}

