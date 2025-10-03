/**
 * Báo cáo tiến độ Lệnh sản xuất tuần
 *
 * Mục đích:
 * - Hiển thị báo cáo tuần của Week Work Order (WWO) bao gồm các biểu đồ:
 *   1. Thực tế vs Kế hoạch theo ngày (bar chart)
 *   2. Lũy kế Thực tế vs Kế hoạch (line chart)
 * - Cho phép người dùng chọn WWO từ dropdown filter.
 * - Khi chọn WWO khác hoặc load báo cáo lần đầu, dữ liệu chart sẽ được cập nhật.
 *
 * Filters:
 * - "ww_order": Lịch sản xuất tuần (Select) - danh sách các WWO đã duyệt xong.
 *
 * Cấu trúc:
 * - onload(report): 
 *     + Gán tiêu đề cho báo cáo.
 *     + Lấy danh sách WWO hợp lệ qua API get_ww_orders.
 *     + Gán WWO mặc định vào filter và refresh filter.
 *     + Khởi tạo 2 chart (bar + line) với dữ liệu trống.
 *     + Ẩn các nút action không cần thiết.
 *     + Gọi refresh_charts để load dữ liệu chart mặc định.
 *
 * - refresh_charts(report):
 *     + Lấy giá trị filter hiện tại.
 *     + Nếu không có WWO được chọn, không làm gì.
 *     + Gọi song song 2 API:
 *         * get_actual_vs_planned: lấy dữ liệu Thực tế và Kế hoạch theo ngày.
 *         * get_cumulative_actual_vs_planned: lấy dữ liệu lũy kế Thực tế và Kế hoạch.
 *     + Tính giá trị y-axis tối đa đề xuất cho mỗi chart.
 *     + Cập nhật dữ liệu vào chart:
 *         * labels, datasets, suggestedMax.
 *     + Refresh report để render chart.
 *
 * Notes:
 * - Hàm on_change của filter "ww_order" sẽ gọi refresh_charts để cập nhật chart khi người dùng thay đổi WWO.
 * - Sử dụng setTimeout 100ms khi onload để đảm bảo filter đã được set default trước khi render chart.
 */
frappe.query_reports["Production Order Weekly Report"] = {
    "filters": [
        {
            "fieldname": "ww_order",
            "label": "Lịch sản xuất tuần",
            "fieldtype": "Select",
            options: [],
            on_change: function() {
                refresh_charts(frappe.query_report);
            }
        }
    ],

    onload: async function(report) {
        report.page.set_title("Báo cáo tiến độ Lệnh sản xuất tuần");

        const r = await frappe.call({
            method: "tahp.tahp.report.production_order_weekly_report.production_order_weekly_report.get_ww_orders"
        });

        if (r.message) {
            let ww_filter = report.get_filter('ww_order');
            ww_filter.df.options = r.message.options;
            ww_filter.df.default = r.message.default;
            ww_filter.refresh();


            frappe.query_report.set_filter_value('ww_order', r.message.default);
        }


        report.charts = [
            {
                title: "Thực tế vs Kế hoạch theo ngày",
                options: {
                    type: 'bar',
                    data: { labels: [], datasets: [
                        { label: "Thực tế", data: [], backgroundColor: "rgba(54, 162, 235, 0.5)", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 1 },
                        { label: "Kế hoạch", data: [], backgroundColor: "rgba(255, 99, 132, 0.5)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1 }
                    ] },
                    options: { responsive: true, plugins: { legend: { position: "top" }, title: { display: true, text: "Thực tế vs Kế hoạch theo ngày", font: { size: 16, weight: "bold" } } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
                }
            },
            {
                title: "Biểu đồ Lũy kế Thực tế vs Kế hoạch",
                options: {
                    type: 'line',
                    data: { labels: [], datasets: [
                        { label: "Lũy kế Thực tế", data: [], borderColor: "rgba(54, 162, 235, 1)", backgroundColor: "rgba(54, 162, 235, 0.2)", fill: false, tension: 0.1 },
                        { label: "Lũy kế Kế hoạch", data: [], borderColor: "rgba(255, 99, 132, 1)", backgroundColor: "rgba(255, 99, 132, 0.2)", fill: false, tension: 0.1 }
                    ] },
                    options: { responsive: true, plugins: { legend: { position: "top" }, title: { display: true, text: "Biểu đồ Lũy kế Thực tế vs Kế hoạch", font: { size: 16, weight: "bold" } } }, scales: { y: { beginAtZero: true } } }
                }
            }
        ];

        
        report.chartjsOptions = { number_per_row: 2 };

        report.page.wrapper.find(".standard-actions").css("display", "none");
        report.page.wrapper.find(".custom-actions.hidden-xs.hidden-md").css("display", "none");

        setTimeout(() => {
            refresh_charts(report);
        }, 100);
       
    },
    get_datatable_options(options) {
        return { 
            ...options, 
             title: '<div style="text-align: left; font-size: clamp(18px, 1.5vw, 22px); margin-left: 10px ; font-weight: 500;">Thống kê sản lượng:</div>' 
        }
    }
};

async function refresh_charts(report) {
    
    const filters = frappe.query_report.get_filter_values();
    
    if (!filters.ww_order) {
        return;
    }

    const [r1, r2] = await Promise.all([
        frappe.call({
            method: "tahp.tahp.report.production_order_weekly_report.production_order_weekly_report.get_actual_vs_planned",
            args: { filters: filters }
        }),
        frappe.call({
            method: "tahp.tahp.report.production_order_weekly_report.production_order_weekly_report.get_cumulative_actual_vs_planned",
            args: { filters: filters }
        })
    ]);

    const labels1 = r1.message.labels || [];
    const actual = r1.message.actual || [];
    const planned = r1.message.planned || [];
    const maxStacked = labels1.map((_, i) => (actual[i] || 0) + (planned[i] || 0));
    const suggestedMax1 = maxStacked.length > 0 ? Math.max(...maxStacked) * 1.1 : 100;

    const labels2 = r2.message.labels || [];
    const cumulative_actual = r2.message.cumulative_actual || [];
    const cumulative_planned = r2.message.cumulative_planned || [];
    const max2 = Math.max(...cumulative_actual, ...cumulative_planned);
    const suggestedMax2 = max2 > 0 ? max2 * 1.1 : 100;

    report.charts[0].options.data.labels = labels1;
    report.charts[0].options.data.datasets[0].data = actual;
    report.charts[0].options.data.datasets[1].data = planned;
    report.charts[0].options.options.scales.y.suggestedMax = suggestedMax1;

    report.charts[1].options.data.labels = labels2;
    report.charts[1].options.data.datasets[0].data = cumulative_actual;
    report.charts[1].options.data.datasets[1].data = cumulative_planned;
    report.charts[1].options.options.scales.y.suggestedMax = suggestedMax2;

    report.refresh();
}