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
            "options": ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
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
        frappe.require("https://cdn.jsdelivr.net/npm/chart.js").then(() => {
            setTimeout(() => {
                this.draw_chart();
            }, 500);
        });

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
                // Re-render chart after refresh
                setTimeout(() => {
                    this.draw_chart();
                }, 500);
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

        this.draw_first_chart(material_summary);
        this.draw_second_chart(data_rows);
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
        if (calculated_height < 400) {
            calculated_height = 400;
        }

        const chartContainer = $(`<div class="chart-container chart-1" style="height: ${calculated_height}px; margin-bottom: 40px;">
            <canvas id="myCustomChart"></canvas>
        </div>`);
        $('.report-wrapper').prepend(chartContainer);

        const labels = material_summary.map(row => `${row.material_name} (${row.uom})`);

        const datasets = [
            {
                label: 'Thực tế',
                data: material_summary.map(row => row.within_limit_qty),
                backgroundColor: 'rgba(128, 128, 224, 0.8)'
            },
            {
                label: 'Vượt định mức',
                data: material_summary.map(row => row.over_limit_qty),
                backgroundColor: 'rgba(255, 0, 0, 1)'
            }
        ];

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
                    }
                }
            }
        });
    },

    "draw_second_chart": function(data_rows) {
        const columns = frappe.query_report.columns;
        const production_items = [];

        columns.forEach(col => {
            if (col.fieldname && col.fieldname.endsWith('_actual')) {
                const item_name = col.label.split('<br>')[0];
                production_items.push({
                    name: item_name,
                    actual_field: col.fieldname,
                    planned_field: col.fieldname.replace('_actual', '_planned')
                });
            }
        });

        if (production_items.length === 0) return;

        const chartContainer2 = $(`<div class="chart-container chart-2" style="position: relative; height: 60vh; width: 100%; margin-top: 40px; margin-bottom: 40px;">
            <canvas id="mySecondChart"></canvas>
        </div>`);
        $('.report-wrapper .chart-1').after(chartContainer2);

        const labels2 = production_items.map(item => item.name);
        const material_colors = [
            'rgba(142, 124, 255, 0.9)', 'rgba(255, 82, 82, 0.9)', 'rgba(102, 217, 232, 0.9)',
            'rgba(54, 162, 235, 0.9)', 'rgba(255, 206, 86, 0.9)', 'rgba(255, 159, 64, 0.9)'
        ];

        const unique_materials = [...new Set(data_rows.map(row => row.material_name))];
        const material_color_map = {};
        unique_materials.forEach((material, index) => {
            material_color_map[material] = material_colors[index % material_colors.length];
        });

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
            const base_color = material_color_map[material_name];
            
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
                backgroundColor: base_color,
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
                    backgroundColor: 'rgba(217, 30, 24, 0.9)',
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