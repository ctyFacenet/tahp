frappe.ready(() => {
  frappe.views.Workspace = class CustomWorkspace extends frappe.views.Workspace {
    constructor(wrapper) {
      super(wrapper);
    }

    show() {
      const is_workspace =
        frappe.router?.current_route &&
        frappe.router.current_route.length > 1 &&
        frappe.router.current_route[0].toLowerCase() === "workspaces";

      if (is_workspace) {
        if (window.innerWidth >= 992) {
          // PC/Laptop: ẩn sidebar dọc, hiện thanh ngang
          document.querySelectorAll(".layout-side-section")
            .forEach(el => el.classList.add("hide-side-section"));

          document.querySelector(".workspace-navbar")
            ?.classList.remove("d-none");
        } else {
          // Mobile: giữ sidebar dọc, ẩn thanh ngang
          document.querySelectorAll(".layout-side-section")
            .forEach(el => el.classList.remove("hide-side-section"));

          document.querySelector(".workspace-navbar")
            ?.classList.add("d-none");
        }
      } else {
        // Không phải trang Workspace → reset
        document.querySelectorAll(".layout-side-section")
          .forEach(el => el.classList.remove("hide-side-section"));

        document.querySelector(".workspace-navbar")
          ?.classList.add("d-none");
      }

      super.show();
    }
  };

  // Lắng nghe resize để responsive
  window.addEventListener("resize", () => {
    const ws = frappe.container.page?.workspace;
    if (ws && typeof ws.show === "function") {
      ws.show();
    }
  });
});
