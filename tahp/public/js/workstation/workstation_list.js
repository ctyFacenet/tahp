frappe.listview_settings['Workstation'] = {
  refresh: async function (listview) {
    frappe.custom_utils_primary_action(listview, '+ Tạo nhanh', async () => {
      create_workstations(listview);
    });

    listview.page.clear_inner_toolbar();
    listview.page.set_title("Dashboard giám sát tổng quan máy");

    $(listview.page.body).html(`
       <div class="custom-ws-wrapper">
        <iframe src="/frontend/workspace/list" 
        style="width:100%;height:calc(100vh - 120px);border:none;">
        </iframe>
        <div id="ws-summary-wrapper" class="mt-3"></div>
        <div class="row" id="ws-cards"></div>
       
        <div class="d-flex justify-content-between align-items-center mt-2 custom-footer">
          <div>
            <select id="ws-page-size" class="form-select form-select-sm">
              <option value="10">10/Trang</option>
              <option value="20">20/Trang</option>
              <option value="50">50/Trang</option>
              <option value="100">100/Trang</option>
            </select>
          </div>
          <div class="pagination-wrapper"></div>
          <div class="d-flex align-items-center gap-2">
            <span class="mr-2">Đi đến trang</span>
            <input type="number" id="ws-goto-page" class="form-control form-control-sm" style="width:80px;">
          </div>
        </div>


        <div class="text-center text-muted small mt-2">
          ©Copyright FaceNet. All Rights Reserved. Designed by FaceNet
        </div>
      </div>
    `);
    let page_size = 10,
      current_page = 1,
      total_count = 0,
      all_data = [];

    // load data workstation
    function load_ws_data(page) {
      frappe.call({
        method: "tahp.doc_events.workstation.workstation.get_workstation_details",
        args: { input: "workspace-dashboard" }
      }).then(r => {
        if (r.message) {
          all_data = r.message;
          total_count = all_data.length;
          let start = (page - 1) * page_size;
          let paginated = all_data.slice(start, start + page_size);

          render_ws_summary(all_data);
          render_ws_cards(paginated);
          renderPagination(page, Math.ceil(total_count / page_size), total_count);

          $("#ws-cards").off("click", ".ws-card-body");
          $("#ws-cards").on("click", ".ws-card-body", function () {
            let ws_name = $(this).closest(".ws-card").attr("data-name");
            show_machine_modal(ws_name);
          });
        }
      });
    }

    function renderPagination(current_page, total_pages, total_count) {
      let html = `<span>Trang số ${current_page} của ${total_pages} (${total_count} bản ghi)</span>`;
      html += `<ul class="pagination">`;
      html += `<li><a href="#" class="page-link prev ${current_page === 1 ? "disabled" : ""}">&lt;</a></li>`;

      let start = Math.max(1, current_page - 2);
      let end = Math.min(total_pages, current_page + 2);

      if (start > 1) {
        html += `<li><a href="#" class="page-link">1</a></li>`;
        if (start > 2) html += `<li><span class="page-ellipsis">...</span></li>`;
      }

      for (let i = start; i <= end; i++) {
        html += `<li><a href="#" class="page-link ${i === current_page ? "active" : ""}">${i}</a></li>`;
      }

      if (end < total_pages) {
        if (end < total_pages - 1) html += `<li><span class="page-ellipsis">...</span></li>`;
        html += `<li><a href="#" class="page-link">${total_pages}</a></li>`;
      }

      html += `<li><a href="#" class="page-link next ${current_page === total_pages ? "disabled" : ""}">&gt;</a></li>`;
      html += `</ul>`;

      $(".pagination-wrapper").html(html);
    }

    $(listview.page.body).on("change", "#ws-page-size", (e) => {
      page_size = parseInt($(e.target).val());
      current_page = 1;
      load_ws_data(current_page);
    });

    $(document).on("click", ".pagination .page-link", function (e) {
      e.preventDefault();
      let text = $(this).text();
      if ($(this).hasClass("disabled")) return;

      let total_pages = Math.ceil(total_count / page_size);
      if (text === "<") {
        if (current_page > 1) current_page--;
      } else if (text === ">") {
        if (current_page < total_pages) current_page++;
      } else {
        current_page = parseInt(text);
      }
      load_ws_data(current_page);
    });

    $(listview.page.body).on("keypress", "#ws-goto-page", (e) => {
      if (e.which === 13) {
        let total_pages = Math.ceil(total_count / page_size);
        let target = parseInt($(e.target).val());
        if (target >= 1 && target <= total_pages) {
          current_page = target;
          load_ws_data(current_page);
        } else frappe.msgprint(`Số trang không hợp lệ (1 - ${total_pages})`);
      }
    });

    load_ws_data(current_page);
  }
};

