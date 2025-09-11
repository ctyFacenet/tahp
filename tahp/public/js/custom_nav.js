function stripHtml(html) {
  let tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function createDropdown(wrapper) {
  let dropdown = wrapper.querySelector(".workspace-dropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.classList.add("workspace-dropdown");
    wrapper.appendChild(dropdown);
  }
  return dropdown;
}

const workspaceCache = {};

function renderDropdownContent(dropdown, content) {
  dropdown.innerHTML = "";

  if (Array.isArray(content)) {
    content.forEach(item => {
      if (item.type === "header") {
        let header = document.createElement("div");
        header.classList.add("dropdown-header");
        header.textContent = stripHtml(item.data.text || "");
        dropdown.appendChild(header);
      }

      if (item.type === "card") {
        let a = document.createElement("a");
        a.href = `/app/${item.data.card_name}`;
        a.innerHTML = `🗂️ ${item.data.card_name}`;
        dropdown.appendChild(a);
      }
    });
  }

  if (!dropdown.innerHTML.trim()) {
    dropdown.innerHTML = `<div style="padding:8px 12px;color:#888;">Không có menu</div>`;
  }
}

function loadWorkspaceData(workspaceName, dropdown) {
  if (workspaceCache[workspaceName]) {
    console.log(`⚡ Lấy từ cache cho workspace: ${workspaceName}`);
    renderDropdownContent(dropdown, workspaceCache[workspaceName]);
    return;
  }

  dropdown.innerHTML = `<div style="padding:8px 12px;color:#888;">Đang tải...</div>`;

  frappe.call({
    method: "frappe.desk.desktop.get_workspace_sidebar_items",
    args: { workspace: workspaceName },
    callback: function (r) {
      console.log("✅ Submenu data received for", workspaceName, r);

      if (r.message && r.message.pages) {
        const page = r.message.pages.find(
          p => p.name.toLowerCase() === workspaceName.toLowerCase()
        );

        if (page && page.content) {
          let content = page.content;

          if (typeof content === "string") {
            try {
              content = JSON.parse(content);
            } catch (e) {
              console.error("❌ Parse content error:", e, content);
              content = [];
            }
          }

          workspaceCache[workspaceName] = content;
          renderDropdownContent(dropdown, content);
        }
      }
    }
  });
}

function initDropdowns() {
  const workspaces = document.querySelectorAll(".workspace-block");
  if (!workspaces.length) return;

  workspaces.forEach(ws => {
    const wrapper = ws.closest(".workspace-wrapper");
    if (!wrapper) return;

    const workspaceName = ws.getAttribute("href").replace("/app/", "").trim();
    const dropdown = createDropdown(wrapper);

    ws.addEventListener("mouseenter", () => {
      loadWorkspaceData(workspaceName, dropdown);
      const rect = ws.getBoundingClientRect();

      dropdown.style.position = "fixed";
      dropdown.style.top = rect.bottom + "px";
      dropdown.style.left = rect.left + "px";
      dropdown.style.transform = "none";
    });

  });
}

document.addEventListener("DOMContentLoaded", function () {
  const observer = new MutationObserver((mutations, obs) => {
    if (document.querySelectorAll(".workspace-block").length) {
      initDropdowns();
      obs.disconnect();
      console.log("🛑 Observer stopped");
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
