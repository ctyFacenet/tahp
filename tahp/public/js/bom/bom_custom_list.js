frappe.listview_settings["BOM"] = {
  hide_name_column: true,
  onload: function (listview) {
    // Xóa giao diện mặc định
    $(listview.page.body)
      .find(
        ".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form"
      )
      .remove();

    $(listview.page.body).append(`
      <div class="custom-bom-wrapper position-relative">
        <h3 class="text-center fw-bold mb-3">Quản lý BOM</h3>
        <div id="time-filter-toggle">
          <img src="/assets/tahp/images/filter_time.svg" alt="Filter Time">
        </div>
        <div id="time-filter" class="collapsed">
          <ul class="year-list">
            ${[2025, 2024, 2023, 2022, 2021, 2020]
        .map(
          (y) => `
                  <li>
                    <span class="year-toggle">▶</span>
                    <label><input type="checkbox" value="${y}" class="year-checkbox"> Năm ${y}</label>
                    <ul class="month-list" style="display:none">
                      ${Array.from({ length: 12 }, (_, i) => `
                        <li><label><input type="checkbox" value="${y}-${(
              i + 1
            )
              .toString()
              .padStart(2, "0")}"> Tháng ${i + 1}</label></li>
                      `).join("")}
                    </ul>
                  </li>
                `
        )
        .join("")}
          </ul>
        </div>

        <div class="d-flex justify-content-end gap-4 mb-2 custom-toolbar">
          <a href="javascript:void(0)" id="btn-add" class="text-info"> <img src="/assets/tahp/images/add_plus.svg" alt="Thêm mới"> Thêm mới</a>
          <a href="javascript:void(0)" id="btn-copy" class="text-info"> <img src="/assets/tahp/images/copy.svg" alt="Sao chép"> Sao chép</a>
          <a href="javascript:void(0)" id="btn-delete" class="text-info"> <img src="/assets/tahp/images/trash.svg" alt="Xoá"> Xóa</a>
        </div>

        <div id="bom-datatable"></div>

        <div class="d-flex justify-content-between align-items-center mt-2 custom-footer">
          <div>
            <select id="page-size" class="form-select form-select-sm">
              <option value="10">10/Trang</option>
              <option value="20">20/Trang</option>
              <option value="50">50/Trang</option>
              <option value="100">100/Trang</option>
            </select>
          </div>
          <div class="pagination-wrapper"></div>
          <div class="d-flex align-items-center gap-2">
            <span class="mr-2">Đi đến trang</span>
            <input type="number" id="goto-page" class="form-control form-control-sm" style="width:80px;">
          </div>
        </div>

        <div class="text-center text-muted small mt-2">
          ©Copyright FaceNet. All Rights Reserved. Designed by FaceNet
        </div>
      </div>
    `);

    let datatable,
      page_size = 10,
      current_page = 1,
      search_text = "",
      total_count = 0,
      time_filters = [];

    const label_map = {
      docstatus: "Trạng thái",
      is_active: "Đang hoạt động",
      is_default: "Mặc định",
      item_name: "Tên hàng"
    };

    const hidden_fields = ["name", "owner", "modified", "idx"];

    $(document).on("click", "#time-filter-toggle", function (e) {
      e.stopPropagation();
      $("#time-filter").toggleClass("active");
    });

    $(document).on("click", function (e) {
      if (
        $("#time-filter").hasClass("active") &&
        !$(e.target).closest("#time-filter").length &&
        !$(e.target).is("#time-filter-toggle")
      ) {
        $("#time-filter").removeClass("active");
      }
    });

    $(document).on("click", ".year-toggle", function () {
      let $months = $(this).siblings("ul.month-list");
      $months.toggle();
      $(this).text($months.is(":visible") ? "▼" : "▶");
    });

    $(document).on("change", ".year-checkbox", function () {
      let checked = $(this).is(":checked");
      $(this).closest("li").find(".month-list input[type=checkbox]").prop("checked", checked);
    });

    $(document).on("change", "#time-filter input[type=checkbox]", function () {
      let selected = [];
      $("#time-filter input[type=checkbox]:checked").each(function () {
        selected.push($(this).val());
      });

      time_filters = selected.map((val) => {
        if (val.length === 4) {
          return ["creation", "between", [`${val}-01-01`, `${val}-12-31`]];
        } else {
          let [y, m] = val.split("-");
          let lastDay = new Date(y, m, 0).getDate();
          return ["creation", "between", [`${y}-${m}-01`, `${y}-${m}-${lastDay}`]];
        }
      });

      current_page = 1;
      load_data(current_page, search_text, time_filters, listview);
    });

    function load_data(page, search = "", time_filters = [], listview) {
      let filters = [];
      if (search) filters.push(["item_name", "like", "%" + search + "%"]);

      let visible_fields = (listview.columns || [])
        .map((c) => c.df && c.df.fieldname)
        .filter((f) => f);

      let standard_fields = ["name", "owner", "modified", "docstatus", "is_active", "is_default"];
      visible_fields = [...new Set([...visible_fields, ...standard_fields])];

      frappe.call({
        method: "frappe.client.get_count",
        args: {
          doctype: "BOM",
          filters: filters,
          or_filters: time_filters.length ? time_filters : [],
        },
        callback: (r) => (total_count = r.message || 0),
      });

      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "BOM",
          fields: visible_fields,
          limit_start: (page - 1) * page_size,
          limit_page_length: page_size,
          filters: filters,
          or_filters: time_filters.length ? time_filters : [],
        },
        callback: (r) => {
          if (r.message) render_table(r.message, visible_fields);
        },
      });
    }

    function render_table(data, visible_fields) {
      let columns = [
        { name: "STT", align: "center", editable: false, field: "__stt", disableFilter: true },
        ...visible_fields
          .filter((f) => !hidden_fields.includes(f))
          .map((f) => {
            let df = frappe.meta.get_docfield("BOM", f);

            return {
              name: label_map[f] || (df ? __(df.label) : f),
              field: f,
              editable: false,
            };
          }),
        { name: "Thao tác", align: "center", editable: false, width: 120, field: "__actions", disableFilter: true },
      ];

      let rows = data.map((d, i) => {
        let base = [(current_page - 1) * page_size + i + 1];

        let values = visible_fields
          .filter((f) => !hidden_fields.includes(f))
          .map((f) => {
            if (f === "docstatus") {
              const statusMap = {
                0: { text: "Nháp", bg: "#F5F5F5", color: "#595959" },
                1: { text: "Duyệt xong", bg: "#F6FFED", color: "#27b485ff" },
                2: { text: "Hủy bỏ", bg: "#FFF1F0", color: "#CF1322" },
              };

              let s = statusMap[d[f]];
              if (!s) return "";

              return `<span class="badge rounded-pill"
              style="background:${s.bg};color:${s.color};
              font-weight:500;padding:4px 12px;min-width:70px;
              display:inline-block;text-align:center;font-size:14px">
            ${s.text}
          </span>`;
            }

            if (f === "is_active") {
              return d[f]
                ? `<input type="checkbox" checked disabled>`
                : `<input type="checkbox" disabled>`;
            }
            if (f === "is_default") {
              return d[f]
                ? `<input type="checkbox" checked disabled>`
                : `<input type="checkbox" disabled>`;
            }
            return d[f] || "";
          });
        let actions = "";
        if (d.docstatus == 0) {
          actions = `
          <a href="/app/bom/${d.name}" class="btn btn-sm" title="Xem">
             <img src="/assets/tahp/images/eye.svg" alt="Xem" class="icon-btn">
          </a>
          <a href="/app/bom/${d.name}" class="btn btn-sm" title="Sửa">
            <img src="/assets/tahp/images/edit.svg" alt="Sửa" class="icon-btn">
          </a>
          <button class="btn btn-sm btn-delete-row" data-bom="${d.name}" title="Xóa">
          <img src="/assets/tahp/images/trash.svg" alt="Xoá" class="icon-btn">
          </button>
  `;
        } else {
          actions = `
          <a href="/app/bom/${d.name}" class="btn btn-sm" title="Xem">
             <img src="/assets/tahp/images/eye.svg" alt="Xem" class="icon-btn">
          </a>
  `;
        }


        return [...base, ...values, actions];
      });

      let el = document.getElementById("bom-datatable");
      if (!el) return;


      if (datatable) datatable.refresh(rows, columns);
      else
        datatable = new DataTable(el, {
          columns: columns,
          data: rows,
          layout: "fluid",
          inlineFilters: true,
          checkboxColumn: true,
          pagination: false,
          stickyHeader: true,
          serialNoColumn: false,
          height: "auto",
          noDataMessage: `<div class="no-data-message">Không có dữ liệu</div>`,
        });

      datatable.wrapper.querySelectorAll(".dt-row-filter .dt-filter").forEach((el, idx) => {
        let col = datatable.options.columns[idx - 1];

        if (idx === 0 || (col && col.disableFilter && (col.field === "__stt" || col.field === "__actions"))) {
          el.style.display = "none";
        } else {
          el.classList.add("search-filter");
        }
      });

      renderPagination(current_page, Math.ceil(total_count / page_size), total_count);
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

      document.querySelector(".pagination-wrapper").innerHTML = html;
    }

    $(listview.page.body).on("change", "#page-size", (e) => {
      page_size = parseInt($(e.target).val());
      current_page = 1;
      load_data(current_page, search_text, time_filters, listview);
    });

    $(document).on("click", ".pagination .page-link", function (e) {
      e.preventDefault();
      let text = $(this).text();
      if ($(this).hasClass("disabled")) return;

      if (text === "<") {
        if (current_page > 1) current_page--;
      } else if (text === ">") {
        let tp = Math.ceil(total_count / page_size);
        if (current_page < tp) current_page++;
      } else {
        current_page = parseInt(text);
      }

      load_data(current_page, search_text, time_filters, listview);
    });

    $(listview.page.body).on("keypress", "#goto-page", (e) => {
      if (e.which === 13) {
        let tp = Math.ceil(total_count / page_size);
        let target = parseInt($(e.target).val());
        if (target >= 1 && target <= tp) {
          current_page = target;
          load_data(current_page, search_text, time_filters, listview);
        } else frappe.msgprint(`Số trang không hợp lệ (1 - ${tp})`);
      }
    });

    $(listview.page.body).on("click", ".btn-delete-row", function () {
      let bom_name = $(this).data("bom");
      customConfirmModal({
        title: "Xác nhận xóa BOM",
        message: `Bạn có chắc muốn xóa BOM <b>${bom_name}</b>?`,
        note: "Sau khi xóa, dữ liệu sẽ không thể khôi phục!",
        type: "danger",
        buttons: [
          { text: "Hủy bỏ", class: "btn-secondary" },
          {
            text: "Xóa", class: "btn-danger", onClick: () => {
              frappe.call({
                method: "frappe.client.delete",
                args: { doctype: "BOM", name: bom_name },
                callback: function () {
                  frappe.show_alert({ message: `Đã xóa ${bom_name}`, indicator: "red" });
                  load_data(current_page, search_text, time_filters, listview);
                }
              });
            }
          }
        ]
      });
    });

    // Toolbar actions
    $(listview.page.body).on("click", "#btn-add", () => frappe.new_doc("BOM"));
    $(listview.page.body).on("click", "#btn-copy", () => frappe.msgprint("Tính năng sao chép hàng loạt đang phát triển!"));
    $(listview.page.body).on("click", "#btn-delete", () => frappe.msgprint("Tính năng xoá hàng loạt đang phát triển!"));

    // --- Load lần đầu ---
    load_data(current_page, search_text, time_filters, listview);
  },
};
