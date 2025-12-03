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
            "default": function() {
                const now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), 1);
            }(),
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_date_range_change();
            }
        },
        {
            "fieldname": "to_date",
            "label": __("Đến ngày"),
            "fieldtype": "Date",
            "default": function() {
                const now = new Date();
                return new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }(),
            "on_change": function() {
                frappe.query_reports["Material Consumption"].handle_date_range_change();
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

    selected_material: null,
    isDrawing: false,
    chartTimeout: null,
    original_columns: null,

    get_datatable_options(options) {
        return { ...options, freezeIndex: 5};
    },

    "formatter": function(value, row, column, data, default_formatter) {
        // For HTML columns, return value as-is (don't escape)
        if (column.fieldtype === "HTML" && value) {
            return value;
        }
        return default_formatter(value, row, column, data);
    },

    "open_detail_dialog": function(workOrderName) {
        // Call detail reason dialog with work order
        if (typeof frappe.custom_utils_detail_reason === 'function') {
            frappe.custom_utils_detail_reason([workOrderName], null, null);
        } else {
            frappe.msgprint(__('Chức năng chi tiết chưa được tải. Vui lòng tải lại trang.'));
        }
    },
    
    "onload": function(report) {
        // Reset selected material khi load report
        this.selected_material = null;
        
        // Lưu columns gốc từ report sau khi datatable được render
        const self = this;
        this.original_columns = null;
        
        // Hook để lưu columns sau khi datatable render
        frappe.query_reports["Material Consumption"].after_datatable_render = function(datatable) {
            if (frappe.query_report && frappe.query_report.columns) {
                self.original_columns = frappe.query_report.columns.filter((col) => !col.hidden);
            }
            
            // Thêm CSS để header labels hiển thị ngang, KHÔNG động đến transform
            setTimeout(() => {
                const styleId = 'material-consumption-header-style';
                if (!$(`#${styleId}`).length) {
                    $('<style>', {
                        id: styleId,
                        text: `
                            /* Chỉ target header cells content, KHÔNG override transform */
                            .report-wrapper .dt-header .dt-cell__content-text {
                                writing-mode: horizontal-tb !important;
                                text-orientation: mixed !important;
                                white-space: normal !important;
                                word-wrap: break-word !important;
                                overflow-wrap: break-word !important;
                                max-width: 100%;
                            }
                        `
                    }).appendTo('head');
                }
                
                // KHÔNG apply transform: none, chỉ sửa text orientation
                if (datatable && datatable.$wrapper) {
                    datatable.$wrapper.find('.dt-header .dt-cell__content-text').each(function() {
                        const $text = $(this);
                        // CHỈ sửa text properties, KHÔNG động đến transform
                        $text.css({
                            'writing-mode': 'horizontal-tb',
                            'text-orientation': 'mixed',
                            'white-space': 'normal',
                            'word-wrap': 'break-word',
                            'overflow-wrap': 'break-word'
                        });
                    });
                }
            }, 100);
        };
        
        setTimeout(() => {
            this.draw_chart();
        }, 500);

        let previous_values = {
            from_date: report.get_filter_value("from_date"),
            to_date: report.get_filter_value("to_date"),
            month: report.get_filter_value("month"),
            year: report.get_filter_value("year")
        };

        const on_date_cleared_handler = (fieldname) => {
            const new_value = report.page.fields_dict[fieldname].get_value();
            const old_value = previous_values[fieldname];
            if (old_value && !new_value) {
                this.selected_material = null; // Reset filter
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
        this.selected_material = null; // Reset filter khi đổi filter
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
            frappe.query_report.set_filter_value("month", "", false);
        }
        
        this.selected_material = null; // Reset filter
        frappe.query_report.refresh();
        setTimeout(() => {
            if (!this.isDrawing) {
                this.draw_chart();
            }
            this.override_report_title(frappe.query_report);
        }, 500);
    },

    "handle_month_year_change": function() {
        const month_value = frappe.query_report.get_filter_value("month");
        const year_value = frappe.query_report.get_filter_value("year");
        
        if (month_value) {
            frappe.query_report.set_filter_value("from_date", "", false);
            frappe.query_report.set_filter_value("to_date", "", false);
            
            frappe.show_alert({
                message: __(`Đã chọn tháng ${month_value}/${year_value}`),
                indicator: 'green'
            }, 5);
            
            this.selected_material = null; // Reset filter
            frappe.query_report.refresh();
            setTimeout(() => {
                if (!this.isDrawing) {
                    this.draw_chart();
                }
                this.override_report_title(frappe.query_report);
            }, 500);
        }
    },

    "override_report_title": function(report) {
    },

    "draw_chart": function() { 
        // Nếu đang vẽ chart, bỏ qua
        if (this.isDrawing) return;
        
        // Clear timeout cũ nếu có
        if (this.chartTimeout) {
            clearTimeout(this.chartTimeout);
            this.chartTimeout = null;
        }
        
        // Set flag để tránh vẽ nhiều lần
        this.isDrawing = true;
        
        // Destroy charts cũ trước
        let existing_chart1 = Chart.getChart("myCustomChart");
        if (existing_chart1) existing_chart1.destroy();
        let existing_chart2 = Chart.getChart("mySecondChart");
        if (existing_chart2) existing_chart2.destroy();
        let existing_chart3 = Chart.getChart("percentageChart");
        if (existing_chart3) existing_chart3.destroy();
        
        // Xóa container cũ
        $('.report-wrapper .chart-container').remove();
        
        const data_rows = frappe.query_report.data;
        if (!data_rows || data_rows.length === 0) {
            this.isDrawing = false;
            return;
        }

        let material_summary = this.aggregate_data_for_charts(data_rows);

        let material_summary_for_percent_chart = material_summary
            .map(m => {
                let percent = 0;
                if (m.total_planned_qty > 0) {
                    percent = (m.total_actual_qty / m.total_planned_qty) * 100;
                }
                return {
                    ...m,
                    percent_vs_planned: percent
                };
            })
            .filter(m => m.total_actual_qty > 0)
            .sort((a, b) => b.percent_vs_planned - a.percent_vs_planned);

        // Nếu có filter, chỉ hiển thị material đó
        if (this.selected_material) {
            material_summary_for_percent_chart = material_summary_for_percent_chart.filter(
                m => m.material_name === this.selected_material
            );
        }

        // Delay để đảm bảo DOM đã cleanup
        const self = this;
        setTimeout(() => {
            self.draw_percentage_chart(material_summary_for_percent_chart);
        }, 100);

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
        if (!material_summary_data || material_summary_data.length === 0) {
            this.isDrawing = false;
            return;
        }

        // Đảm bảo container cũ đã được xóa
        $('.report-wrapper .chart-container').remove();
        
        // Destroy chart cũ nếu có
        let existing_chart = Chart.getChart("percentageChart");
        if (existing_chart) {
            existing_chart.destroy();
        }

        // Tính toán chiều rộng dựa vào số lượng cột
        const numBars = material_summary_data.length;
        let chartHeight = 450; // Tăng chiều cao để có không gian cho labels
        let minWidth = 800; // Tăng chiều rộng tối thiểu
        
        // Điều chỉnh dựa trên số lượng cột
        if (numBars === 1) {
            minWidth = 400;
            chartHeight = 400;
        } else if (numBars <= 3) {
            minWidth = 600;
        } else if (numBars > 5) {
            // Với nhiều cột, tăng chiều rộng để tránh labels dính nhau
            minWidth = Math.max(800, numBars * 120);
        }

        const chartContainer = $(`<div class="chart-container chart-3" style="position: relative; height: ${chartHeight}px; width: 100%; margin-bottom: 40px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <div style="min-width: ${minWidth}px; width: 100%; height: 100%; padding-bottom: 20px;">
                <canvas id="percentageChart" style="width: 100%; height: 100%;"></canvas>
            </div>
        </div>`);
        $('.report-wrapper').prepend(chartContainer);

        const labels = material_summary_data.map(d => `${d.material_name} (${d.uom})`);
        
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

        const background_colors = material_summary_data.map((_, index) => {
            return material_colors[index % material_colors.length].bg;
        });
        const border_colors = material_summary_data.map((_, index) => {
            return material_colors[index % material_colors.length].border;
        });

        // Draw reference line earlier in the draw cycle so tooltips and dataset labels
        // render above it. Use `beforeDraw` instead of `afterDraw` to lower its z-order.
        const referenceLinePlugin = {
            id: 'referenceLinePlugin',
            beforeDraw(chart) {
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
                    // ctx.fillText('Định mức (100%)', chartArea.right - 10, yValue - 8);
                    ctx.restore();
                }
            }
        };

        const dataLabelsPlugin = {
            id: 'dataLabelsPlugin',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                
                ctx.save();
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = '#374151';
                
                data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        const label = `${value.toFixed(1)}%`;
                        
                        const xPos = bar.x;
                        const yPos = bar.y - 5;
                        
                        ctx.fillText(label, xPos, yPos);
                    });
                });
                
                ctx.restore();
            }
        };

        // Kiểm tra canvas có tồn tại không
        const canvas = document.getElementById('percentageChart');
        if (!canvas) {
            this.isDrawing = false;
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const self = this;
        
        // Tính toán barPercentage dựa vào số lượng cột
        let barPercentage = 0.7;
        let categoryPercentage = 0.8;
        
        if (numBars === 1) {
            barPercentage = 0.3;
            categoryPercentage = 0.5;
        } else if (numBars <= 3) {
            barPercentage = 0.5;
            categoryPercentage = 0.7;
        }
        
        try {
            new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tỷ lệ tiêu hao', 
                    data: material_summary_data.map(d => d.percent_vs_planned),
                    backgroundColor: background_colors,
                    borderColor: border_colors,
                    borderWidth: 1,
                    barPercentage: barPercentage,
                    categoryPercentage: categoryPercentage
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 20,
                        bottom: 30 // Tăng padding dưới để có không gian cho labels
                    }
                },
                onClick: function(event, activeElements) {
                    if (activeElements.length > 0 && !self.isDrawing) {
                        const index = activeElements[0].index;
                        const clicked_material = material_summary_data[index].material_name;
                        
                        if (self.selected_material === clicked_material) {
                            self.selected_material = null;
                            frappe.show_alert({
                                message: __('Đã bỏ lọc nguyên liệu'),
                                indicator: 'orange'
                            }, 3);
                        } else {
                            self.selected_material = clicked_material;
                            frappe.show_alert({
                                message: __(`Đang lọc: ${clicked_material}`),
                                indicator: 'blue'
                            }, 3);
                        }
                        
                        // Refresh datatable trước
                        self.refresh_datatable();
                        
                        // Clear timeout cũ nếu có
                        if (self.chartTimeout) {
                            clearTimeout(self.chartTimeout);
                        }
                        
                        // Sau đó refresh chart với delay
                        self.chartTimeout = setTimeout(() => {
                            self.draw_chart();
                        }, 200);
                    }
                },
                scales: {
                    x: { 
                        ticks: { 
                            autoSkip: false,
                            maxRotation: 0,
                            minRotation: 0,
                            padding: 5,
                            align: 'center',
                            crossAlign: 'center',
                            font: {
                                size: 11
                            },
                            // Callback để wrap text nếu quá dài
                            callback: function(value, index) {
                                const label = this.getLabelForValue(value);
                                // Nếu label quá dài (>25 ký tự), chia thành nhiều dòng
                                if (label.length > 25) {
                                    const words = label.split(' ');
                                    const lines = [];
                                    let currentLine = '';
                                    
                                    words.forEach(word => {
                                        const testLine = currentLine + (currentLine ? ' ' : '') + word;
                                        if (testLine.length > 20) {
                                            if (currentLine) lines.push(currentLine);
                                            currentLine = word;
                                        } else {
                                            currentLine = testLine;
                                        }
                                    });
                                    if (currentLine) lines.push(currentLine);
                                    return lines;
                                }
                                return label;
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            callback: function(value) { return value + '%'; },
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: self.selected_material 
                            ? `Tỷ lệ Tiêu hao: ${self.selected_material} - Click để bỏ lọc`
                            : 'Biểu đồ Tỷ lệ Tiêu hao Thực tế / Định mức (%) - Click để lọc',
                        font: { 
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        align: 'center',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 10
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const labels = data.labels;
                                    const bgColors = data.datasets[0].backgroundColor;
                                    const borderColors = data.datasets[0].borderColor;
                                    
                                    return labels.map((label, index) => {
                                        // Rút ngắn label nếu quá dài trong legend
                                        let displayLabel = label;
                                        if (label.length > 35) {
                                            displayLabel = label.substring(0, 32) + '...';
                                        }
                                        return {
                                            text: displayLabel,
                                            fillStyle: bgColors[index],
                                            strokeStyle: borderColors[index],
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
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        },
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
                                    `Định mức: ${planned.toLocaleString('vi-VN', {maximumFractionDigits: 1})} ${uom}`,
                                    '',
                                    self.selected_material ? 'Click để bỏ lọc' : 'Click để lọc nguyên liệu này'
                                ];
                            }
                        }
                    }
                }
            },
            plugins: [referenceLinePlugin, dataLabelsPlugin]
        });
        
        // Reset flag sau khi chart được tạo thành công
        this.isDrawing = false;
        } catch (error) {
            console.error("Lỗi khi vẽ chart:", error);
            this.isDrawing = false;
        }
    },

    // === HÀM REFRESH DATATABLE ===
    "refresh_datatable": function() {
        if (!frappe.query_report || !frappe.query_report.datatable) return;
        
        const filtered_data = this.get_filtered_data();
        let columns = this.original_columns;
        
        if (!columns || columns.length === 0) {
            columns = frappe.query_report.columns || [];
            if (columns.length === 0) {
                columns = frappe.query_report.datatable.datamanager.columns || [];
            }
            columns = columns.filter((col) => !col.hidden);
        }
        
        if (columns.length === 0) {
            console.warn("Columns không tồn tại, không thể refresh datatable");
            return;
        }
        
        const columns_copy = columns.map(col => ({ ...col }));
        
        if (frappe.query_report.datatable && typeof frappe.query_report.datatable.refresh === 'function') {
            try {
                frappe.query_report.datatable.refresh(filtered_data, columns_copy);
                
                // Apply CSS sau khi refresh - CHỈ sửa text, KHÔNG động đến transform
                setTimeout(() => {
                    if (frappe.query_report.datatable && frappe.query_report.datatable.$wrapper) {
                        frappe.query_report.datatable.$wrapper.find('.dt-header .dt-cell__content-text').each(function() {
                            const $text = $(this);
                            // CHỈ sửa text properties
                            $text.css({
                                'writing-mode': 'horizontal-tb',
                                'text-orientation': 'mixed',
                                'white-space': 'normal',
                                'word-wrap': 'break-word',
                                'overflow-wrap': 'break-word'
                            });
                        });
                    }
                }, 50);
            } catch (error) {
                console.error("Lỗi khi refresh datatable:", error);
                frappe.query_report.refresh();
            }
        } else {
            frappe.query_report.refresh();
        }
    },

    // === HÀM LỌC DATA ===
    "get_filtered_data": function() {
        let data = frappe.query_report.data || [];
        
        // Nếu có filter material, chỉ hiển thị material đó
        if (this.selected_material) {
            data = data.filter(row => row.material_name === this.selected_material);
        }
        
        return data;
    }
};