function render_ws_summary(machines) {
  let groups = {};
  machines.forEach(m => {
    let group = m.cluster_name || m.workstation_name || "Khác";
    if (!groups[group]) {
      groups[group] = { running: 0, paused: 0, error: 0, total: 0 };
    }
    if (m.status === "Đang chạy" || m.status === "Running") groups[group].running++;
    else if (m.status === "Tạm dừng" || m.status === "Paused") groups[group].paused++;
    else if (m.status === "Error" || m.status === "Hỏng") groups[group].error++;
    groups[group].total++;
  });

  let now = frappe.datetime.now_datetime();

  let html = `
    <div class="ws-summary">
      <div class="ws-summary-meta">
        <span>Thời gian hiện tại: <b>${now}</b></span>
        <span>Tần suất cập nhật: <b>5 phút</b></span>
        <span>Thời gian cập nhật mới nhất: <b>${now}</b></span>
      </div>
      <table class="ws-summary-table">
        <thead>
          <tr>
            <th rowspan="2">Trạng thái</th>
            <th rowspan="2">Nhóm máy</th>`;
  Object.keys(groups).forEach(g => {
    html += `<th>${g}</th>`;
  });
  html += `<th rowspan="2">Tổng số nhóm line</th></tr></thead><tbody>`;

  let states = [
    { key: "running", label: "Đang chạy", cls: "running" },
    { key: "paused", label: "Tạm dừng", cls: "paused" },
    { key: "error", label: "Hỏng", cls: "error" },
  ];

  states.forEach(s => {
    html += `<tr>
      <td>Trạng thái</td>
      <td>${s.label}</td>`;
    let total = 0;
    Object.keys(groups).forEach(g => {
      let val = groups[g][s.key] || s.key === 'running' ? 1 : 0;
      total += val;
      html += `<td class="${s.cls}">${val}</td>`;
    });
    html += `<td>${total}</td></tr>`;
  });

  html += `<tr><td colspan="2">Tổng</td>`;
  let grand_total = 0;
  Object.keys(groups).forEach(g => {
    let val = groups[g].total || 0;
    grand_total += val;
    html += `<td>${val}</td>`;
  });
  html += `<td>${grand_total}</td></tr>`;

  html += `</tbody></table></div>`;

  $("#ws-summary-wrapper").html(html);
}

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


function render_ws_cards(machines) {
  let container = $("#ws-cards");
  container.empty();

  machines.forEach(m => {
    let statusClass =
      m.status === "Đang chạy" || m.status === "Running"
        ? "ws-running"
        : m.status === "Tạm dừng" || m.status === "Paused"
          ? "ws-paused"
          : m.status === "Error"
            ? "ws-error"
            : "ws-idle";

    let bodyHtml = "";
    if (statusClass === "ws-paused") {
      bodyHtml = `<div class="ws-pause-icon">⏸</div>`;
    } else {
      bodyHtml = `
        <div class="ws-main-value">${m.rpm ?? "99.9"} <span class="unit">RPM</span>
         <div>Tốc độ kéo DV</div></div>
        <div class="ws-sub-row">
          <div class="ws-sub">
            <div class="val">${m.speed ?? "6868"} M/MIN</div>
            <div class="label">Tốc độ kéo</div>
          </div>
          <div class="ws-sub">
            <div class="val">${m.length ?? "686868"} M</div>
            <div class="label">Chiều dài dây</div>
          </div>
        </div>
      `;
    }

    let card = `
      <div class="ws-card ${statusClass}" data-name="${m.workstation_name}">
        <div class="ws-card-header ${statusClass}">
          ${m.workstation_name}
        </div>
        <div class="ws-card-body">
          ${bodyHtml}
        </div>
        <div class="ws-card-footer">
          <span class="ws-footer-btn">Có kế hoạch sản xuất</span>
        </div>
      </div>
    `;

    container.append(card);
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


