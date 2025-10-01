frappe.router.render = function () {
  if (this.current_route[0]) {
    // console.log("Rendering route:", this.current_route[0]);

    if (this.current_route[0] === "modern-menu") {
      if (!sessionStorage.getItem("modern_menu_reloaded")) {
        sessionStorage.setItem("modern_menu_reloaded", "1");
        location.reload();
        return;
      }
    } else {
      sessionStorage.removeItem("modern_menu_reloaded");
    }

    this.render_page();
  } else {
    frappe.set_route(['app', 'modern-menu']);
  }
};
