frappe.pages['modern-menu'].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Menu',
    single_column: true
  });

  // Xoá header đi
  // $(wrapper).find(".page-head").remove();
  frappe.modern_menu.make(page);

}

frappe.modern_menu = {
  make(page) {
    let all_pages = frappe.workspaces;

    // Grid container
    let body = `<div id="modern-menu" class="menu-grid">`;

    Object.values(all_pages)
      .filter((p) => p.parent_page == "")
      .forEach((item) => {
        body += `
          <div class="menu-card">
            <a href="/app/${item.public
            ? frappe.router.slug(item.title)
            : "private/" + frappe.router.slug(item.title)}">
              
              <div class="menu-icon">
                ${item.public
            ? frappe.utils.icon(item.icon || "folder-normal", "lg")
            : `<span class="indicator ${item.indicator_color}"></span>`}
              </div>
              
              <div class="menu-title">${__(item.title)}</div>
              <div class="menu-subtitle">${item.subtitle || ""}</div>
            </a>
          </div>
        `;
      });

    body += `</div>`;

    $(body).appendTo(page.main);
  }
}
