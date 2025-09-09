frappe.listview_settings['Workstation'] = {
  refresh: async function (listview) {

    frappe.custom_utils_primary_action(listview, '+ Tạo nhanh', async () => {
      create_workstations(listview)
    });

    frappe.call({
      method: 'tahp.doc_events.workstation.workstation.get_workstation_details',
      args: { input: 'workspace-dashboard' }
    }).then(r => {
      console.log("Workstation data loaded:", r.message);

      setTimeout(() => {
        let items = listview.$result.find('.image-view-item');
        r.message.forEach((ws, i) => {
          let el = items[i];
          if (el) {
            $(el).attr('data-name', ws.workstation_name);
          }
        });
      }, 300);
    });

    listview.$result.off('click', '.image-view-body');

    listview.$result.on('click', '.image-view-body', function () {
      let ws_name = $(this).closest('.image-view-item').attr('data-name');
      show_machine_modal(ws_name);
    });
  },
};

function show_machine_modal(ws_name) {
  $(".modal").modal("hide");

  frappe.call({
    method: 'tahp.doc_events.workstation.workstation.get_workstation_details',
    args: { input: ws_name }
  }).then(r => {
    let data = r.message[0];
    if (!data) {
      frappe.msgprint(`Không tìm thấy dữ liệu cho ${ws_name}`);
      return;
    }

    let circumference = 2 * Math.PI * 45;
    let availability = data.availability;

    let d = new frappe.ui.Dialog({
      title: `Chi tiết máy: ${data.workstation_name}`,
      fields: [{ fieldname: 'html', fieldtype: 'HTML' }],
      size: 'extra-large'
    });

    let html = `
    <div class="machine-dashboard">
      <h2 class="main-title">${data.workstation_name}</h2>

      <div class="machine-row">
        <div class="machine-block half">
          <div class="block-title">Thông số kỹ thuật tức thời của máy</div>
          <div class="machine-row">
            <div class="machine-card status-card">
              <div class="label">Trạng thái</div>
              <div class="status ${data.status === 'Đang chạy' ? 'on' : 'off'}">
                ${data.status === 'Đang chạy' ? "Đang chạy" : "Dừng chạy"}
              </div>
            </div>
            <div class="machine-card">
              <div class="label">Nhiệt độ động cơ</div>
              <div class="value green">${data.temperature_motor}°C</div>
            </div>
          </div>
          <div class="machine-row small-cards">
            <div class="machine-card">
              <div class="label">Nhiệt độ dầu</div>
              <div class="value green">${data.temperature_oil}°C</div>
            </div>
            <div class="machine-card">
              <div class="label">Nhiệt độ nhũ tương</div>
              <div class="value green">${data.temperature_nhu_tuong}°C</div>
            </div>
            <div class="machine-card">
              <div class="label">Nhiệt độ ủ</div>
              <div class="value green">${data.temperature_ui}°C</div>
            </div>
          </div>
        </div>

        <div class="machine-block half">
          <div class="block-title">Hiệu suất trong ngày</div>
          <div class="performance-section">
            <div class="performance-gauge">
              <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet">
                <circle cx="60" cy="60" r="45" stroke="#eee" stroke-width="12" fill="none"/>
                <circle id="progress-circle" class="progress-circle"
                        cx="60" cy="60" r="45" stroke="#7c3aed" stroke-width="12"
                        fill="none" stroke-dasharray="${circumference}" 
                        stroke-dashoffset="${circumference}" stroke-linecap="round"/>
              </svg>
              <div id="progress-text" class="progress-text">${availability}%<br/>Availability</div>
            </div>
            <div class="performance-times">
              <div class="machine-card time-card">Stop Time: <b>${data.stop_time}</b></div>
              <div class="machine-card time-card">Running Time: <b>${data.running_time}</b></div>
              <div class="machine-card time-card">Planned Time: <b>${data.planned_time}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="machine-row">
        <div class="machine-card production-card">
          <div class="label">Thông tin lệnh sản xuất</div>
          <div class="row-info"><span>Mã lệnh SX:</span><span class="value">${data.work_order}</span></div>
          <div class="row-info"><span>Công đoạn:</span><span class="value">${data.operation}</span></div>
          <div class="row-info"><span>Mã BTP đầu ra:</span><span class="value">${data.item_code}</span></div>
          <div class="row-info"><span>Số lượng kế hoạch:</span><span class="value">${data.qty_plan}</span></div>
          <div class="row-info"><span>Số lượng thực tế:</span><span class="value">${data.qty_actual}</span></div>
          <div class="row-info"><span>Số lượng OK thực tế:</span><span class="value">${data.qty_ok}</span></div>
          <div class="row-info"><span>Số lượng NG thực tế:</span><span class="value">${data.qty_ng}</span></div>
          <div class="row-info"><span>Tỷ lệ phế:</span><span class="value scrap">${data.scrap_rate}%</span></div>
        </div>
        <div class="machine-card production-card">
          <div class="label">Tiêu chuẩn cảnh báo</div>
          <div class="row-info"><span>Nhiệt độ dầu:</span>
            <span class="value">${data.temperature_oil_standard_min} - ${data.temperature_oil_standard_max}°C</span>
          </div>
        </div>
        <div class="machine-card production-card">
          <div class="label">Nguyên nhân dừng máy</div>
          <div class="row-info"><span>Thay men công đoạn:</span><span class="value">${data.reason_stop_men} phút</span></div>
          <div class="row-info"><span>Hỏng hệ thống quạt:</span><span class="value">${data.reason_stop_fan} phút</span></div>
          <div class="row-info"><span>Thay bobbin:</span><span class="value">${data.reason_stop_bobbin} phút</span></div>
        </div>
      </div>
    </div>
  `;



    d.set_value('html', html);
    d.set_primary_action("Đóng", () => d.hide());
    d.show();

    let circle = d.$wrapper.find("#progress-circle")[0];
    let text = d.$wrapper.find("#progress-text")[0];
    let current = 0;
    let step = availability / 50;
    let animate = setInterval(() => {
      if (current >= availability) {
        current = availability;
        clearInterval(animate);
      }
      let offset_run = circumference - (current / 100) * circumference;
      circle.setAttribute("stroke-dashoffset", offset_run);
      text.innerHTML = Math.round(current) + "%<br/>Có sẵn";
      current += step;
    }, 30);
  });
}


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

  grid.add_new_row = function () {
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
    message: __('Thành công!'),
    indicator: 'green'
  });
  return true;
}


