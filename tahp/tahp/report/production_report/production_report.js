frappe.query_reports["Production Report"] = {
    "filters": [
        {
            "fieldname": "from_date",
            "label": __("Từ ngày"),
            "fieldtype": "Date",
            "on_change": function() {
                frappe.query_reports["Production Report"].handle_date_range_change();
            }
        },
        {
            "fieldname": "to_date",
            "label": __("Đến ngày"),
            "fieldtype": "Date",
            "on_change": function() {
                frappe.query_reports["Production Report"].handle_date_range_change();
            }
        },
        {
            "fieldname": "week",
            "label": __("Tuần"),
            "fieldtype": "Date",
            "on_change": function() {
                frappe.query_reports["Production Report"].handle_week_change();
            }
        }
    ],

    get_datatable_options(options) {
        return { ...options, freezeIndex: 2, headerBackground: "rgb(205, 222, 238)"};
    },

    "onload": function(report) {
        setTimeout(() => { this.render_components(); }, 500);
        
        // Add responsive CSS
        this.add_responsive_styles();

        // Track previous filter values
        let previous_values = {
            from_date: report.get_filter_value("from_date"),
            to_date: report.get_filter_value("to_date"),
            week: report.get_filter_value("week")
        };

        // Handle filter clearing
        const on_date_cleared_handler = (fieldname) => {
            const new_value = report.page.fields_dict[fieldname].get_value();
            const old_value = previous_values[fieldname];

            // Refresh and re-render if field was cleared
            if (old_value && !new_value) {
                report.refresh();
                setTimeout(() => {
                    this.render_components();
                }, 500);
            }

            previous_values[fieldname] = new_value;
        };

        // Attach handlers to filter inputs
        report.page.fields_dict.from_date.$input.on('change', () => on_date_cleared_handler("from_date"));
        report.page.fields_dict.to_date.$input.on('change', () => on_date_cleared_handler("to_date"));
        report.page.fields_dict.week.$input.on('change', () => on_date_cleared_handler("week"));
    },

    "add_responsive_styles": function() {
        // Add responsive CSS for different screen sizes
        const style = $(`
            <style>
                @media (max-width: 768px) {
                    .main-layout-container {
                        flex-direction: column !important;
                        gap: 12px !important;
                        padding: 8px !important;
                        margin-bottom: 20px !important;
                    }
                    
                    .progress-section {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: auto !important;
                    }
                    
                    .chart-section {
                        width: 100% !important;
                        min-width: auto !important;
                    }
                    
                    .progress-grid {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                    }
                    
                    .progress-card {
                        padding: 12px !important;
                        min-height: 100px !important;
                    }
                    
                    .progress-card h4 {
                        font-size: 13px !important;
                        margin-bottom: 6px !important;
                    }
                    
                    .progress-values span:first-child {
                        font-size: 20px !important;
                    }
                    
                    .chart-wrapper {
                        padding: 12px !important;
                        margin-top: 12px !important;
                    }
                }
                
                @media (min-width: 769px) and (max-width: 1024px) {
                    .main-layout-container {
                        gap: 18px !important;
                        padding: 12px !important;
                        margin-bottom: 20px !important;
                    }
                    
                    .progress-section {
                        max-width: 300px !important;
                    }
                    
                    .progress-grid {
                        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
                    }
                }
                
                @media (min-width: 1025px) {
                    .main-layout-container {
                        gap: 20px !important;
                        padding: 15px !important;
                        margin-bottom: 25px !important;
                    }
                    
                    .progress-section {
                        max-width: 320px !important;
                    }
                    
                    .progress-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                
                /* Custom scrollbar for mobile */
                .chart-wrapper::-webkit-scrollbar {
                    height: 8px;
                }
                
                .chart-wrapper::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                
                .chart-wrapper::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 4px;
                }
                
                .chart-wrapper::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            </style>
        `);
        $('head').append(style);
    },

    "render_components": function() {
        // Clean up existing chart and layout
        let existing_chart = Chart.getChart("daily-production-chart");
        if (existing_chart) existing_chart.destroy();
        $('.report-wrapper .main-layout-container').remove();
        
        const data_rows = frappe.query_report.data;
        const columns = frappe.query_report.columns;
        if (!data_rows || data_rows.length < 1) return;

        // Create main layout container
        const mainContainer = $(`<div class="main-layout-container" style="
            display: flex; 
            gap: 15px; 
            padding: 10px; 
            align-items: flex-start; 
            justify-content: space-between; 
            margin-bottom: 25px;
            flex-wrap: wrap;
        ">
            <div class="progress-section" style="
                width: 100%; 
                max-width: 320px; 
                flex-shrink: 0;
                min-width: 260px;
            "></div>
            <div class="chart-section" style="
                flex: 1; 
                min-width: 280px;
                width: 100%;
            "></div>
        </div>`);
        $('.report-wrapper').prepend(mainContainer);

        // Render progress cards and chart
        const total_summary_data = this.aggregate_total_summary(data_rows, columns);
        this.draw_progress_cards(total_summary_data, mainContainer.find('.progress-section'));

        const daily_chart_data = this.aggregate_data_for_daily_chart(data_rows, columns);
        this.draw_daily_production_chart(daily_chart_data, mainContainer.find('.chart-section'));
    },
    
    "aggregate_total_summary": function(data_rows, columns) {
        // Get product columns and their system categories
        const product_columns = columns.filter(c => c.fieldname !== 'production_date');
        const system_by_field = {};
        product_columns.forEach(c => { system_by_field[c.fieldname] = (c.parent || '').toString().trim(); });

        let p2o5 = { planned: 0, actual: 0 };
        let others = { planned: 0, actual: 0 };

        // Process each row
        data_rows.forEach(row => {
            if (row.production_date && row.production_date.includes("Tổng cộng")) return;
            product_columns.forEach(col => {
                const value_str = row[col.fieldname];
                if (value_str && typeof value_str === 'string' && value_str.includes('/')) {
                    const parts = value_str.replace(/<[^>]*>/g, '').split('/');
                    const actual = parseFloat(parts[0].trim().replace(/,/g, '')) || 0;
                    const planned = parseFloat(parts[1].trim().replace(/,/g, '')) || 0;
                    const system_name = (system_by_field[col.fieldname] || '').toLowerCase();
                    if (system_name.includes('p2o5')) {
                        p2o5.planned += planned; p2o5.actual += actual;
                    } else {
                        others.planned += planned; others.actual += actual;
                    }
                }
            });
        });

        // Return both categories
        return [
            { name: 'P2O5', ...p2o5 },
            { name: 'Thạch cao', ...others }
        ];
    },

    "draw_progress_cards": function(summary_data, container) {
        // Create grid container for progress cards
        const gridContainer = $(`<div class="progress-grid" style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            width: 100%;
        "></div>`);
        container.append(gridContainer);

        // Create progress card for each item
        summary_data.forEach(item => {
            const percentage = (item.planned > 0) ? (item.actual / item.planned) * 100 : 0;
            const card = $(`
                <div class="progress-card" style="
                    background-color: #fff; 
                    border: 1px solid #e0e0e0; 
                    border-radius: 10px; 
                    padding: 15px; 
                    box-shadow: 0 3px 5px rgba(0,0,0,0.06);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    min-height: 110px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                ">
                    <div>
                        <h4 style="
                            margin-top: 0; 
                            margin-bottom: 8px; 
                            font-size: 15px; 
                            font-weight: 600;
                            color: #2c3e50;
                            line-height: 1.2;
                        ">${item.name}</h4>
                        <div class="progress-values" style="margin-bottom: 6px;">
                            <span style="
                                font-size: 24px; 
                                font-weight: 700;
                                color: #27ae60;
                            ">${item.actual.toLocaleString('en-US')}</span>
                            <span style="
                                font-size: 13px; 
                                color: #6c757d;
                                margin-left: 4px;
                            "> tấn</span>
                        </div>
                        <div style="
                            font-size: 12px; 
                            color: #6c757d; 
                            margin-bottom: 10px;
                        ">/ ${item.planned.toLocaleString('en-US')} tấn kế hoạch</div>
                    </div>
                    <div class="progress-bar-wrapper" style="
                        background-color: #e9ecef; 
                        border-radius: 8px; 
                        height: 10px; 
                        overflow: hidden;
                        position: relative;
                    ">
                        <div class="progress-bar-inner" style="
                            width: ${Math.min(percentage, 100)}%; 
                            height: 100%; 
                            background: linear-gradient(90deg, #27ae60, #2ecc71);
                            border-radius: 8px;
                            transition: width 0.3s ease;
                        "></div>
                        <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 9px;
                            font-weight: 600;
                            color: #2c3e50;
                        ">${percentage.toFixed(1)}%</div>
                    </div>
                </div>
            `);
            
            // Add hover effect
            card.hover(
                function() { $(this).css('transform', 'translateY(-2px)').css('box-shadow', '0 8px 15px rgba(0,0,0,0.12)'); },
                function() { $(this).css('transform', 'translateY(0)').css('box-shadow', '0 4px 6px rgba(0,0,0,0.07)'); }
            );
            
            gridContainer.append(card);
        });
    },

    "aggregate_data_for_daily_chart": function(data_rows, columns) {
        // Group data by date and system category
        let daily_summary = {};
        const product_columns = columns.filter(c => c.fieldname !== 'production_date');
        const system_by_field = {};
        product_columns.forEach(c => { system_by_field[c.fieldname] = (c.parent || '').toString().trim(); });

        data_rows.forEach(row => {
            const date = row.production_date;
            if (!date || date.includes("Tổng cộng")) return;
            if (!daily_summary[date]) {
                daily_summary[date] = { "P2O5": { planned: 0, actual: 0 }, "Thạch cao": { planned: 0, actual: 0 } };
            }
            product_columns.forEach(col => {
                const value_str = row[col.fieldname];
                if (value_str && typeof value_str === 'string' && value_str.includes('/')) {
                    const parts = value_str.replace(/<[^>]*>/g, '').split('/');
                    const actual = parseFloat(parts[0].trim().replace(/,/g, '')) || 0;
                    const planned = parseFloat(parts[1].trim().replace(/,/g, '')) || 0;
                    const system_name = (system_by_field[col.fieldname] || '');
                    if (system_name.toLowerCase().includes('p2o5')) {
                        daily_summary[date]["P2O5"].planned += planned;
                        daily_summary[date]["P2O5"].actual += actual;
                    } else {
                        daily_summary[date]["Thạch cao"].planned += planned;
                        daily_summary[date]["Thạch cao"].actual += actual;
                    }
                }
            });
        });
        return daily_summary;
    },

    "draw_daily_production_chart": function(daily_data, container) {
        const dates = Object.keys(daily_data).sort();
        if (dates.length === 0) return;
    
        // Calculate canvas size based on device
        const num_days = dates.length;
        const is_mobile = window.innerWidth < 768;
        const is_tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        
        let bar_width_per_day = is_mobile ? 50 : is_tablet ? 70 : 90;
        let canvas_width = num_days * bar_width_per_day;
        let canvas_height = is_mobile ? 220 : is_tablet ? 280 : 320;
        
        if (canvas_width < 300) canvas_width = 300;
        if (canvas_width > 1200) canvas_width = 1200;
    
        // Create chart wrapper
        const chartWrapper = $(`<div class="chart-wrapper" style="
            overflow-x: auto;
            overflow-y: hidden;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            padding: 15px;
            margin-top: 15px;
        ">
            <div class="chart-container" style="
                position: relative; 
                height: ${canvas_height}px;
                min-width: ${canvas_width}px;
                width: 100%;
            ">
                <canvas id="daily-production-chart"></canvas>
            </div>
        </div>`);
        container.append(chartWrapper);
    
        // Format dates to dd/mm
        const formatDM = (s) => {
            if (!s || typeof s !== 'string' || s.indexOf('-') === -1) return s;
            const [y,m,d] = s.split('-');
            return `${d}/${m}`;
        };
        const labels = dates.map(formatDM);
        
        // Prepare data for chart
        const othersActual = dates.map(date => daily_data[date]["Thạch cao"].actual);
        const othersPlanned = dates.map(date => daily_data[date]["Thạch cao"].planned);
        const p2o5Actual = dates.map(date => daily_data[date]["P2O5"].actual);
        const p2o5Planned = dates.map(date => daily_data[date]["P2O5"].planned);
    
        // Calculate maximum values and expand Y axis
        const max_y_value = Math.max(...othersPlanned.map((p, i) => p), ...othersActual);
        const max_y2_value = Math.max(...p2o5Planned, ...p2o5Actual);
    
        // Add 20% padding to create space for unit labels
        const padded_max_y = max_y_value > 0 ? max_y_value * 1.2 : 10;
        const padded_max_y2 = max_y2_value > 0 ? max_y2_value * 1.2 : 10;
    
        // Create datasets for mixed chart
        const datasets = [
            // Bars for Thạch cao
            { label: 'Thực tế (Thạch cao)', data: othersActual, backgroundColor: 'rgba(14, 165, 233, 0.5)', borderColor: 'rgba(14, 165, 233, 1)', borderWidth: 2, stack: 'Others', type: 'bar', order: 1 },
            { label: 'Kế hoạch (Thạch cao)', data: othersPlanned.map((p,i)=> Math.max(0, p - othersActual[i])), backgroundColor: 'rgba(14, 165, 233, 0.2)', borderColor: 'rgba(14, 165, 233, 0.6)', borderWidth: 2, stack: 'Others', type: 'bar', order: 1 },
            // Lines for P2O5
            { label: 'Kế hoạch (P2O5)', data: p2o5Planned, borderColor: 'rgba(108, 117, 125, 0.8)', backgroundColor: 'rgba(108, 117, 125, 0.0)', borderWidth: 2, fill: false, tension: 0.2, pointRadius: 4, pointHoverRadius: 6, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 1, spanGaps: true },
            { label: 'Thực tế (P2O5)', data: p2o5Actual, borderColor: 'rgba(220, 38, 127, 1)', backgroundColor: 'rgba(220, 38, 127, 0.0)', borderWidth: 4, fill: false, tension: 0.2, pointRadius: 6, pointHoverRadius: 8, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 0, spanGaps: true }
        ];
    
        const ctx = document.getElementById('daily-production-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);
                                
                                labels.forEach(label => {
                                    if (label.text.includes('P2O5')) {
                                        label.pointStyle = 'line';
                                    } else {
                                        label.pointStyle = 'rect';
                                    }
                                });
                                
                                return labels;
                            }
                        }
                    },
                    title: { 
                        display: true, 
                        text: 'Sản lượng sản xuất theo ngày' ,
                        font: {
                            size: 22,
                            weight: 'bold'
                        }
                    },
    
                },
                scales: {
                    x: {
                        grid: { 
                            drawOnChartArea: false,
                        },
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        // Set expanded maximum value
                        max: padded_max_y,
                        grid: {
                            drawTicks: false,
                        },
                        ticks: {
                            // Customize highest label
                            callback: function(value, index, ticks) {
                                // In Chart.js, highest label usually has index 0
                                if (index === ticks.length - 1) {
                                    return '( Tấn )'; // Replace number with 'Tấn'
                                }
                                // For other labels, display numbers only
                                return value.toLocaleString('en-US');
                            }
                        }
                    },
                    y2: {
                        position: 'right',
                        beginAtZero: true,
                        // Set expanded maximum value for y2 axis
                        max: padded_max_y2,
                        grid: { drawOnChartArea: false, drawTicks: false, },
                        ticks: {
                            // Apply same logic for y2 axis
                            callback: function(value, index, ticks) {
                                if (index === ticks.length - 1) {
                                    return '( Tấn )';
                                }
                                return value.toLocaleString('en-US');
                            }
                        }
                    }
                }
            }
        });
    },

    "handle_date_range_change": function() {
        // Clear week filter when date range is selected
        const from_date = frappe.query_report.get_filter_value("from_date");
        const to_date = frappe.query_report.get_filter_value("to_date");
        
        if (from_date || to_date) {
            frappe.query_report.set_filter_value("week", "", false);
        }
        
        frappe.query_report.refresh();
        setTimeout(() => {
            this.render_components();
        }, 500);
    },

    "handle_week_change": function() {
        const week_value = frappe.query_report.get_filter_value("week");
        
        if (week_value) {
            // Clear other date filters
            frappe.query_report.set_filter_value("from_date", "", false);
            frappe.query_report.set_filter_value("to_date", "", false);
            
            // Calculate week range and show alert
            const selected_date = frappe.datetime.str_to_obj(week_value);
            const monday = this.getMonday(selected_date);
            const sunday = this.getSunday(monday);
            
            frappe.show_alert({
                message: __(`Đã chọn tuần từ ${frappe.datetime.obj_to_str(monday)} đến ${frappe.datetime.obj_to_str(sunday)}`),
                indicator: 'blue'
            }, 5);
            
            frappe.query_report.refresh();
            setTimeout(() => {
                this.render_components();
            }, 500);
        }
    },

    // Get Monday of the week containing the given date
    "getMonday": function(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    // Get Sunday of the week (6 days after Monday)
    "getSunday": function(monday) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return sunday;
    }
};