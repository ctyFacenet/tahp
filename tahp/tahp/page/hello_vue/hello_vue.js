frappe.pages['hello-vue'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Báo cáo thống kê',
    single_column: true,
  });

  const head = document.getElementsByTagName("head")[0];
  if (!document.querySelector("link[href='/assets/tahp/css/build.css']")) {
    const tailwindLink = document.createElement("link");
    tailwindLink.rel = "stylesheet";
    tailwindLink.href = "/assets/tahp/css/build.css";
    tailwindLink.onload = () => console.log("✅ Tailwind build.css loaded");
    tailwindLink.onerror = () => {
      console.warn("⚠️ build.css not found, fallback to CDN");
      const cdnScript = document.createElement("script");
      cdnScript.src = "https://cdn.tailwindcss.com";
      head.appendChild(cdnScript);
    };
    head.appendChild(tailwindLink);
  }

  if (frappe.boot.developer_mode) {
    frappe.hot_update ??= [];
    frappe.hot_update.push(() => load_vue(wrapper));
  }
};

frappe.pages['hello-vue'].on_page_show = (wrapper) => load_vue(wrapper);

async function load_vue(wrapper) {
  const $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();
  await frappe.require('hello_vue.bundle.js');
  frappe.hello_vue_app = frappe.ui.setup_vue($parent);
}
