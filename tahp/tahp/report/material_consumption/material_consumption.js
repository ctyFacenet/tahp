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
        return { ...options, freezeIndex: 4, headerBackground: "rgb(205, 222, 238)"};
    },
    
    "onload": function(report) {
        setTimeout(() => {
            this.draw_chart();
        }, 500);

        let previous_values = {
            from_date: report.get_filter_value("from_date"),
            to_date: report.get_filter_value("to_date"),
            week: report.get_filter_value("week"),
            month: report.get_filter_value("month"),
            year: report.get_filter_value("year")
        };

        // Create a single, reusable handler for date changes.
        const on_date_cleared_handler = (fieldname) => {
            const new_value = report.page.fields_dict[fieldname].get_value();
            const old_value = previous_values[fieldname];

            // Core Logic: Trigger refresh only if the field was cleared.
            if (old_value && !new_value) {
                report.refresh();
            }

            // Update the stored value to the new value for the next event.
            previous_values[fieldname] = new_value;
        };

        // Attach the custom handler to all filter inputs.
        report.page.fields_dict.from_date.$input.on('change', () => on_date_cleared_handler("from_date"));
        report.page.fields_dict.to_date.$input.on('change', () => on_date_cleared_handler("to_date"));
        report.page.fields_dict.week.$input.on('change', () => on_date_cleared_handler("week"));
        report.page.fields_dict.month.$input.on('change', () => on_date_cleared_handler("month"));
        report.page.fields_dict.year.$input.on('change', () => on_date_cleared_handler("year"));
    },

    "handle_filter_change": function() {
        // Generic filter change handler - just refresh
        frappe.query_report.refresh();
        setTimeout(() => {
            this.draw_chart();
        }, 500);
    },

    "handle_date_range_change": function() {
        // When from_date or to_date changes, clear week and month filters
        const from_date = frappe.query_report.get_filter_value("from_date");
        const to_date = frappe.query_report.get_filter_value("to_date");
        
        if (from_date || to_date) {
            // Clear other filters silently (without triggering their on_change)
            frappe.query_report.set_filter_value("week", "", false);
            frappe.query_report.set_filter_value("month", "", false);
        }
        
        frappe.query_report.refresh();
        setTimeout(() => {
            this.draw_chart();
        }, 500);
    },

    "handle_week_change": function() {
        const week_value = frappe.query_report.get_filter_value("week");
        
        if (week_value) {
            // Clear other date filters silently
            frappe.query_report.set_filter_value("from_date", "", false);
            frappe.query_report.set_filter_value("to_date", "", false);
            frappe.query_report.set_filter_value("month", "", false);
            
            // Calculate and display the week range for user reference
            const selected_date = frappe.datetime.str_to_obj(week_value);
            const monday = this.getMonday(selected_date);
            const sunday = this.getSunday(monday);
            
            // Show a message to user about the calculated week range
            frappe.show_alert({
                message: __(`Đã chọn tuần từ ${frappe.datetime.obj_to_str(monday)} đến ${frappe.datetime.obj_to_str(sunday)}`),
                indicator: 'blue'
            }, 5);
            
            // Refresh immediately after setting week
            frappe.query_report.refresh();
            setTimeout(() => {
                this.draw_chart();
            }, 500);
        }
    },

    "handle_month_year_change": function() {
        const month_value = frappe.query_report.get_filter_value("month");
        const year_value = frappe.query_report.get_filter_value("year");
        
        // Only process if month is selected (year always has a default value)
        if (month_value) {
            // Clear other date filters silently (without triggering their on_change)
            frappe.query_report.set_filter_value("from_date", "", false);
            frappe.query_report.set_filter_value("to_date", "", false);
            frappe.query_report.set_filter_value("week", "", false);
            
            // Show a message to user about the selected month/year
            frappe.show_alert({
                message: __(`Đã chọn tháng ${month_value}/${year_value}`),
                indicator: 'green'
            }, 5);
            
            // Refresh immediately after setting month
            frappe.query_report.refresh();
            setTimeout(() => {
                this.draw_chart();
            }, 500);
        }
    },

    // Helper function to get Monday of the week containing the given date
    "getMonday": function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        return new Date(d.setDate(diff));
    },

    // Helper function to get Sunday of the week (6 days after Monday)
    "getSunday": function(monday) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return sunday;
    },

    "draw_chart": function() {
        let existing_chart1 = Chart.getChart("myCustomChart");
        if (existing_chart1) existing_chart1.destroy();
        let existing_chart2 = Chart.getChart("mySecondChart");
        if (existing_chart2) existing_chart2.destroy();
        $('.report-wrapper .chart-container').remove();
        
        const data_rows = frappe.query_report.data;
        if (!data_rows || data_rows.length === 0) return;

        // data summary by ingredients to draw chart
        const material_summary = this.aggregate_data_for_charts(data_rows);

        // Vẽ biểu đồ thứ nhất trước để tạo material_color_map
        this.draw_first_chart(material_summary);
        
        // Vẽ biểu đồ thứ hai sau khi đã có material_color_map
        setTimeout(() => {
            this.draw_second_chart(data_rows);
        }, 100);
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
        
        const result = Object.values(material_map).map(item => {
            const total_actual = item.total_actual_qty;
            const total_planned = item.total_planned_qty;
            
            const over_limit = Math.max(0, total_actual - total_planned);
            
            const within_limit = total_actual - over_limit;
            
            return {
                material_name: item.material_name,
                uom: item.uom,
                within_limit_qty: within_limit,
                over_limit_qty: over_limit
            };
        });
        
        return result;
    },

    "draw_first_chart": function(material_summary) {
        const bar_thickness = 40;
        const chart_padding = 120;
        const num_bars = material_summary.length;
        let calculated_height = (num_bars * bar_thickness) + chart_padding;
        if (calculated_height < 300) {
            calculated_height = 200;
        }

        const chartContainer = $(`<div class="chart-container chart-1" style="height: 200px; margin-bottom: 20px;">
            <canvas id="myCustomChart"></canvas>
        </div>`);
        $('.report-wrapper').prepend(chartContainer);
        
        // Tạo custom legend container
        const legendContainer = $(`<div class="custom-legend" style="margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; max-height: 150px; overflow-y: auto;"></div>`);
        $('.chart-container.chart-1').after(legendContainer);

        const labels = material_summary.map(row => `${row.material_name} (${row.uom})`);

        // Tạo bảng màu chung cho tất cả nguyên vật liệu (loại bỏ màu đỏ để tránh trùng với "Vượt định mức")
        const material_colors = [
            { bg: 'rgba(99, 102, 241, 0.5)', border: 'rgba(99, 102, 241, 1)' },      // Indigo
            { bg: 'rgba(14, 165, 233, 0.5)', border: 'rgba(14, 165, 233, 1)' },      // Sky
            { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' },      // Purple
            { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' },       // Amber
            { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 1)' },        // Green
            { bg: 'rgba(251, 207, 232, 0.5)', border: 'rgba(251, 207, 232, 1)' },    // Pink-200
            { bg: 'rgba(34, 211, 238, 0.5)', border: 'rgba(34, 211, 238, 1)' },      // Cyan-400
            { bg: 'rgba(132, 204, 22, 0.5)', border: 'rgba(132, 204, 22, 1)' },      // Lime-400
            { bg: 'rgba(59, 130, 246, 0.5)', border: 'rgba(59, 130, 246, 1)' },      // Blue-500
            { bg: 'rgba(139, 69, 19, 0.5)', border: 'rgba(139, 69, 19, 1)' },        // Brown
            { bg: 'rgba(75, 85, 99, 0.5)', border: 'rgba(75, 85, 99, 1)' },          // Gray-600
            { bg: 'rgba(236, 72, 153, 0.5)', border: 'rgba(236, 72, 153, 1)' },      // Pink-500
        ];

        // Tạo map màu cho từng nguyên vật liệu
        const material_color_map = {};
        material_summary.forEach((material, index) => {
            material_color_map[material.material_name] = material_colors[index % material_colors.length];
        });

        // Lưu map màu vào object để sử dụng ở biểu đồ thứ hai
        this.material_color_map = material_color_map;

        // Tạo datasets cho từng nguyên vật liệu với màu riêng biệt
        const datasets = [];
        
        material_summary.forEach((material, index) => {
            const color_info = material_color_map[material.material_name];
            const material_name_with_unit = `${material.material_name} (${material.uom})`;
            
            // Dataset cho từng nguyên vật liệu với dữ liệu đầy đủ
            datasets.push({
                label: material_name_with_unit,
                data: Array(material_summary.length).fill(null).map((_, i) => i === index ? material.within_limit_qty : null),
                backgroundColor: color_info.bg,
                borderColor: color_info.border,
                borderWidth: 2,
                stack: 'main'
            });
        });

        // Thêm dataset cho phần vượt giới hạn (nếu có)
        const has_over_limit = material_summary.some(material => material.over_limit_qty > 0);
        if (has_over_limit) {
            datasets.push({
                label: 'Vượt định mức',
                data: material_summary.map(material => material.over_limit_qty),
                backgroundColor: 'rgba(244, 63, 94, 0.5)',
                borderColor: 'rgba(244, 63, 94, 1)',
                borderWidth: 2,
                stack: 'main'
            });
        }

        // Tạo custom legend
        this.createCustomLegend(material_summary, material_color_map, has_over_limit);
        
        const ctx = document.getElementById('myCustomChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true,  }, y: { stacked: true } },
                plugins: {
                    title: {
                        display: true,
                        text: 'Số lượng nguyên vật liệu tiêu hao',
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        display: false  // Ẩn legend mặc định của Chart.js
                    }
                }
            }
        });
    },

    "createCustomLegend": function(material_summary, material_color_map, has_over_limit) {
        const legendContainer = $('.custom-legend');
        legendContainer.empty();
        
        // Tạo legend cho các nguyên vật liệu
        material_summary.forEach((material, index) => {
            const color_info = material_color_map[material.material_name];
            const material_name_with_unit = `${material.material_name} (${material.uom})`;
            
            const legendItem = $(`
                <div class="legend-item" style="display: inline-block; margin: 5px 10px 5px 0; padding: 5px 10px; background: white; border-radius: 3px; border: 1px solid #ddd;">
                    <span class="legend-color" style="display: inline-block; width: 12px; height: 12px; background: ${color_info.bg}; border: 1px solid ${color_info.border}; margin-right: 8px; vertical-align: middle;"></span>
                    <span class="legend-text" style="font-size: 12px; vertical-align: middle;">${material_name_with_unit}</span>
                </div>
            `);
            legendContainer.append(legendItem);
        });
        
        // Thêm legend cho "Vượt định mức" nếu có
        if (has_over_limit) {
            const overLimitItem = $(`
                <div class="legend-item" style="display: inline-block; margin: 5px 10px 5px 0; padding: 5px 10px; background: white; border-radius: 3px; border: 1px solid #ddd;">
                    <span class="legend-color" style="display: inline-block; width: 12px; height: 12px; background: rgba(244, 63, 94, 0.5); border: 1px solid rgba(244, 63, 94, 1); margin-right: 8px; vertical-align: middle;"></span>
                    <span class="legend-text" style="font-size: 12px; vertical-align: middle;">Vượt định mức</span>
                </div>
            `);
            legendContainer.append(overLimitItem);
        }
        
        // Thêm tiêu đề cho legend
        const legendTitle = $(`
            <div style="font-weight: bold; margin-bottom: 10px; color: #333; font-size: 14px;">
                Chú thích màu sắc:
            </div>
        `);
        legendContainer.prepend(legendTitle);
    },

    "draw_second_chart": function(data_rows) {
        const columns = frappe.query_report.columns;
        const production_items = [];

        columns.forEach(col => {
            if (col.fieldname && col.fieldname.endsWith('_actual')) {
                const item_name = col.parent || col.label.split('<br>')[0];
                production_items.push({
                    name: item_name,
                    actual_field: col.fieldname,
                    planned_field: col.fieldname.replace('_actual', '_planned')
                });
            }
        });

        if (production_items.length === 0) return;

        const chartContainer2 = $(`<div class="chart-container chart-2" style="position: relative; height: 400px; width: 100%; margin-top: 40px; margin-bottom: 40px;">
            <canvas id="mySecondChart"></canvas>
        </div>`);
        $('.report-wrapper .chart-1').after(chartContainer2);

        const labels2 = production_items.map(item => item.name);
        
        // Sử dụng bảng màu đã được tạo từ biểu đồ thứ nhất
        const material_color_map = this.material_color_map || {};

        let main_datasets = [];
        let over_limit_datasets = [];
        const transform_zero_to_null = (value) => (value === 0 || !value ? null : value);

        const material_summary = {};
        data_rows.forEach(row => {
            const material_name = row.material_name;
            if (!material_summary[material_name]) {
                material_summary[material_name] = {
                    material_name: material_name,
                    uom: row.uom,
                    data: {}
                };
                production_items.forEach(item => {
                    material_summary[material_name].data[item.actual_field] = 0;
                    material_summary[material_name].data[item.planned_field] = 0;
                });
            }
            
            production_items.forEach(item => {
                material_summary[material_name].data[item.actual_field] += (row[item.actual_field] || 0);
                material_summary[material_name].data[item.planned_field] += (row[item.planned_field] || 0);
            });
        });

        Object.values(material_summary).forEach(material_data => {
            const material_name = material_data.material_name;
            const material_name_with_unit = `${material_name} (${material_data.uom})`;
            const color_info = material_color_map[material_name];
            
            const within_limit_data = production_items.map(item => 
                transform_zero_to_null(Math.min(
                    material_data.data[item.actual_field] || 0, 
                    material_data.data[item.planned_field] || 0
                ))
            );
            
            const over_limit_data = production_items.map(item => 
                transform_zero_to_null(Math.max(0, 
                    (material_data.data[item.actual_field] || 0) - (material_data.data[item.planned_field] || 0)
                ))
            );
            
            const bar_thickness = 35;

            main_datasets.push({
                label: material_name_with_unit,
                data: within_limit_data,
                backgroundColor: color_info.bg,
                borderColor: color_info.border,
                borderWidth: 2,
                stack: material_name_with_unit,
                skipNull: true,
                barThickness: bar_thickness,
                maxBarThickness: bar_thickness + 10,
                categoryPercentage: 0.9, 
                barPercentage: 0.9
            });

            if (over_limit_data.some(d => d !== null)) {
                over_limit_datasets.push({
                    label: 'Vượt định mức',
                    data: over_limit_data,
                    backgroundColor: 'rgba(220, 38, 38, 0.5)',  // Màu đỏ đậm khác biệt
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 2,
                    stack: material_name_with_unit,
                    skipNull: true,
                    barThickness: bar_thickness,
                    maxBarThickness: bar_thickness + 10,
                    categoryPercentage: 0.9,
                    barPercentage: 0.9
                });
            }
        });
        
        const datasets2 = [...main_datasets, ...over_limit_datasets];
        const ctx2 = document.getElementById('mySecondChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: { labels: labels2, datasets: datasets2 },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        grid: { drawOnChartArea: false, offset: true },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Nguyên liệu tiêu thụ theo từng sản phẩm',
                        font: { size: 18 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            filter: function(legendItem, chartData) {
                                const label = legendItem.text;
                                const firstDataset = chartData.datasets.find(d => d.label === label);
                                return legendItem.datasetIndex === chartData.datasets.indexOf(firstDataset);
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const stack_name = context.dataset.stack;
                                const value = context.raw;
                                if (context.dataset.label === 'Vượt định mức') {
                                    return `${stack_name} (Vượt định mức): ${value}`;
                                }
                                return `${stack_name}: ${value}`;
                            }
                        }
                    }
                }
            }
        });
    }
};