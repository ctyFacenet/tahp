document.addEventListener('DOMContentLoaded', () => {
  const onFrappeApplication = () => {
    if (window.frappe && window.frappe.app) {
      // Store the original logout method if needed
      const originalLogout = frappe.app.logout;

      frappe.app.logout = function () {
        var me = this;
        me.logged_out = true;
        return frappe.call({
          method: "logout",
          callback: function (r) {
            if (r.exc) {
              console.error("Logout error:", r.exc);
              return;
            }
            // Redirect to the desired URL, e.g., /login
            window.location.href = "/login?redirect-to=%2Fapp%2Fmodern-menu#login";
          },
        });
      };
    } else {
      // If frappe is not yet available, retry after a short delay
      setTimeout(onFrappeApplication, 100);
    }
  };

  onFrappeApplication();
});