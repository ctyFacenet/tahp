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

    get_report_title(filters) {
        // Tạo tiêu đề ngắn gọn để tránh bị cắt ngắn
        let title = "Tiêu thụ NVL";
        
        if (filters.manufacturing_category) {
            title += ` - ${filters.manufacturing_category}`;
        }
        
        // Ưu tiên hiển thị thông tin thời gian quan trọng nhất
        if (filters.is_month_filter && filters.month && filters.year) {
            // Rút gọn tên tháng để tiết kiệm không gian
            const monthShort = filters.month.replace('Tháng ', 'T');
            title += ` (${monthShort}/${filters.year})`;
        } else if (filters.week) {
            const weekDate = new Date(filters.week);
            const weekStart = this.getMonday(weekDate);
            const weekEnd = this.getSunday(weekStart);
            title += ` (${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')})`;
        } else if (filters.from_date && filters.to_date) {
            const fromDate = new Date(filters.from_date);
            const toDate = new Date(filters.to_date);
            title += ` (${fromDate.toLocaleDateString('vi-VN')} - ${toDate.toLocaleDateString('vi-VN')})`;
        } else if (filters.year) {
            title += ` (${filters.year})`;
        }
        
        // Đảm bảo tiêu đề không vượt quá 140 ký tự
        if (title.length > 140) {
            // Nếu vẫn quá dài, cắt bớt thông tin
            if (filters.manufacturing_category) {
                title = `Tiêu thụ NVL - ${filters.manufacturing_category}`;
                if (filters.is_month_filter && filters.month && filters.year) {
                    const monthShort = filters.month.replace('Tháng ', 'T');
                    title += ` (${monthShort}/${filters.year})`;
                }
            } else {
                title = "Tiêu thụ NVL";
                if (filters.is_month_filter && filters.month && filters.year) {
                    const monthShort = filters.month.replace('Tháng ', 'T');
                    title += ` (${monthShort}/${filters.year})`;
                }
            }
        }
        
        return title;
    },

    "override_report_title": function(report) {
        // Tạo tiêu đề ngắn gọn
        const filters = report.get_filter_values();
        let title = "Tiêu thụ NVL";
        
        if (filters.manufacturing_category) {
            title += ` - ${filters.manufacturing_category}`;
        }
        
        // Ưu tiên hiển thị thông tin thời gian quan trọng nhất
        if (filters.is_month_filter && filters.month && filters.year) {
            // Rút gọn tên tháng để tiết kiệm không gian
            const monthShort = filters.month.replace('Tháng ', 'T');
            title += ` (${monthShort}/${filters.year})`;
        } else if (filters.week) {
            const weekDate = new Date(filters.week);
            const weekStart = this.getMonday(weekDate);
            const weekEnd = this.getSunday(weekStart);
            title += ` (${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')})`;
        } else if (filters.from_date && filters.to_date) {
            const fromDate = new Date(filters.from_date);
            const toDate = new Date(filters.to_date);
            title += ` (${fromDate.toLocaleDateString('vi-VN')} - ${toDate.toLocaleDateString('vi-VN')})`;
        } else if (filters.year) {
            title += ` (${filters.year})`;
        }
        
        // Đảm bảo tiêu đề không vượt quá 140 ký tự
        if (title.length > 140) {
            // Nếu vẫn quá dài, cắt bớt thông tin
            if (filters.manufacturing_category) {
                title = `Tiêu thụ NVL - ${filters.manufacturing_category}`;
                if (filters.is_month_filter && filters.month && filters.year) {
                    const monthShort = filters.month.replace('Tháng ', 'T');
                    title += ` (${monthShort}/${filters.year})`;
                }
            } else {
                title = "Tiêu thụ NVL";
                if (filters.is_month_filter && filters.month && filters.year) {
                    const monthShort = filters.month.replace('Tháng ', 'T');
                    title += ` (${monthShort}/${filters.year})`;
                }
            }
        }
        
        // Override title trong DOM
        setTimeout(() => {
            const titleElement = $('.page-title, .report-title, h1').first();
            if (titleElement.length) {
                titleElement.text(title);
            }
        }, 100);
    },
    
    "onload": function(report) {
        // Override title để tránh bị cắt ngắn
        this.override_report_title(report);
        
        setTimeout(() => {
            if (!this.isDrawing) {
                this.draw_chart();
            }
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

        // Thêm event listener cho window resize để responsive tốt hơn
        let resizeTimeout;
        $(window).on('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (!this.isDrawing) {
                    this.draw_chart();
                }
            }, 300);
        });
    },

    "handle_filter_change": function() {
        frappe.query_report.refresh();
        setTimeout(() => {
            if (!this.isDrawing) {
                this.draw_chart();
            }
            // Override title sau khi refresh
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
            // Override title sau khi refresh
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
                // Override title sau khi refresh
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
                // Override title sau khi refresh
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

    "draw_chart": function() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        
        let existing_chart1 = Chart.getChart("myCustomChart");
        if (existing_chart1) existing_chart1.destroy();
        let existing_chart2 = Chart.getChart("mySecondChart");
        if (existing_chart2) existing_chart2.destroy();
        $('.report-wrapper .chart-container').remove();
        
        const data_rows = frappe.query_report.data;
        if (!data_rows || data_rows.length === 0) {
            this.isDrawing = false;
            return;
        }

        let material_summary = this.aggregate_data_for_charts(data_rows);
        
        // Filter out materials with zero actual consumption
        material_summary = material_summary.filter(material => material.total_actual_qty > 0);

        // Draw first chart with filtered data
        this.draw_first_chart(material_summary);
        
        setTimeout(() => {
            // Draw second chart using filtered data through material_color_map
            this.draw_second_chart(data_rows);
            this.isDrawing = false;
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
        
        return Object.values(material_map);
    },

    "draw_first_chart": function(material_summary) {
        if (material_summary.length === 0) return;
        
        const bar_thickness = 40;
        const chart_padding = 120;
        const num_bars = material_summary.length;
        let calculated_height = (num_bars * bar_thickness) + chart_padding;
        calculated_height = Math.max(300, Math.min(600, calculated_height));
        const chartContainer = $(`<div class="chart-container chart-1" style="position: relative; height: ${calculated_height}px; width: 100%; margin-bottom: 20px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 600px; width: 100%; height: 100%;">
                <canvas id="myCustomChart" style="width: 100%; height: 100%;"></canvas>
            </div>
        </div>`);
        $('.report-wrapper').prepend(chartContainer);

        const labels = material_summary.map(row => `${row.material_name} (${row.uom})`);
        const actual_data = material_summary.map(row => row.total_actual_qty);
        const planned_data = material_summary.map(row => row.total_planned_qty);

        const material_colors = [
            { bg: 'rgba(99, 102, 241, 0.5)', border: 'rgba(99, 102, 241, 1)' }, { bg: 'rgba(14, 165, 233, 0.5)', border: 'rgba(14, 165, 233, 1)' }, { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' }, { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' }, { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 1)' }, { bg: 'rgba(251, 207, 232, 0.5)', border: 'rgba(251, 207, 232, 1)' }, { bg: 'rgba(34, 211, 238, 0.5)', border: 'rgba(34, 211, 238, 1)' }, { bg: 'rgba(132, 204, 22, 0.5)', border: 'rgba(132, 204, 22, 1)' }, { bg: 'rgba(59, 130, 246, 0.5)', border: 'rgba(59, 130, 246, 1)' }, { bg: 'rgba(139, 69, 19, 0.5)', border: 'rgba(139, 69, 19, 1)' }, { bg: 'rgba(75, 85, 99, 0.5)', border: 'rgba(75, 85, 99, 1)' }, { bg: 'rgba(236, 72, 153, 0.5)', border: 'rgba(236, 72, 153, 1)' },
        ];
        const material_color_map = {};
        material_summary.forEach((material, index) => {
            material_color_map[material.material_name] = material_colors[index % material_colors.length];
        });
        this.material_color_map = material_color_map;

        const plannedLinePlugin = {
            id: 'plannedLinePlugin',
            afterDatasetsDraw(chart) {
                const { ctx, scales: { x, y } } = chart;
                ctx.save();
                ctx.strokeStyle = 'rgba(244, 63, 94, 1)';
                ctx.lineWidth = 1.5;
                
                chart.plannedLines = [];
                
                planned_data.forEach((plannedValue, i) => {
                    if (plannedValue > 0) {
                        const yValue = y.getPixelForValue(i);
                        const barHeight = 20; // Giảm độ dài đường từ 40 xuống 20
                        const xValue = x.getPixelForValue(plannedValue);
                        
                        const chartArea = chart.chartArea;
                        if (xValue >= chartArea.left && xValue <= chartArea.right) {
                            chart.plannedLines.push({
                                x: xValue, y: yValue, value: plannedValue,
                                label: labels[i], barHeight: barHeight
                            });
                            
                            ctx.beginPath();
                            ctx.moveTo(xValue, yValue - barHeight / 2);
                            ctx.lineTo(xValue, yValue + barHeight / 2);
                            ctx.stroke();
                        }
                    }
                });
                ctx.restore();
            },
            
            afterEvent(chart, args) {
                const { event } = args;
                if (!chart.plannedLines) return;
                
                const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
                const x = canvasPosition.x;
                const y = canvasPosition.y;
                
                if (!chart.customTooltip) {
                    chart.customTooltip = document.createElement('div');
                    chart.customTooltip.id = 'planned-line-tooltip';
                    chart.customTooltip.style.cssText = `
                        position: fixed; background: #000; color: #fff; padding: 10px 15px; border-radius: 6px; font-size: 13px;
                        pointer-events: none; z-index: 999999; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    `;
                    document.body.appendChild(chart.customTooltip);
                }
                
                const hoveredLine = chart.plannedLines.find(line => {
                    return Math.abs(x - line.x) <= 15 && y >= line.y - line.barHeight/2 && y <= line.y + line.barHeight/2;
                });
                
                if (hoveredLine) {
                    chart.canvas.style.cursor = 'pointer';
                    const canvasRect = chart.canvas.getBoundingClientRect();
                    chart.customTooltip.innerHTML = `<div><strong>${hoveredLine.label}</strong></div><div>Định mức: ${hoveredLine.value.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}</div>`;
                    chart.customTooltip.style.display = 'block';
                    chart.customTooltip.style.left = (canvasRect.left + x + 15) + 'px';
                    chart.customTooltip.style.top = (canvasRect.top + y - 40) + 'px';
                } else {
                    chart.canvas.style.cursor = 'default';
                    if (chart.customTooltip) {
                        chart.customTooltip.style.display = 'none';
                    }
                }
            }
        };

        const material_datasets = material_summary.map((material, index) => {
            const data = new Array(material_summary.length).fill(0);
            data[index] = material.total_actual_qty;
            
            return {
                label: `${material.material_name} (${material.uom})`,
                data: data,
                backgroundColor: material_color_map[material.material_name]?.bg || 'rgba(75, 85, 99, 0.5)',
                borderColor: material_color_map[material.material_name]?.border || 'rgba(75, 85, 99, 1)',
                borderWidth: 1,
                stack: 'actual'
            };
        });

        material_datasets.push({
            label: 'Định mức',
            data: new Array(material_summary.length).fill(null),
            type: 'line',
            borderColor: 'rgba(244, 63, 94, 1)',
            borderWidth: 1.5,
            pointStyle: 'line',
            fill: false,
            showLine: false
        });

        const ctx = document.getElementById('myCustomChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: material_datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            usePointStyle: true, 
                            boxWidth: 15, 
                            padding: 15,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        } 
                    },
                    title: { 
                        display: true, 
                        text: 'Số lượng nguyên vật liệu tiêu hao', 
                        font: { 
                            size: window.innerWidth < 768 ? 14 : 18 
                        },
                        align: window.innerWidth < 768 ? 'start' : 'center'
                    }
                },
                scales: { 
                    x: { 
                        beginAtZero: true,
                        max: Math.max(Math.max(...actual_data), Math.max(...planned_data)) * 1.1,
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            callback: function(value) {
                                return value.toLocaleString('vi-VN', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 1
                                });
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    }
                }
            },
            plugins: [plannedLinePlugin]
        });
    },

    "draw_second_chart": function(data_rows) {
        const columns = frappe.query_report.columns;
        const production_items = [];

        columns.forEach(col => {
            if (col.fieldname && col.fieldname.endsWith('_actual')) {
                // Get product name from col.parent if available, otherwise from fieldname
                let item_name = col.parent;
                if (!item_name) {
                    // If no col.parent, get from fieldname by removing "_actual"
                    const fieldname_without_suffix = col.fieldname.replace('_actual', '');
                    // Find corresponding column with same fieldname to get product name
                    const corresponding_col = columns.find(c => c.fieldname === fieldname_without_suffix + '_actual_per_ton');
                    if (corresponding_col && corresponding_col.parent) {
                        item_name = corresponding_col.parent;
                    }
                }
                if (item_name) {
                    production_items.push({
                        name: item_name,
                        actual_field: col.fieldname,
                        planned_field: col.fieldname.replace('_actual', '_planned')
                    });
                }
            }
        });

        if (production_items.length === 0) return;

        // Get valid materials list (filtered in draw_chart) from material_color_map
        const material_color_map = this.material_color_map || {};
        const valid_material_names = Object.keys(material_color_map);
        
        // Don't draw chart 2 if no valid materials
        if (valid_material_names.length === 0) return;
        
        const chartContainer2 = $(`<div class="chart-container chart-2" style="position: relative; height: 400px; width: 100%; margin-top: 40px; margin-bottom: 40px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;">
            <div style="min-width: 600px; width: 100%; height: 100%;">
                <canvas id="mySecondChart" style="width: 100%; height: 100%;"></canvas>
            </div>
        </div>`);
        
        // Thêm CSS cho mobile responsive cho cả hai chart
        if (!document.getElementById('mobile-chart-styles')) {
            const style = document.createElement('style');
            style.id = 'mobile-chart-styles';
            style.textContent = `
                @media (max-width: 768px) {
                    .chart-container.chart-1, .chart-container.chart-2 {
                        height: 350px !important;
                        margin-top: 20px !important;
                        margin-bottom: 20px !important;
                    }
                    .chart-container.chart-1 > div, .chart-container.chart-2 > div {
                        min-width: 500px !important;
                    }
                }
                @media (max-width: 480px) {
                    .chart-container.chart-1, .chart-container.chart-2 {
                        height: 300px !important;
                        margin-top: 15px !important;
                        margin-bottom: 15px !important;
                    }
                    .chart-container.chart-1 > div, .chart-container.chart-2 > div {
                        min-width: 450px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        $('.report-wrapper .chart-1').after(chartContainer2);

        const labels2 = production_items.map(item => item.name);

        const plannedLinePlugin2 = {
            id: 'plannedLinePlugin2',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                ctx.save();
                
                chart.plannedLines2 = [];
                
                chart.data.datasets.forEach((dataset, i) => {
                    if (!dataset.plannedData || chart.isDatasetVisible(i) === false) return;
                    
                    const meta = chart.getDatasetMeta(i);
                    
                    ctx.beginPath();
                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = 'rgba(244, 63, 94, 1)'; 

                    meta.data.forEach((bar, index) => {
                        const plannedValue = dataset.plannedData[index];
                        const actualValue = dataset.data[index];
                        
                        if (plannedValue > 0 && actualValue !== null) {
                            const y = chart.scales.y.getPixelForValue(plannedValue);
                            const x = bar.x;
                            const barWidth = bar.width;
                            const lineStartX = x - barWidth / 2;
                            const lineEndX = x + barWidth / 2;
                            
                            if (y >= chart.chartArea.top && y <= chart.chartArea.bottom) {
                                ctx.moveTo(lineStartX, y);
                                ctx.lineTo(lineEndX, y);
                                
                                chart.plannedLines2.push({
                                    x: lineStartX, y: y, width: barWidth,
                                    value: plannedValue, label: `${dataset.label}`
                                });
                            }
                        }
                    });
                    ctx.stroke();
                });
                
                ctx.restore();
            },
            afterEvent(chart, args) {
                const { event } = args;
                if (!chart.plannedLines2) return;
                
                const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
                const x = canvasPosition.x;
                const y = canvasPosition.y;

                if (!chart.customTooltip2) {
                    chart.customTooltip2 = document.createElement('div');
                    chart.customTooltip2.id = 'planned-line-tooltip-2';
                    chart.customTooltip2.style.cssText = `
                        position: fixed; background: #000; color: #fff; padding: 10px 15px; border-radius: 6px;
                        font-size: 13px; pointer-events: none; z-index: 999999; display: none;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    `;
                    document.body.appendChild(chart.customTooltip2);
                }

                const hoveredLine = chart.plannedLines2.find(line => 
                    x >= line.x && x <= line.x + line.width && Math.abs(y - line.y) < 5
                );

                if (hoveredLine) {
                    chart.canvas.style.cursor = 'pointer';
                    const canvasRect = chart.canvas.getBoundingClientRect();
                    chart.customTooltip2.innerHTML = `<div><strong>${hoveredLine.label}</strong></div><div>Định mức: ${hoveredLine.value.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}</div>`;
                    chart.customTooltip2.style.display = 'block';
                    chart.customTooltip2.style.left = `${canvasRect.left + event.x + 15}px`;
                    chart.customTooltip2.style.top = `${canvasRect.top + event.y - 15}px`;
                } else {
                    chart.canvas.style.cursor = 'default';
                    if (chart.customTooltip2) {
                        chart.customTooltip2.style.display = 'none';
                    }
                }
            }
        };

        let datasets2 = [];
        const transform_zero_to_null = (value) => (value === 0 || !value ? null : value);

        const material_summary_by_product = {};
        data_rows.forEach(row => {
            const material_name = row.material_name;
            // Only process valid materials
            if (!valid_material_names.includes(material_name)) {
                return;
            }

            if (!material_summary_by_product[material_name]) {
                material_summary_by_product[material_name] = {
                    material_name: material_name, uom: row.uom, data: {}
                };
                production_items.forEach(item => {
                    material_summary_by_product[material_name].data[item.actual_field] = 0;
                    material_summary_by_product[material_name].data[item.planned_field] = 0;
                });
            }
            
            production_items.forEach(item => {
                material_summary_by_product[material_name].data[item.actual_field] += (row[item.actual_field] || 0);
                material_summary_by_product[material_name].data[item.planned_field] += (row[item.planned_field] || 0);
            });
        });

        Object.values(material_summary_by_product).forEach(material_data => {
            const material_name = material_data.material_name;
            const material_name_with_unit = `${material_name} (${material_data.uom})`;
            const color_info = material_color_map[material_name] || { bg: 'rgba(128,128,128,0.5)', border: 'rgba(128,128,128,1)'};
            
            const actual_data = production_items.map(item => 
                transform_zero_to_null(material_data.data[item.actual_field] || 0)
            );
            
            const planned_data = production_items.map(item => 
                transform_zero_to_null(material_data.data[item.planned_field] || 0)
            );

            datasets2.push({
                label: material_name_with_unit,
                data: actual_data,
                plannedData: planned_data,
                backgroundColor: color_info.bg,
                borderColor: color_info.border,
                borderWidth: 1,
                skipNull: true,
            });
        });
        
        datasets2.push({
            label: 'Định mức', data: [], type: 'line',
            borderColor: 'rgba(244, 63, 94, 1)', 
            borderWidth: 2.5, pointStyle: 'line', fill: false,
        });

        const ctx2 = document.getElementById('mySecondChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: { labels: labels2, datasets: datasets2 },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: { 
                        stacked: false, 
                        grid: { display: false }, 
                        ticks: { 
                            autoSkip: false, 
                            maxRotation: 45, 
                            minRotation: 0,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        } 
                    },
                    y: { 
                        stacked: false, 
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            callback: function(value) {
                                return value.toLocaleString('vi-VN', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 1
                                });
                            }
                        }
                    }
                },
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Nguyên liệu tiêu thụ theo từng sản phẩm', 
                        font: { 
                            size: window.innerWidth < 768 ? 14 : 18 
                        },
                        align: window.innerWidth < 768 ? 'start' : 'center'
                    },
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            usePointStyle: true,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            padding: window.innerWidth < 768 ? 10 : 15
                        } 
                    },
                    tooltip: { 
                        mode: 'index', 
                        intersect: false,
                        titleFont: {
                            size: window.innerWidth < 768 ? 11 : 13
                        },
                        bodyFont: {
                            size: window.innerWidth < 768 ? 10 : 12
                        }
                    }
                }
            },
            plugins: [plannedLinePlugin2]
        });
    }
};

