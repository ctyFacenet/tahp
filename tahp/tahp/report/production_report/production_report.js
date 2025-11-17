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
            "fieldname": "month",
            "label": __("Tháng"),
            "fieldtype": "Select",
            "options": ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
            "on_change": function() {
                frappe.query_reports["Production Report"].handle_month_year_change();
            }
        },
        {
            "fieldname": "year",
            "label": __("Năm"),
            "fieldtype": "Int",
            "default": new Date().getFullYear(),
            "on_change": function() {
                frappe.query_reports["Production Report"].handle_month_year_change();
            }
        }
    ],

    get_datatable_options(options) {
        return { ...options, freezeIndex: 2};
    },

    "onload": function(report) {
        setTimeout(() => { this.render_components(); }, 500);
        
        // Add responsive CSS
        this.add_responsive_styles();

        // Track previous filter values
        let previous_values = {
            from_date: report.get_filter_value("from_date"),
            to_date: report.get_filter_value("to_date"),
            month: report.get_filter_value("month"),
            year: report.get_filter_value("year")
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
    // Month & year filters
    if (report.page.fields_dict.month) report.page.fields_dict.month.$input.on('change', () => on_date_cleared_handler("month"));
    if (report.page.fields_dict.year) report.page.fields_dict.year.$input.on('change', () => on_date_cleared_handler("year"));
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

        const noteTextDiv = document.createElement("div");
        noteTextDiv.innerHTML = `<div>Phần in đậm là kế hoạch<br>Phần in nhạt là thực tế</div>`
        noteTextDiv.style.textAlign = "center";
        noteTextDiv.style.fontWeight = "bold";
        noteTextDiv.style.paddingTop = "10px";

        container.append(gridContainer);
        container.append(noteTextDiv);
        

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
    
        // Create chart wrapper with note section (like production_schedule.js)
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
                <canvas id="daily-production-chart" style="cursor: pointer;"></canvas>
            </div>
            <div class="chart-note" style="
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #6c757d;
                text-align: left;
            ">
                <em>% trong biểu đồ là so sánh kế hoạch và thực tế của thạch cao. Click vào cột để xem chi tiết Work Orders.</em>
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
    
        // Calculate completion percentages for each date (Thạch cao)
        const completionPercentages = dates.map((date, index) => {
            const planned = othersPlanned[index];
            const actual = othersActual[index];
            if (planned > 0) {
                return Math.round((actual / planned) * 100);
            }
            return 0;
        });
    
        // Calculate maximum values and expand Y axis
        const max_y_value = Math.max(...othersPlanned.map((p, i) => p), ...othersActual);
        const max_y2_value = Math.max(...p2o5Planned, ...p2o5Actual);
    
        // Add 20% padding to create space for unit labels
        const padded_max_y = max_y_value > 0 ? max_y_value * 1.2 : 10;
        const padded_max_y2 = max_y2_value > 0 ? max_y2_value * 1.2 : 10;
    
        // Create datasets: Thạch cao as stacked bars; P2O5 as lines
        const datasets = [
            { label: 'Thực tế (Thạch cao)', data: othersActual, backgroundColor: 'rgba(14, 165, 233, 0.5)', borderColor: 'rgba(14, 165, 233, 1)', borderWidth: 2, stack: 'Others', type: 'bar', order: 1 },
            { 
                label: 'Kế hoạch (Thạch cao)', 
                data: othersPlanned.map((p,i)=> Math.max(0, p - othersActual[i])), 
                backgroundColor: 'rgba(14, 165, 233, 0.2)', 
                borderColor: 'rgba(14, 165, 233, 0.6)', 
                borderWidth: 2, 
                stack: 'Others', 
                type: 'bar', 
                order: 1,
                originalPlanned: othersPlanned
            },
            { label: 'Kế hoạch (P2O5)', data: p2o5Planned, borderColor: 'rgba(108, 117, 125, 0.8)', backgroundColor: 'rgba(108, 117, 125, 0.0)', borderWidth: 2, fill: false, tension: 0.2, pointRadius: 4, pointHoverRadius: 6, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 1, spanGaps: true },
            { label: 'Thực tế (P2O5)', data: p2o5Actual, borderColor: 'rgba(220, 38, 127, 1)', backgroundColor: 'rgba(220, 38, 127, 0.0)', borderWidth: 4, fill: false, tension: 0.2, pointRadius: 6, pointHoverRadius: 8, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 0, spanGaps: true }
        ];
    
        // Plugin to display percentage labels on top of bars
        const percentageLabelPlugin = {
            id: 'percentageLabel',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const meta0 = chart.getDatasetMeta(0); // Thực tế Thạch cao
                const meta1 = chart.getDatasetMeta(1); // Kế hoạch Thạch cao (phần còn lại)
                
                ctx.save();
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = '#2c3e50';
                
                meta0.data.forEach((bar, index) => {
                    const percentage = completionPercentages[index];
                    if (percentage !== undefined && percentage !== null) {
                        const x = bar.x;
                        // Get top of stacked bar
                        const plannedBar = meta1.data[index];
                        let topY;
                        if (plannedBar && plannedBar.y !== null) {
                            topY = plannedBar.y;
                        } else if (bar.y !== null) {
                            topY = bar.y;
                        } else {
                            return;
                        }
                        // Display label above the stack bar (5px above)
                        ctx.fillText(`${percentage}%`, x, topY - 5);
                    }
                });
                
                ctx.restore();
            }
        };
    
        const ctx = document.getElementById('daily-production-chart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            plugins: [percentageLabelPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, activeElements) => {
                    // Handle click on chart elements
                    if (activeElements && activeElements.length > 0) {
                        const clickedElement = activeElements[0];
                        const dataIndex = clickedElement.index;
                        const clicked_date = dates[dataIndex];
                        
                        // Show notification
                        frappe.show_alert({
                            message: __(`Đang mở Work Orders cho ${clicked_date}...`),
                            indicator: 'blue'
                        }, 2);
                        
                        // Open in new tab
                        const list_url = `/app/work-order?planned_start_date=${encodeURIComponent(clicked_date)}`;
                        window.open(list_url, '_blank');
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 15,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                
                                // If this is a "Kế hoạch" dataset, show original planned value
                                if (context.dataset.label === 'Kế hoạch (Thạch cao)') {
                                    const originalValue = context.dataset.originalPlanned[context.dataIndex];
                                    label += originalValue.toLocaleString('en-US') + ' Tấn';
                                } else if (context.parsed && context.parsed.y != null) {
                                    label += context.parsed.y.toLocaleString('en-US') + ' Tấn';
                                }
                                return label;
                            },
                            footer: function(tooltipItems) {
                                return 'Click để xem chi tiết Work Orders';
                            }
                        }
                    },
                    legend: { 
                        position: 'top',
                        align: 'start',
                        padding: {
                            top: 0,
                            bottom: 5,
                            left: 10
                        },
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
                            padding: 8,
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
                            size: window.innerWidth < 768 ? 18 : window.innerWidth < 1024 ? 22 : 26,
                            weight: 'bold'
                        },
                        align: 'start',
                        padding: {
                            top: 10,
                            bottom: 10,
                            left: 10
                        }
                    },
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
                            autoSkip: true,
                            maxRotation: 0,
                            minRotation: 0,
                            align: 'center',
                            crossAlign: 'center',
                            font: {
                                size: 9
                            },
                            padding: 5
                        },
                        offset: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: padded_max_y,
                        grid: {
                            drawTicks: false,
                        },
                        ticks: {
                            callback: function(value, index, ticks) {
                                if (index === ticks.length - 1) {
                                    return '( Tấn )';
                                }
                                return value.toLocaleString('en-US');
                            }
                        }
                    },
                    y2: {
                        position: 'right',
                        beginAtZero: true,
                        max: padded_max_y2,
                        grid: { drawOnChartArea: false, drawTicks: false, },
                        ticks: {
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
        // Clear month filter when date range is selected
        const from_date = frappe.query_report.get_filter_value("from_date");
        const to_date = frappe.query_report.get_filter_value("to_date");
        
        if (from_date || to_date) {
            // Clear month filter if user selects explicit dates
            frappe.query_report.set_filter_value("month", "", false);
        }
        
        frappe.query_report.refresh();
        setTimeout(() => {
            this.render_components();
        }, 500);
    },

    "handle_month_year_change": function() {
        const month_value = frappe.query_report.get_filter_value("month");
        const year_value = frappe.query_report.get_filter_value("year");
        
        if (month_value) {
            // Try to extract month number from option like "Tháng 1"
            let month_num = null;
            if (typeof month_value === 'string') {
                const m = month_value.match(/(\d+)/);
                if (m) month_num = parseInt(m[1], 10);
            } else if (typeof month_value === 'number') {
                month_num = month_value;
            }

            // If we could resolve month and year, set from_date/to_date client-side so server receives concrete dates
            if (month_num) {
                const y = year_value || new Date().getFullYear();
                const firstDay = new Date(y, month_num - 1, 1);
                // last day: day 0 of next month
                const lastDay = new Date(y, month_num, 0);

                // Use frappe helper to format date string
                const fromStr = frappe.datetime.obj_to_str(firstDay);
                const toStr = frappe.datetime.obj_to_str(lastDay);

                frappe.query_report.set_filter_value("from_date", fromStr, false);
                frappe.query_report.set_filter_value("to_date", toStr, false);
            } else {
                // Fallback: clear explicit dates so server-side month->date mapping can run
                frappe.query_report.set_filter_value("from_date", "", false);
                frappe.query_report.set_filter_value("to_date", "", false);
            }

            frappe.show_alert({
                message: __(`Đã chọn tháng ${month_value}/${year_value}`),
                indicator: 'blue'
            }, 5);

            frappe.query_report.refresh();
            setTimeout(() => {
                this.render_components();
            }, 500);
        }
    }
};