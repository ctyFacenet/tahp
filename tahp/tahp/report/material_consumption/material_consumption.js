frappe.query_reports["Material Consumption"] = {
    "filters": [
        {
            "fieldname": "manufacturing_category",
            "label": __("Hệ"),
            "fieldtype": "Link",
            "options": "Manufacturing Category",
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_filter_change();
            }
        },
        {
            "fieldname": "from_date",
            "label": __("Từ ngày"),
            "fieldtype": "Date",
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_date_range_change();
            }
        },
        {
            "fieldname": "to_date",
            "label": __("Đến ngày"),
            "fieldtype": "Date",
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_date_range_change();
            }
        },
        {
            "fieldname": "week",
            "label": __("Tuần"),
            "fieldtype": "Date",
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_week_change();
            }
        },
        {
            "fieldname": "month",
            "label": __("Tháng"),
            "fieldtype": "Select",
            "options": ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_month_year_change();
            }
        },
        {
            "fieldname": "year",
            "label": __("Năm"),
            "fieldtype": "Int",
            "default": new Date().getFullYear(),
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_month_year_change();
            }
        },
    ],

    get_datatable_options(options) {
        return { ...options, freezeIndex: 4};
    },
    
    "onload": function(report) {
        // if (window.ChartDataLabels) {
        //     try {
        //         // Đăng ký toàn cục cho tất cả các chart
        //         Chart.register(window.ChartDataLabels);
        //     } catch (e) {
        //         // Có thể plugin đã được đăng ký, bỏ qua lỗi
        //         console.warn("ChartDataLabels đã được đăng ký.", e);
        //     }
        // }

        setTimeout(() => {
            // if (!this.isDrawing) {
                this.draw_chart();
            //}
        }, 500);

        let previous_values = {
            from_date: report.get_filter_value("from_date"),
            to_date: report.get_filter_value("to_date"),
            week: report.get_filter_value("week"),
            month: report.get_filter_value("month"),
            year: report.get_filter_value("year")
        };

        const on_date_cleared_handler = (fieldname) => {
            const new_value = report.page.fields_dict[fieldname].get_value();
            const old_value = previous_values[fieldname];
            if (old_value && !new_value) {
                report.refresh();
                setTimeout(() => {
                    if (!this.isDrawing) {
                        this.draw_chart();
                    }
                }, 500);
            }
            previous_values[fieldname] = new_value;
        };

        report.page.fields_dict.from_date.$input.on('change', () => on_date_cleared_handler("from_date"));
        report.page.fields_dict.to_date.$input.on('change', () => on_date_cleared_handler("to_date"));
        report.page.fields_dict.week.$input.on('change', () => on_date_cleared_handler("week"));
        report.page.fields_dict.month.$input.on('change', () => on_date_cleared_handler("month"));
        report.page.fields_dict.year.$input.on('change', () => on_date_cleared_handler("year"));

        let resizeTimeout;
        $(window).on('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                    this.draw_chart();
            }, 300);
        });
    },

    "handle_filter_change": function() {
        frappe.query_report.refresh();
        setTimeout(() => {
                this.draw_chart();
            this.override_report_title(frappe.query_report);
        }, 500);
    },

    "handle_date_range_change": function() {
        const from_date = frappe.query_report.get_filter_value("from_date");
        const to_date = frappe.query_report.get_filter_value("to_date");
        
        if (from_date || to_date) {
            frappe.query_report.set_filter_value("week", "", false);
            frappe.query_report.set_filter_value("month", "", false);
        }
        
        frappe.query_report.refresh();
        setTimeout(() => {
            if (!this.isDrawing) {
                this.draw_chart();
            }
            this.override_report_title(frappe.query_report);
        }, 500);
    },

    "handle_week_change": function() {
        const week_value = frappe.query_report.get_filter_value("week");
        
        if (week_value) {
            frappe.query_report.set_filter_value("from_date", "", false);
            frappe.query_report.set_filter_value("to_date", "", false);
            frappe.query_report.set_filter_value("month", "", false);
            
            const selected_date = frappe.datetime.str_to_obj(week_value);
            const monday = this.getMonday(selected_date);
            const sunday = this.getSunday(monday);
            
            frappe.show_alert({
                message: __(`Đã chọn tuần từ ${frappe.datetime.obj_to_str(monday)} đến ${frappe.datetime.obj_to_str(sunday)}`),
                indicator: 'blue'
            }, 5);
            
            frappe.query_report.refresh();
            setTimeout(() => {
                if (!this.isDrawing) {
                    this.draw_chart();
                }
                this.override_report_title(frappe.query_report);
            }, 500);
        }
    },

    "handle_month_year_change": function() {
        const month_value = frappe.query_report.get_filter_value("month");
        const year_value = frappe.query_report.get_filter_value("year");
        
        if (month_value) {
            frappe.query_report.set_filter_value("from_date", "", false);
            frappe.query_report.set_filter_value("to_date", "", false);
            frappe.query_report.set_filter_value("week", "", false);
            
            frappe.show_alert({
                message: __(`Đã chọn tháng ${month_value}/${year_value}`),
                indicator: 'green'
            }, 5);
            
            frappe.query_report.refresh();
            setTimeout(() => {
                if (!this.isDrawing) {
                    this.draw_chart();
                }
                this.override_report_title(frappe.query_report);
            }, 500);
        }
    },

    "getMonday": function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    "getSunday": function(monday) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return sunday;
    },

    "override_report_title": function(report) {
        // Thêm logic override title nếu cần
    },

    "draw_chart": function() {
        // if (this.isDrawing) return;
        // this.isDrawing = true;
        
        let existing_chart1 = Chart.getChart("myCustomChart");
        if (existing_chart1) existing_chart1.destroy();
        let existing_chart2 = Chart.getChart("mySecondChart");
        if (existing_chart2) existing_chart2.destroy();
        let existing_chart3 = Chart.getChart("percentageChart");
        if (existing_chart3) existing_chart3.destroy();
        $('.report-wrapper .chart-container').remove();
        
        const data_rows = frappe.query_report.data;
        if (!data_rows || data_rows.length === 0) {
            this.isDrawing = false;
            return;
        }

        let material_summary = this.aggregate_data_for_charts(data_rows);

        const material_summary_for_percent_chart = material_summary
            .map(m => {
                let percent = 0;
                // Chỉ tính % nếu có định mức
                if (m.total_planned_qty > 0) {
                    percent = (m.total_actual_qty / m.total_planned_qty) * 100;
                } 
                // Nếu không có định mức mà có tiêu hao, coi như 0% (hoặc bạn có thể lọc bỏ)
                
                return {
                    ...m, // Giữ nguyên (material_name, uom, total_actual_qty, total_planned_qty)
                    percent_vs_planned: percent
                };
            })
            // Lọc ra những NVL có tiêu hao hoặc có định mức
            .filter(m => m.total_actual_qty > 0)
            // Sắp xếp: NVL nào vượt định mức nhiều nhất sẽ lên đầu
            .sort((a, b) => b.percent_vs_planned - a.percent_vs_planned);

        this.draw_percentage_chart(material_summary_for_percent_chart);

        material_summary = material_summary.filter(material => material.total_actual_qty > 0);
    },

    "aggregate_data_for_charts": function(data_rows) {
        const material_map = {};
        
        data_rows.forEach(row => {
            const material_name = row.material_name;
            const uom = row.uom;
            const key = material_name;
            
            if (!material_map[key]) {
                material_map[key] = {
                    material_name: material_name,
                    uom: uom,
                    total_actual_qty: 0,
                    total_planned_qty: 0
                };
            }
            
            material_map[key].total_actual_qty += (row.total_actual_qty || 0);
            material_map[key].total_planned_qty += (row.total_planned_qty || 0);
        });
        
        return Object.values(material_map);
    },

    "draw_percentage_chart": function(material_summary_data) {
        if (!material_summary_data || material_summary_data.length === 0) return;

        // Tạo 1 thẻ div để chứa biểu đồ
        const chartContainer = $(`<div class="chart-container chart-3" style="position: relative; height: 400px; width: 100%; margin-bottom: 40px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 600px; width: 100%; height: 100%;">
                <canvas id="percentageChart" style="width: 100%; height: 100%;"></canvas>
            </div>
        </div>`);
        $('.report-wrapper').prepend(chartContainer);

        const labels = material_summary_data.map(d => `${d.material_name} (${d.uom})`);
        
        // === BẢNG MÀU CỦA BẠN ===
        const material_colors = [
            { bg: 'rgba(99, 102, 241, 0.5)', border: 'rgba(99, 102, 241, 1)' }, 
            { bg: 'rgba(14, 165, 233, 0.5)', border: 'rgba(14, 165, 233, 1)' }, 
            { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' }, 
            { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' }, 
            { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 1)' }, 
            { bg: 'rgba(251, 207, 232, 0.5)', border: 'rgba(251, 207, 232, 1)' }, 
            { bg: 'rgba(34, 211, 238, 0.5)', border: 'rgba(34, 211, 238, 1)' }, 
            { bg: 'rgba(132, 204, 22, 0.5)', border: 'rgba(132, 204, 22, 1)' }, 
            { bg: 'rgba(59, 130, 246, 0.5)', border: 'rgba(59, 130, 246, 1)' }, 
            { bg: 'rgba(139, 69, 19, 0.5)', border: 'rgba(139, 69, 19, 1)' }, 
            { bg: 'rgba(75, 85, 99, 0.5)', border: 'rgba(75, 85, 99, 1)' }, 
            { bg: 'rgba(236, 72, 153, 0.5)', border: 'rgba(236, 72, 153, 1)' },
        ];

        // Gán màu cho từng NVL
        const background_colors = material_summary_data.map((_, index) => {
            return material_colors[index % material_colors.length].bg;
        });
        const border_colors = material_summary_data.map((_, index) => {
            return material_colors[index % material_colors.length].border;
        });

        // Plugin để vẽ đường 100% (Định mức)
        const referenceLinePlugin = {
            id: 'referenceLinePlugin',
            afterDraw(chart) {
                // ... (code plugin này giữ nguyên như cũ) ...
                const { ctx, scales: { y }, chartArea } = chart;
                const yValue = y.getPixelForValue(100);
                if (yValue >= chartArea.top && yValue <= chartArea.bottom) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(244, 63, 94, 1)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left, yValue);
                    ctx.lineTo(chartArea.right, yValue);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(244, 63, 94, 1)';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'right';
                    ctx.fillText('Định mức (100%)', chartArea.right - 10, yValue - 8);
                    ctx.restore();
                }
            }
        };

        // Thêm plugin này vào code của bạn
        const dataLabelsPlugin = {
            id: 'dataLabelsPlugin',
            afterDatasetsDraw(chart) {
                const { ctx, data, scales: { x, y } } = chart;
                
                ctx.save();
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = '#374151'; // Màu chữ
                
                data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        const label = `${value.toFixed(1)}%`;
                        
                        // Vị trí x, y để vẽ text
                        const xPos = bar.x;
                        const yPos = bar.y - 5; // Cách đỉnh cột 5px
                        
                        ctx.fillText(label, xPos, yPos);
                    });
                });
                
                ctx.restore();
            }
        };

        const ctx = document.getElementById('percentageChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    // Label này sẽ không còn hiển thị ở chú thích nữa
                    label: 'Tỷ lệ tiêu hao', 
                    data: material_summary_data.map(d => d.percent_vs_planned),
                    backgroundColor: background_colors,
                    borderColor: border_colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } },
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function(value) { return value + '%'; } },
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Biểu đồ Tỷ lệ Tiêu hao Thực tế / Định mức (%)',
                        font: { size: 18 }
                    },
                    // === ⭐️ SỬA LỖI CHÚ THÍCH TẠI ĐÂY ⭐️ ===
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            // Hàm này sẽ tạo chú thích dựa trên TÊN và MÀU của từng NVL
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const labels = data.labels;
                                    const bgColors = data.datasets[0].backgroundColor;
                                    const borderColors = data.datasets[0].borderColor;
                                    
                                    return labels.map((label, index) => {
                                        return {
                                            text: label, // Tên NVL (ví dụ: Gyps (Tấn))
                                            fillStyle: bgColors[index], // Màu nền của NVL đó
                                            strokeStyle: borderColors[index], // Màu viền của NVL đó
                                            lineWidth: 1,
                                            hidden: false,
                                            index: index
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    // === KẾT THÚC SỬA LỖI ===
                    tooltip: {
                        // Tooltip vẫn hoạt động như cũ
                        callbacks: {
                            title: function(tooltipItems) {
                                return tooltipItems[0].label;
                            },
                            label: function(context) {
                                const dataIndex = context.dataIndex;
                                const material = material_summary_data[dataIndex];
                                const percent = material.percent_vs_planned;
                                const actual = material.total_actual_qty;
                                const planned = material.total_planned_qty;
                                const uom = material.uom;
                                return [
                                    `Tỷ lệ: ${percent.toLocaleString('vi-VN', {maximumFractionDigits: 1})}%`,
                                    `Thực tế: ${actual.toLocaleString('vi-VN', {maximumFractionDigits: 1})} ${uom}`,
                                    `Định mức: ${planned.toLocaleString('vi-VN', {maximumFractionDigits: 1})} ${uom}`
                                ];
                            }
                        }
                    }
                }
            },
            plugins: [referenceLinePlugin, dataLabelsPlugin]
        });
    },
};