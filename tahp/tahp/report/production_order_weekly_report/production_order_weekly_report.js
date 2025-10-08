/**
 * Báo cáo tiến độ Lệnh sản xuất tuần
 *
 * Mục đích:
 * - Hiển thị báo cáo tuần của Week Work Order (WWO) bao gồm các biểu đồ:
 *   1. Thực tế vs Kế hoạch theo ngày - PHÂN TÁCH THEO TỪNG ITEM (grouped bar chart)
 *   2. Lũy kế Thực tế vs Kế hoạch (line chart)
 * - Cho phép người dùng chọn WWO từ dropdown filter.
 * - Khi chọn WWO khác hoặc load báo cáo lần đầu, dữ liệu chart sẽ được cập nhật.
 *
 * Filters:
 * - "ww_order": Lịch sản xuất tuần (Select) - danh sách các WWO đã duyệt xong.
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
                title: "Biểu đồ sản lượng theo ngày",
                options: {
                    type: 'bar',
                    data: { 
                        labels: [], 
                        datasets: [] 
                    },
                    options: { 
                        responsive: true, 
                        plugins: { 
                            legend: { position: "top" }, 
                            title: { 
                                display: true, 
                                text: "Biểu đồ sản lượng theo ngày", 
                                font: { size: 16, weight: "bold" } 
                            } 
                        }, 
                        scales: { 
                            x: { 
                                stacked: true, 
                                categoryPercentage: 0.8,
                                barPercentage: 1.0,
                                
                            },
                            y: { 
                                stacked: false, 
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value, index, ticks) {
                                        return index === ticks.length - 1 ? '(Tấn)' : value.toLocaleString('en-US');
                                    }
                                }
                            } 
                        } 
                    }
                }
            },
            {
                title: "Biểu đồ lũy kế của mặt hàng",
                options: {
                    type: 'line',
                    data: { 
                        labels: [], 
                        datasets: [] 
                    },
                    options: { 
                        responsive: true, 
                        plugins: { 
                            legend: { 
                                position: "top",
                                labels: {
                                    // usePointStyle: true,
                                    // pointStyle: 'line',
                                    boxWidth: 30,
                                    boxHeight: 1
                                }
                            },
                            title: { 
                                display: true, 
                                text: "Biểu đồ lũy kế của mặt hàng", 
                                font: { size: 16, weight: "bold" } 
                            } 
                        }, 
                        scales: { 
                            y: { 
                                beginAtZero: true,
                                suggestedMax: 100, // % từ 0-100
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            } 
                        } 
                    }
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

// Màu sắc cho các items (có thể mở rộng)
const ITEM_COLORS = [
    { bg: "rgba(54, 162, 235, 0.6)", border: "rgba(54, 162, 235, 1)" },   // Blue
    { bg: "rgba(255, 99, 132, 0.6)", border: "rgba(255, 99, 132, 1)" },   // Red
    { bg: "rgba(75, 192, 192, 0.6)", border: "rgba(75, 192, 192, 1)" },   // Green
    { bg: "rgba(255, 206, 86, 0.6)", border: "rgba(255, 206, 86, 1)" },   // Yellow
    { bg: "rgba(153, 102, 255, 0.6)", border: "rgba(153, 102, 255, 1)" }, // Purple
    { bg: "rgba(255, 159, 64, 0.6)", border: "rgba(255, 159, 64, 1)" },   // Orange
    { bg: "rgba(201, 203, 207, 0.6)", border: "rgba(201, 203, 207, 1)" }, // Grey
    { bg: "rgba(255, 99, 255, 0.6)", border: "rgba(255, 99, 255, 1)" },   // Magenta
    { bg: "rgba(0, 204, 102, 0.6)", border: "rgba(0, 204, 102, 1)" },     // Emerald
    { bg: "rgba(255, 140, 0, 0.6)", border: "rgba(255, 140, 0, 1)" },     // Dark Orange
    { bg: "rgba(100, 149, 237, 0.6)", border: "rgba(100, 149, 237, 1)" }, // Cornflower Blue
    { bg: "rgba(220, 20, 60, 0.6)", border: "rgba(220, 20, 60, 1)" },     // Crimson
    { bg: "rgba(64, 224, 208, 0.6)", border: "rgba(64, 224, 208, 1)" },   // Turquoise
    { bg: "rgba(218, 112, 214, 0.6)", border: "rgba(218, 112, 214, 1)" }, // Orchid
    { bg: "rgba(255, 215, 0, 0.6)", border: "rgba(255, 215, 0, 1)" },     // Gold
    { bg: "rgba(106, 90, 205, 0.6)", border: "rgba(106, 90, 205, 1)" },   // Slate Blue
    { bg: "rgba(255, 105, 180, 0.6)", border: "rgba(255, 105, 180, 1)" }, // Hot Pink
    { bg: "rgba(32, 178, 170, 0.6)", border: "rgba(32, 178, 170, 1)" },   // Light Sea Green
    { bg: "rgba(219, 112, 147, 0.6)", border: "rgba(219, 112, 147, 1)" }, // Pale Violet Red
    { bg: "rgba(70, 130, 180, 0.6)", border: "rgba(70, 130, 180, 1)" },   // Steel Blue
];

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
    const itemsData = r1.message.items || {};
    
    
    const datasets = [];
    let colorIndex = 0;
    let maxValue = 0;

    Object.keys(itemsData).forEach((itemName) => {
        const itemColor = ITEM_COLORS[colorIndex % ITEM_COLORS.length];
        const stackId = `stack-${colorIndex}`; 
       
        datasets.push({
            label: `${itemName} - Thực tế`,
            data: itemsData[itemName].actual || [],
            backgroundColor: itemColor.bg,
            borderColor: itemColor.border,
            borderWidth: 1,
            stack: stackId, // Gán cùng stack
            barPercentage: 1.0,
            categoryPercentage: 0.8
        });
        
       
        const lighterColor = itemColor.bg.replace('0.6', '0.3');
        datasets.push({
            label: `${itemName} - Kế hoạch`,
            data: itemsData[itemName].planned || [],
            backgroundColor: lighterColor,
            borderColor: itemColor.border,
            borderWidth: 1,
            borderDash: [5, 5], 
            stack: stackId, 
            barPercentage: 1.0,
            categoryPercentage: 0.8
        });

        // Tìm giá trị max để set suggestedMax
        const itemMax = Math.max(
            ...itemsData[itemName].actual,
            ...itemsData[itemName].planned
        );
        maxValue = Math.max(maxValue, itemMax);
        
        colorIndex++;
    });

    const suggestedMax1 = maxValue > 0 ? maxValue * 1.2 : 100;

    report.charts[0].options.data.labels = labels1;
    report.charts[0].options.data.datasets = datasets;
    report.charts[0].options.options.scales.y.suggestedMax = suggestedMax1;

    //
    const labels2 = r2.message.labels || [];
    const itemsData2 = r2.message.items || {};

    const datasets2 = [];
    let colorIndex2 = 0;
    let maxPercent = 0;  // Thêm biến này

    Object.keys(itemsData2).forEach((itemName) => {
        const itemColor = ITEM_COLORS[colorIndex2 % ITEM_COLORS.length];
        const percentData = itemsData2[itemName].percent_cumulative || [];
        
        datasets2.push({
            label: `${itemName} - % Lũy kế`,
            data: percentData,
            borderColor: itemColor.border,
            backgroundColor: itemColor.bg,
            fill: false,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
        });
        
        // Tìm % cao nhất
        const itemMaxPercent = Math.max(...percentData);
        maxPercent = Math.max(maxPercent, itemMaxPercent);
        
        colorIndex2++;
    });

    // Tính suggestedMax động cho chart 2
    const suggestedMax2 = maxPercent > 0 ? Math.min(maxPercent * 1.1, 110) : 100;

    report.charts[1].options.data.labels = labels2;
    report.charts[1].options.data.datasets = datasets2;
    report.charts[1].options.options.scales.y.suggestedMax = suggestedMax2;  // Thêm dòng này

    report.refresh();
}