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

    "calculate_individual_scales": function(material_summary) {
        if (material_summary.length === 0) return material_summary;
        
        const non_zero_values = material_summary
            .map(m => Math.max(m.total_actual_qty, m.total_planned_qty))
            .filter(v => v > 0);
        
        if (non_zero_values.length === 0) return material_summary;
        
        const min_value = Math.min(...non_zero_values);
        
        return material_summary.map(material => {
            const max_material_value = Math.max(material.total_actual_qty, material.total_planned_qty);
            
            if (max_material_value === 0) {
                return {
                    ...material,
                    scale_factor: 1,
                    scale_label: '',
                    scaled_actual_qty: material.total_actual_qty,
                    scaled_planned_qty: material.total_planned_qty
                };
            }
            
            const ratio = max_material_value / min_value;
            
            let scale_factor = 1;
            let scale_label = '';
            if (ratio >= 10000000000) {
                scale_factor = 10000000000;
                scale_label = '(10 Tỷ ';
            } else if (ratio >= 1000000000) {
                scale_factor = 1000000000;
                scale_label = '(1 Tỷ ';
            } else if (ratio >= 100000000) {
                scale_factor = 100000000;
                scale_label = '(100 Triệu ';
            } else if (ratio >= 10000000) {
                scale_factor = 10000000;
                scale_label = '(10 Triệu ';
            } else if (ratio >= 1000000) {
                scale_factor = 1000000;
                scale_label = '(Triệu ';
            } else if (ratio >= 10000) {
                scale_factor = 10000;
                scale_label = '(10K ';
            } else if (ratio >= 1000) {
                scale_factor = 1000;
                scale_label = '(Nghìn ';
            } else if (ratio >= 100) {
                scale_factor = 100;
                scale_label = '(100 ';
            } else if (ratio >= 10) {
                scale_factor = 10;
                scale_label = '(10 ';
            }
            
            return {
                ...material,
                scale_factor: scale_factor,
                scale_label: scale_label,
                scaled_actual_qty: material.total_actual_qty / scale_factor,
                scaled_planned_qty: material.total_planned_qty / scale_factor,
                original_actual_qty: material.total_actual_qty,
                original_planned_qty: material.total_planned_qty
            };
        });
    },

    "draw_chart": function() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        
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
        // material_summary = this.calculate_individual_scales(material_summary);
        
        // this.draw_first_chart(material_summary);
        
        // setTimeout(() => {
        //     this.draw_second_chart(data_rows, material_summary);
        //     this.isDrawing = false;
        // }, 100);
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

    // "draw_first_chart": function(material_summary) {
    //     if (material_summary.length === 0) return;
        
    //     const bar_thickness = 40;
    //     const chart_padding = 120;
    //     const num_bars = material_summary.length;
    //     let calculated_height = (num_bars * bar_thickness) + chart_padding;
    //     calculated_height = Math.max(300, Math.min(600, calculated_height));
        
    //     const chartContainer = $(`<div class="chart-container chart-1" style="position: relative; height: ${calculated_height}px; width: 100%; margin-bottom: 20px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;">
    //         <div style="min-width: 600px; width: 100%; height: 100%;">
    //             <canvas id="myCustomChart" style="width: 100%; height: 100%;"></canvas>
    //         </div>
    //     </div>`);
    //     $('.report-wrapper').prepend(chartContainer);

    //     const labels = material_summary.map(row => {
    //         if (row.scale_label) {
    //             return `${row.material_name} ${row.scale_label}${row.uom})`;
    //         }
    //         return `${row.material_name} (${row.uom})`;
    //     });
        
    //     const actual_data = material_summary.map(row => row.scaled_actual_qty);
    //     const planned_data = material_summary.map(row => row.scaled_planned_qty);

    //     const material_colors = [
    //         { bg: 'rgba(99, 102, 241, 0.5)', border: 'rgba(99, 102, 241, 1)' }, 
    //         { bg: 'rgba(14, 165, 233, 0.5)', border: 'rgba(14, 165, 233, 1)' }, 
    //         { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' }, 
    //         { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' }, 
    //         { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 1)' }, 
    //         { bg: 'rgba(251, 207, 232, 0.5)', border: 'rgba(251, 207, 232, 1)' }, 
    //         { bg: 'rgba(34, 211, 238, 0.5)', border: 'rgba(34, 211, 238, 1)' }, 
    //         { bg: 'rgba(132, 204, 22, 0.5)', border: 'rgba(132, 204, 22, 1)' }, 
    //         { bg: 'rgba(59, 130, 246, 0.5)', border: 'rgba(59, 130, 246, 1)' }, 
    //         { bg: 'rgba(139, 69, 19, 0.5)', border: 'rgba(139, 69, 19, 1)' }, 
    //         { bg: 'rgba(75, 85, 99, 0.5)', border: 'rgba(75, 85, 99, 1)' }, 
    //         { bg: 'rgba(236, 72, 153, 0.5)', border: 'rgba(236, 72, 153, 1)' },
    //     ];
        
    //     const material_color_map = {};
    //     const material_scale_map = {};
    //     material_summary.forEach((material, index) => {
    //         material_color_map[material.material_name] = material_colors[index % material_colors.length];
    //         material_scale_map[material.material_name] = {
    //             scale_factor: material.scale_factor,
    //             scale_label: material.scale_label,
    //             uom: material.uom
    //         };
    //     });
    //     this.material_color_map = material_color_map;
    //     this.material_scale_map = material_scale_map;

    //     const plannedLinePlugin = {
    //         id: 'plannedLinePlugin',
    //         afterDatasetsDraw(chart) {
    //             const { ctx, scales: { x, y } } = chart;
    //             ctx.save();
    //             ctx.strokeStyle = 'rgba(244, 63, 94, 1)';
    //             ctx.lineWidth = 1.5;
                
    //             chart.plannedLines = [];
                
    //             planned_data.forEach((plannedValue, i) => {
    //                 if (plannedValue > 0) {
    //                     const yValue = y.getPixelForValue(i);
    //                     const barHeight = 20;
    //                     const xValue = x.getPixelForValue(plannedValue);
                        
    //                     const chartArea = chart.chartArea;
    //                     if (xValue >= chartArea.left && xValue <= chartArea.right) {
    //                         const original_value = material_summary[i].original_planned_qty || plannedValue;
    //                         chart.plannedLines.push({
    //                             x: xValue, y: yValue, 
    //                             value: plannedValue,
    //                             original_value: original_value,
    //                             label: labels[i], 
    //                             barHeight: barHeight
    //                         });
                            
    //                         ctx.beginPath();
    //                         ctx.moveTo(xValue, yValue - barHeight / 2);
    //                         ctx.lineTo(xValue, yValue + barHeight / 2);
    //                         ctx.stroke();
    //                     }
    //                 }
    //             });
    //             ctx.restore();
    //         },
            
    //         afterEvent(chart, args) {
    //             const { event } = args;
    //             if (!chart.plannedLines) return;
                
    //             const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
    //             const x = canvasPosition.x;
    //             const y = canvasPosition.y;
                
    //             if (!chart.customTooltip) {
    //                 chart.customTooltip = document.createElement('div');
    //                 chart.customTooltip.id = 'planned-line-tooltip';
    //                 chart.customTooltip.style.cssText = `
    //                     position: fixed; background: #000; color: #fff; padding: 10px 15px; border-radius: 6px; font-size: 13px;
    //                     pointer-events: none; z-index: 999999; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    //                 `;
    //                 document.body.appendChild(chart.customTooltip);
    //             }
                
    //             const hoveredLine = chart.plannedLines.find(line => {
    //                 return Math.abs(x - line.x) <= 15 && y >= line.y - line.barHeight/2 && y <= line.y + line.barHeight/2;
    //             });
                
    //             if (hoveredLine) {
    //                 chart.canvas.style.cursor = 'pointer';
    //                 const canvasRect = chart.canvas.getBoundingClientRect();
    //                 chart.customTooltip.innerHTML = `<div><strong>${hoveredLine.label}</strong></div><div>Định mức: ${hoveredLine.value.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}</div>`;
    //                 chart.customTooltip.style.display = 'block';
    //                 chart.customTooltip.style.left = (canvasRect.left + x + 15) + 'px';
    //                 chart.customTooltip.style.top = (canvasRect.top + y - 40) + 'px';
    //             } else {
    //                 chart.canvas.style.cursor = 'default';
    //                 if (chart.customTooltip) {
    //                     chart.customTooltip.style.display = 'none';
    //                 }
    //             }
    //         }
    //     };

    //     const material_datasets = material_summary.map((material, index) => {
    //         const data = new Array(material_summary.length).fill(0);
    //         data[index] = material.scaled_actual_qty;
            
    //         const label_text = material.scale_label ? 
    //             `${material.material_name} ${material.scale_label}${material.uom})` : 
    //             `${material.material_name} (${material.uom})`;
            
    //         return {
    //             label: label_text,
    //             data: data,
    //             original_data: material.original_actual_qty,
    //             material_index: index,
    //             backgroundColor: material_color_map[material.material_name]?.bg || 'rgba(75, 85, 99, 0.5)',
    //             borderColor: material_color_map[material.material_name]?.border || 'rgba(75, 85, 99, 1)',
    //             borderWidth: 1,
    //             stack: 'actual'
    //         };
    //     });

    //     material_datasets.push({
    //         label: 'Định mức',
    //         data: new Array(material_summary.length).fill(null),
    //         type: 'line',
    //         borderColor: 'rgba(244, 63, 94, 1)',
    //         borderWidth: 1.5,
    //         pointStyle: 'line',
    //         fill: false,
    //         showLine: false
    //     });

    //     const ctx = document.getElementById('myCustomChart').getContext('2d');
            
    //     new Chart(ctx, {
    //         type: 'bar',
    //         data: { labels, datasets: material_datasets },
    //         options: {
    //             indexAxis: 'y',
    //             responsive: true,
    //             maintainAspectRatio: false,
    //             plugins: {
    //                 legend: { 
    //                     position: 'bottom', 
    //                     labels: { 
    //                         usePointStyle: true, 
    //                         boxWidth: 15, 
    //                         padding: 15,
    //                         font: {
    //                             size: window.innerWidth < 768 ? 10 : 12
    //                         }
    //                     } 
    //                 },
    //                 title: { 
    //                     display: true, 
    //                     text: 'Số lượng nguyên vật liệu tiêu hao',
    //                     font: { 
    //                         size: window.innerWidth < 768 ? 14 : 18 
    //                     },
    //                     align: window.innerWidth < 768 ? 'start' : 'center'
    //                 },
    //                 tooltip: {
    //                     enabled: true,
    //                     callbacks: {
    //                         label: function(context) {
    //                             const datasetIndex = context.datasetIndex;
    //                             const dataIndex = context.dataIndex;
    //                             const dataset = context.dataset;
                                
    //                             // Hiển thị giá trị đã scale
    //                             if (dataset.data && dataset.data[dataIndex] !== null && dataset.data[dataIndex] !== undefined) {
    //                                 const scaled_value = dataset.data[dataIndex];
    //                                 return `${dataset.label}: ${scaled_value.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}`;
    //                             }
                                
    //                             return '';
    //                             // if (!dataset.original_data) {
    //                             //     return '';
    //                             // }
                                
    //                             // const material = material_summary[dataIndex];
    //                             // if (material && material.original_actual_qty !== undefined) {
    //                             //     return `${dataset.label}: ${material.original_actual_qty.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}`;
    //                             // }
                                
    //                             // return `${dataset.label}: ${dataset.original_data.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}`;
    //                         }
    //                     }
    //                 },
    //                 // datalabels: {
    //                 //     display: function(context) {
    //                 //         return context.dataset.stack === 'actual' && context.dataset.data[context.dataIndex] > 0;
    //                 //     },
    //                 //     // --- THAY ĐỔI TẠI ĐÂY ---
    //                 //     anchor: 'end',      // Neo ở cuối cột (phía bên phải)
    //                 //     align: 'start',     // Căn lề 'start' (vẽ chữ BÊN NGOÀI, về phía bên phải)
    //                 //     offset: 4,          // Khoảng cách 4px từ cuối cột
    //                 //     clamp: true,        // Đảm bảo nhãn không bị vẽ ra ngoài khung chart
    //                 //     // --- KẾT THÚC THAY ĐỔI ---
    //                 //     color: '#333', 
    //                 //     font: {
    //                 //         weight: 'bold',
    //                 //         size: window.innerWidth < 768 ? 9 : 10
    //                 //     },
    //                 //     formatter: function(value, context) {
    //                 //         const material = material_summary[context.dataIndex];
    //                 //         let original_val = 0;

    //                 //         if (material && material.original_actual_qty !== undefined) {
    //                 //             original_val = material.original_actual_qty;
    //                 //         } else if (context.dataset.original_data) {
    //                 //             original_val = context.dataset.original_data;
    //                 //         }

    //                 //         if (original_val > 0) {
    //                 //             return original_val.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1});
    //                 //         }
    //                 //         return '';
    //                 //     }
    //                 // }
    //             },
    //             scales: { 
    //                 x: { 
    //                     beginAtZero: true,
    //                     max: Math.max(Math.max(...actual_data), Math.max(...planned_data)) * 1.1,
    //                     ticks: {
    //                         font: {
    //                             size: window.innerWidth < 768 ? 10 : 12
    //                         },
    //                         callback: function(value) {
    //                             return value.toLocaleString('vi-VN', {
    //                                 minimumFractionDigits: 0,
    //                                 maximumFractionDigits: 1
    //                             });
    //                         }
    //                     }
    //                 },
    //                 y: {
    //                     ticks: {
    //                         font: {
    //                             size: window.innerWidth < 768 ? 10 : 12
    //                         }
    //                     }
    //                 }
    //             }
    //         },
    //         plugins: [plannedLinePlugin]
    //     });
    // },

    // "draw_second_chart": function(data_rows, material_summary_with_scales) {
    //     const columns = frappe.query_report.columns;
    //     const production_items = [];

    //     columns.forEach(col => {
    //         if (col.fieldname && col.fieldname.endsWith('_actual')) {
    //             let item_name = col.parent;
    //             if (!item_name) {
    //                 const fieldname_without_suffix = col.fieldname.replace('_actual', '');
    //                 const corresponding_col = columns.find(c => c.fieldname === fieldname_without_suffix + '_actual_per_ton');
    //                 if (corresponding_col && corresponding_col.parent) {
    //                     item_name = corresponding_col.parent;
    //                 }
    //             }
    //             if (item_name) {
    //                 production_items.push({
    //                     name: item_name,
    //                     actual_field: col.fieldname,
    //                     planned_field: col.fieldname.replace('_actual', '_planned')
    //                 });
    //             }
    //         }
    //     });

    //     if (production_items.length === 0) return;

    //     const material_color_map = this.material_color_map || {};
    //     const material_scale_map = this.material_scale_map || {};
    //     const valid_material_names = Object.keys(material_color_map);
        
    //     if (valid_material_names.length === 0) return;
        
    //     const chartContainer2 = $(`<div class="chart-container chart-2" style="position: relative; height: 400px; width: 100%; margin-top: 40px; margin-bottom: 40px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;">
    //         <div style="min-width: 600px; width: 100%; height: 100%;">
    //             <canvas id="mySecondChart" style="width: 100%; height: 100%;"></canvas>
    //         </div>
    //     </div>`);
        
    //     if (!document.getElementById('mobile-chart-styles')) {
    //         const style = document.createElement('style');
    //         style.id = 'mobile-chart-styles';
    //         style.textContent = `
    //             @media (max-width: 768px) {
    //                 .chart-container.chart-1, .chart-container.chart-2 {
    //                     height: 350px !important;
    //                     margin-top: 20px !important;
    //                     margin-bottom: 20px !important;
    //                 }
    //                 .chart-container.chart-1 > div, .chart-container.chart-2 > div {
    //                     min-width: 500px !important;
    //                 }
    //             }
    //             @media (max-width: 480px) {
    //                 .chart-container.chart-1, .chart-container.chart-2 {
    //                     height: 300px !important;
    //                     margin-top: 15px !important;
    //                     margin-bottom: 15px !important;
    //                 }
    //                 .chart-container.chart-1 > div, .chart-container.chart-2 > div {
    //                     min-width: 450px !important;
    //                 }
    //             }
    //         `;
    //         document.head.appendChild(style);
    //     }
    //     $('.report-wrapper .chart-1').after(chartContainer2);

    //     const labels2 = production_items.map(item => item.name);

    //     const plannedLinePlugin2 = {
    //         id: 'plannedLinePlugin2',
    //         afterDatasetsDraw(chart) {
    //             const { ctx } = chart;
    //             ctx.save();
                
    //             chart.plannedLines2 = [];
                
    //             chart.data.datasets.forEach((dataset, i) => {
    //                 if (!dataset.plannedData || chart.isDatasetVisible(i) === false) return;
                    
    //                 const meta = chart.getDatasetMeta(i);
                    
    //                 ctx.beginPath();
    //                 ctx.lineWidth = 2.5;
    //                 ctx.strokeStyle = 'rgba(244, 63, 94, 1)'; 

    //                 meta.data.forEach((bar, index) => {
    //                     const plannedValue = dataset.plannedData[index];
    //                     const originalPlannedValue = dataset.originalPlannedData[index];
    //                     const actualValue = dataset.data[index];
                        
    //                     if (plannedValue > 0 && actualValue !== null) {
    //                         const y = chart.scales.y.getPixelForValue(plannedValue);
    //                         const x = bar.x;
    //                         const barWidth = bar.width;
    //                         const lineStartX = x - barWidth / 2;
    //                         const lineEndX = x + barWidth / 2;
                            
    //                         if (y >= chart.chartArea.top && y <= chart.chartArea.bottom) {
    //                             ctx.moveTo(lineStartX, y);
    //                             ctx.lineTo(lineEndX, y);
                                
    //                             chart.plannedLines2.push({
    //                                 x: lineStartX, y: y, width: barWidth,
    //                                 value: plannedValue,
    //                                 original_value: originalPlannedValue,
    //                                 label: `${dataset.label}`
    //                             });
    //                         }
    //                     }
    //                 });
    //                 ctx.stroke();
    //             });
                
    //             ctx.restore();
    //         },
    //         afterEvent(chart, args) {
    //             const { event } = args;
    //             if (!chart.plannedLines2) return;
                
    //             const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
    //             const x = canvasPosition.x;
    //             const y = canvasPosition.y;

    //             if (!chart.customTooltip2) {
    //                 chart.customTooltip2 = document.createElement('div');
    //                 chart.customTooltip2.id = 'planned-line-tooltip-2';
    //                 chart.customTooltip2.style.cssText = `
    //                     position: fixed; background: #000; color: #fff; padding: 10px 15px; border-radius: 6px;
    //                     font-size: 13px; pointer-events: none; z-index: 999999; display: none;
    //                     box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    //                 `;
    //                 document.body.appendChild(chart.customTooltip2);
    //             }

    //             const hoveredLine = chart.plannedLines2.find(line => 
    //                 x >= line.x && x <= line.x + line.width && Math.abs(y - line.y) < 5
    //             );

    //             if (hoveredLine) {
    //                 chart.canvas.style.cursor = 'pointer';
    //                 const canvasRect = chart.canvas.getBoundingClientRect();
    //                 chart.customTooltip2.innerHTML = `<div><strong>${hoveredLine.label}</strong></div><div>Định mức: ${hoveredLine.value.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}</div>`;
    //                 chart.customTooltip2.style.display = 'block';
    //                 chart.customTooltip2.style.left = `${canvasRect.left + event.x + 15}px`;
    //                 chart.customTooltip2.style.top = `${canvasRect.top + event.y - 15}px`;
    //             } else {
    //                 chart.canvas.style.cursor = 'default';
    //                 if (chart.customTooltip2) {
    //                     chart.customTooltip2.style.display = 'none';
    //                 }
    //             }
    //         }
    //     };

    //     const transform_zero_to_null = (value) => (value === 0 || !value ? null : value);

    //     const material_summary_by_product = {};
    //     data_rows.forEach(row => {
    //         const material_name = row.material_name;
    //         if (!valid_material_names.includes(material_name)) {
    //             return;
    //         }

    //         if (!material_summary_by_product[material_name]) {
    //             material_summary_by_product[material_name] = {
    //                 material_name: material_name, 
    //                 uom: row.uom, 
    //                 data: {}
    //             };
    //             production_items.forEach(item => {
    //                 material_summary_by_product[material_name].data[item.actual_field] = 0;
    //                 material_summary_by_product[material_name].data[item.planned_field] = 0;
    //             });
    //         }
            
    //         production_items.forEach(item => {
    //             material_summary_by_product[material_name].data[item.actual_field] += (row[item.actual_field] || 0);
    //             material_summary_by_product[material_name].data[item.planned_field] += (row[item.planned_field] || 0);
    //         });
    //     });

    //     let datasets2 = [];
    //     Object.values(material_summary_by_product).forEach(material_data => {
    //         const material_name = material_data.material_name;
    //         const scale_info = material_scale_map[material_name] || { scale_factor: 1, scale_label: '', uom: material_data.uom };
            
    //         const material_name_with_unit = scale_info.scale_label ? 
    //             `${material_name} ${scale_info.scale_label}${scale_info.uom})` : 
    //             `${material_name} (${scale_info.uom})`;
                
    //         const color_info = material_color_map[material_name] || { bg: 'rgba(128,128,128,0.5)', border: 'rgba(128,128,128,1)'};
            
    //         const actual_data_original = production_items.map(item => 
    //             material_data.data[item.actual_field] || 0
    //         );
    //         const planned_data_original = production_items.map(item => 
    //             material_data.data[item.planned_field] || 0
    //         );
            
    //         const actual_data = actual_data_original.map(val => 
    //             transform_zero_to_null(val / scale_info.scale_factor)
    //         );
    //         const planned_data = planned_data_original.map(val => 
    //             transform_zero_to_null(val / scale_info.scale_factor)
    //         );

    //         datasets2.push({
    //             label: material_name_with_unit,
    //             data: actual_data,
    //             plannedData: planned_data,
    //             originalActualData: actual_data_original,
    //             originalPlannedData: planned_data_original,
    //             backgroundColor: color_info.bg,
    //             borderColor: color_info.border,
    //             borderWidth: 1,
    //             skipNull: true,
    //         });
    //     });
        
    //     datasets2.push({
    //         label: 'Định mức', 
    //         data: [], 
    //         type: 'line',
    //         borderColor: 'rgba(244, 63, 94, 1)', 
    //         borderWidth: 2.5, 
    //         pointStyle: 'line', 
    //         fill: false,
    //     });

    //     const ctx2 = document.getElementById('mySecondChart').getContext('2d');
            
    //     new Chart(ctx2, {
    //         type: 'bar',
    //         data: { labels: labels2, datasets: datasets2 },
    //         options: {
    //             responsive: true,
    //             maintainAspectRatio: false,
    //             interaction: {
    //                 intersect: false,
    //                 mode: 'index'
    //             },
    //             scales: {
    //                 x: { 
    //                     stacked: false, 
    //                     grid: { display: false }, 
    //                     ticks: { 
    //                         autoSkip: false, 
    //                         maxRotation: 45, 
    //                         minRotation: 0,
    //                         font: {
    //                             size: window.innerWidth < 768 ? 10 : 12
    //                         }
    //                     } 
    //                 },
    //                 y: { 
    //                     stacked: false, 
    //                     beginAtZero: true,
    //                     ticks: {
    //                         font: {
    //                             size: window.innerWidth < 768 ? 10 : 12
    //                         },
    //                         callback: function(value) {
    //                             return value.toLocaleString('vi-VN', {
    //                                 minimumFractionDigits: 0,
    //                                 maximumFractionDigits: 1
    //                             });
    //                         }
    //                     }
    //                 }
    //             },
    //             plugins: {
    //                 title: { 
    //                     display: true, 
    //                     text: 'Nguyên liệu tiêu thụ theo từng sản phẩm',
    //                     font: { 
    //                         size: window.innerWidth < 768 ? 14 : 18 
    //                     },
    //                     align: window.innerWidth < 768 ? 'start' : 'center'
    //                 },
    //                 legend: { 
    //                     position: 'bottom', 
    //                     labels: { 
    //                         usePointStyle: true,
    //                         font: {
    //                             size: window.innerWidth < 768 ? 10 : 12
    //                         },
    //                         padding: window.innerWidth < 768 ? 10 : 15
    //                     } 
    //                 },
    //                 tooltip: { 
    //                     enabled: true,
    //                     mode: 'index', 
    //                     intersect: false,
    //                     titleFont: {
    //                         size: window.innerWidth < 768 ? 11 : 13
    //                     },
    //                     bodyFont: {
    //                         size: window.innerWidth < 768 ? 10 : 12
    //                     },
    //                     callbacks: {
    //                         label: function(context) {
    //                             const dataset = context.dataset;
    //                             const dataIndex = context.dataIndex;
                                
    //                             // Hiển thị giá trị đã scale
    //                             if (dataset.data && dataset.data[dataIndex] !== null && dataset.data[dataIndex] !== undefined) {
    //                                 const scaled_value = dataset.data[dataIndex];
    //                                 return `${dataset.label}: ${scaled_value.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1})}`;
    //                             }
                                
    //                             return '';
    //                         }
    //                     },
    //                 },
    //                 // datalabels: {
    //                 //     display: function(context) {
    //                 //         return context.dataset.type !== 'line' && context.dataset.data[context.dataIndex] !== null;
    //                 //     },
    //                 //     // --- THAY ĐỔI TẠI ĐÂY ---
    //                 //     anchor: 'end',      // Neo ở đỉnh cột (phía trên)
    //                 //     align: 'bottom',    // Căn lề 'bottom' (vẽ chữ BÊN TRÊN, ở phía trên)
    //                 //     offset: 4,          // Khoảng cách 4px phía trên cột
    //                 //     clamp: true,        // Đảm bảo nhãn không bị vẽ ra ngoài khung chart
    //                 //     // --- KẾT THÚC THAY ĐỔI ---
    //                 //     color: '#333',
    //                 //     font: {
    //                 //         weight: 'bold',
    //                 //         size: window.innerWidth < 768 ? 9 : 10
    //                 //     },
    //                 //     formatter: function(value, context) {
    //                 //         if (context.dataset.originalActualData) {
    //                 //             const originalValue = context.dataset.originalActualData[context.dataIndex];
    //                 //             if (originalValue !== undefined && originalValue > 0) {
    //                 //                 return originalValue.toLocaleString('vi-VN', {minimumFractionDigits: 0, maximumFractionDigits: 1});
    //                 //             }
    //                 //         }
    //                 //         return '';
    //                 //     }
    //                 // }
    //             }
    //         },
    //         plugins: [plannedLinePlugin2]
    //     });
    // },

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