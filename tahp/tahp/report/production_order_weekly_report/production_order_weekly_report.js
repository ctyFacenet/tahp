frappe.query_reports["Production Order Weekly Report"] = {
	onload: function(report) {
        if (report.report_name !== "Production Order Weekly Report") return;
        report.page.set_title("Production Order Weekly Report")
      
		draw_actual_vs_planned_chart();
        // draw_cumulative_chart();
        
        

        // Ẩn 2 nút Action với ...
        report.page.wrapper.find(".standard-actions").css("display", "none");
        report.page.wrapper.find(".custom-actions.hidden-xs.hidden-md").css("display", "none");

	}
    

        
};


// Chart 1: Thực tế vs Kế hoạch
async function draw_actual_vs_planned_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let reportWrapper = document.querySelector(".report-wrapper");
    if (!reportWrapper) return;

    // Xóa chart cũ nếu có
    let existingChart = Chart.getChart("chart_actual_vs_planned");
    if (existingChart) existingChart.destroy();

    // Tạo canvas
    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper");
    wrapper.style.width = "100%";
    wrapper.style.marginBottom = "40px";
    reportWrapper.prepend(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "chart_actual_vs_planned";
    wrapper.appendChild(canvas);

    try {
        const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};

        const r = await new Promise((resolve, reject) => {
            frappe.call({
                method: "tahp.tahp.report.production_order_weekly_report.production_order_weekly_report.get_actual_vs_planned",
                args: { filters: filters },
                callback: resolve,
                error: reject
            });
        });

        console.log("Dữ liệu Actual vs Planned:", r.message); // debug

        if (!r.message) return;

        const labels = r.message.labels || r.message.map(row => row.date || row.idx);
        const actual = r.message.actual || r.message.map(row => row.actual);
        const planned = r.message.planned || r.message.map(row => row.planned);

        const ctx = canvas.getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    { label: "Thực tế", data: actual, backgroundColor: "rgba(54, 162, 235, 0.7)" },
                    { label: "Kế hoạch", data: planned, backgroundColor: "rgba(255, 99, 132, 0.7)" }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "top" },
                    title: {
                        display: true,
                        text: "Thực tế vs Kế hoạch theo ngày",
                        font: { size: 16, weight: "bold" }
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    } catch (err) {
        console.error("Lỗi chart Actual vs Planned:", err);
    }
}


// Chart 2: Lũy kế
async function draw_cumulative_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let reportWrapper = document.querySelector(".form-message");
    if (!reportWrapper) return;

    // Wrapper
    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper");
    wrapper.style.width = "100%";
    wrapper.style.marginBottom = "40px";
    reportWrapper.appendChild(wrapper);

    // Canvas
    let canvas = document.createElement("canvas");
    canvas.id = "chart_cumulative";
    wrapper.appendChild(canvas);

    try {
        // const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};

        // Lấy dữ liệu
        const r = await new Promise((resolve, reject) => {
            frappe.call({
                method: "tahp.tahp.report.production_order_weekly_report.production_order_weekly_report.get_cumulative_actual_vs_planned",
                // args: { filters: filters },
                args: { },

                callback: resolve,
                error: reject
            });
        });

        if (r.message && r.message.labels) {
            const labels = r.message.labels;
            const cumulative_actual = r.message.cumulative_actual;
            const cumulative_planned = r.message.cumulative_planned;

            const ctx = canvas.getContext("2d");
            new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Lũy kế Thực tế",
                            data: cumulative_actual,
                            borderColor: "rgba(54, 162, 235, 1)",
                            backgroundColor: "rgba(54, 162, 235, 0.2)",
                            fill: false,
                            tension: 0.1
                        },
                        {
                            label: "Lũy kế Kế hoạch",
                            data: cumulative_planned,
                            borderColor: "rgba(255, 99, 132, 1)",
                            backgroundColor: "rgba(255, 99, 132, 0.2)",
                            fill: false,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "top" },
                        title: {
                            display: true,
                            text: "Biểu đồ Lũy kế Thực tế vs Kế hoạch",
                            font: { size: 16, weight: "bold" }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Lỗi chart Lũy kế:", err);
    }
}
