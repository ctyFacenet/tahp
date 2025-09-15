
const workspaceCache = {};

function getItemIcon(item) {
  if ((item.link_type || item.type) === "Report") return "📊";
  if ((item.link_type || item.type) === "DocType") return "🗂️";
  if ((item.link_type || item.type) === "Page") return "📄";
  if ((item.link_type || item.type) === "Dashboard") return "📈";
  return "📁";
}

function getRoute(item) {
  const type = (item.link_type || item.type || "").toLowerCase();

  if (!item.link_to) return "#";

  if (type === "doctype") {
    return `/app/${item.link_to.toLowerCase().replace(/\s+/g, "-")}`;
  }

  if (type === "report") {
    // if (item.is_query_report) {
    return `/app/query-report/${encodeURIComponent(item.link_to).replace(/\s+/g, "-")}`;
    // } else {
    //   return `/app/report/${(item.doctype || "").toLowerCase().replace(/\s+/g, "-")}/${encodeURIComponent(item.link_to).replace(/\s+/g, "-")}`;
    // }
  }

  if (type === "page") {
    return `/app/page/${item.link_to.toLowerCase().replace(/\s+/g, "-")}`;
  }

  if (type === "dashboard") {
    return `/app/dashboard-view/${item.link_to.toLowerCase().replace(/\s+/g, "-")}`;
  }

  // fallback
  return `/app/${item.link_to.toLowerCase().replace(/\s+/g, "-")}`;
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

function renderDropdownContent(dropdown, page) {
  dropdown.innerHTML = "";

  if (Array.isArray(page.shortcuts) && page.shortcuts.length > 0) {
    let shortcutsHeader = document.createElement("div");
    shortcutsHeader.classList.add("dropdown-header");
    shortcutsHeader.textContent = "Your Shortcuts";
    dropdown.appendChild(shortcutsHeader);

    page.shortcuts.forEach(item => {
      let a = document.createElement("a");
      a.href = getRoute(item);
      a.innerHTML = `${getItemIcon(item)} ${item.label}`;
      dropdown.appendChild(a);
    });
  }

  if (Array.isArray(page.links) && page.links.length > 0) {
    let currentGroup;

    page.links.forEach(item => {
      if (item.type === "Card Break") {
        currentGroup = document.createElement("div");
        currentGroup.classList.add("group");

        let header = document.createElement("div");
        header.classList.add("dropdown-header");
        header.textContent = item.label || "Danh mục";

        currentGroup.appendChild(header);
        dropdown.appendChild(currentGroup);
      } else {
        let a = document.createElement("a");
        a.href = getRoute(item);
        a.innerHTML = `${getItemIcon(item)} ${item.label}`;

        if (currentGroup) {
          currentGroup.appendChild(a);
        } else {
          dropdown.appendChild(a);
        }
      }
    });
  }

}
async function loadWorkspaceData(workspaceName, dropdown) {

  if (workspaceCache[workspaceName]) {
    renderDropdownContent(dropdown, workspaceCache[workspaceName]);
    return;
  }

  dropdown.innerHTML = `<div style="padding:8px 12px;color:#888;">Đang tải...</div>`;

  try {
    let response = await frappe.call({
      method: "tahp.utils.get_workspace.get_workspace",
      args: {}
    });

    if (Array.isArray(response.message)) {

      function slugify(str) {
        return str.toLowerCase().replace(/\s+/g, "-");
      }

      const page = response.message.find(
        p => slugify(p.name) === slugify(workspaceName)
      );
      if (page) {
        workspaceCache[workspaceName] = page;
        renderDropdownContent(dropdown, page);
      }
    }
  } catch (e) {
    console.error("❌ Error:", e);
    dropdown.innerHTML = `<div style="padding:8px 12px;color:#888;">Lỗi tải menu</div>`;
  }
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
      console.log("🛑 Observer stopped - Dropdowns initialized");
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
