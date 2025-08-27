frappe.ready(() => {
  frappe.call({
    method: "frappe.desk.desktop.get_workspace_sidebar_items",
    callback: function (r) {
      if (!r.message) return;

      let container = document.getElementById("workspace-grid");
      container.innerHTML = "";

      r.message.forEach(ws => {
        let card = document.createElement("a");
        card.href = "/app/" + ws.name;
        card.className = "workspace-card";
        card.innerHTML = `
                    <div class="workspace-icon">
                        <i class="fa ${ws.icon || 'fa-folder'}"></i>
                    </div>
                    <div class="workspace-title">${ws.title}</div>
                `;
        container.appendChild(card);
      });
    }
  });
});
