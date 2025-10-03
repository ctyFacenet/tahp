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
                        gap: 15px !important;
                        padding: 10px !important;
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
                        gap: 10px !important;
                    }
                    
                    .progress-card {
                        padding: 15px !important;
                        min-height: 120px !important;
                    }
                    
                    .progress-card h4 {
                        font-size: 14px !important;
                    }
                    
                    .progress-values span:first-child {
                        font-size: 22px !important;
                    }
                    
                    .chart-wrapper {
                        padding: 15px !important;
                        margin-top: 15px !important;
                    }
                }
                
                @media (min-width: 769px) and (max-width: 1024px) {
                    .main-layout-container {
                        gap: 25px !important;
                        padding: 15px !important;
                    }
                    
                    .progress-section {
                        max-width: 320px !important;
                    }
                    
                    .progress-grid {
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
                    }
                }
                
                @media (min-width: 1025px) {
                    .main-layout-container {
                        gap: 30px !important;
                        padding: 20px !important;
                    }
                    
                    .progress-section {
                        max-width: 380px !important;
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
            gap: 20px; 
            padding: 15px; 
            align-items: flex-start; 
            justify-content: space-between; 
            margin-bottom: 40px;
            flex-wrap: wrap;
        ">
            <div class="progress-section" style="
                width: 100%; 
                max-width: 350px; 
                flex-shrink: 0;
                min-width: 280px;
            "></div>
            <div class="chart-section" style="
                flex: 1; 
                min-width: 300px;
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
        product_columns.forEach(c => { system_by_field[c.fieldname] = (c.group_label || '').toString().trim(); });

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
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
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
                    border-radius: 12px; 
                    padding: 20px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.07);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    min-height: 140px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                ">
                    <div>
                        <h4 style="
                            margin-top: 0; 
                            margin-bottom: 12px; 
                            font-size: 16px; 
                            font-weight: 600;
                            color: #2c3e50;
                            line-height: 1.3;
                        ">${item.name}</h4>
                        <div class="progress-values" style="margin-bottom: 8px;">
                            <span style="
                                font-size: 28px; 
                                font-weight: 700;
                                color: #27ae60;
                            ">${item.actual.toLocaleString('en-US')}</span>
                            <span style="
                                font-size: 14px; 
                                color: #6c757d;
                                margin-left: 4px;
                            "> tấn</span>
                        </div>
                        <div style="
                            font-size: 13px; 
                            color: #6c757d; 
                            margin-bottom: 15px;
                        ">/ ${item.planned.toLocaleString('en-US')} tấn kế hoạch</div>
                    </div>
                    <div class="progress-bar-wrapper" style="
                        background-color: #e9ecef; 
                        border-radius: 12px; 
                        height: 12px; 
                        overflow: hidden;
                        position: relative;
                    ">
                        <div class="progress-bar-inner" style="
                            width: ${Math.min(percentage, 100)}%; 
                            height: 100%; 
                            background: linear-gradient(90deg, #27ae60, #2ecc71);
                            border-radius: 12px;
                            transition: width 0.3s ease;
                        "></div>
                        <div style="
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 10px;
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
        product_columns.forEach(c => { system_by_field[c.fieldname] = (c.group_label || '').toString().trim(); });

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
        
        let bar_width_per_day = is_mobile ? 60 : is_tablet ? 80 : 100;
        let canvas_width = num_days * bar_width_per_day;
        let canvas_height = is_mobile ? 300 : is_tablet ? 350 : 450;
        
        if (canvas_width < 300) canvas_width = 300;
        if (canvas_width > 1200) canvas_width = 1200;

        // Create chart wrapper
        const chartWrapper = $(`<div class="chart-wrapper" style="
            overflow-x: auto;
            overflow-y: hidden;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            padding: 20px;
            margin-top: 20px;
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

        // Create datasets for mixed chart
        const datasets = [
            // Bars for Thạch cao
            { label: 'Thực tế (Thạch cao)', data: othersActual, backgroundColor: 'rgba(52, 152, 219, 0.85)', borderColor: 'rgba(52, 152, 219, 1)', borderWidth: 1, stack: 'Others', type: 'bar', order: 1 },
            { label: 'Còn lại (Thạch cao)', data: othersPlanned.map((p,i)=> Math.max(0, p - othersActual[i])), backgroundColor: 'rgba(52, 152, 219, 0.25)', borderColor: 'rgba(52, 152, 219, 0.5)', borderWidth: 1, stack: 'Others', type: 'bar', order: 1 },
            // Lines for P2O5
            { label: 'Kế hoạch (P2O5)', data: p2o5Planned, borderColor: 'rgba(231, 76, 60, 0.9)', backgroundColor: 'rgba(231, 76, 60, 0.0)', borderWidth: 2, fill: false, tension: 0.2, pointRadius: 4, pointHoverRadius: 6, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 0, spanGaps: true },
            { label: 'Thực tế (P2O5)', data: p2o5Actual, borderColor: 'rgba(231, 76, 60, 0.5)', backgroundColor: 'rgba(231, 76, 60, 0.0)', borderDash: [6,4], borderWidth: 2, fill: false, tension: 0.2, pointRadius: 4, pointHoverRadius: 6, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 0, spanGaps: true }
        ];

        const ctx = document.getElementById('daily-production-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Sản lượng sản xuất theo ngày' }
                },
                scales: {
                    x: {
                        type: 'category',
                        stacked: true,
                        grid: { 
                            drawOnChartArea: false,
                            offset: true
                        },
                        ticks: { 
                            autoSkip: false,
                            align: 'center',
                            crossAlign: 'center'
                        },
                        offset: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        min: 0
                    },
                    y2: {
                        position: 'right',
                        beginAtZero: true,
                        min: 0,
                        grid: { drawOnChartArea: false }
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