// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Production Schedule"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("Từ ngày"),
			"fieldtype": "Date",
			"default": function() {
				const now = new Date();
				return new Date(now.getFullYear(), now.getMonth(), 1);
			}(),
			"on_change": function() {
				frappe.query_reports["Production Schedule"].handle_date_range_change();
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
				frappe.query_reports["Production Schedule"].handle_date_range_change();
			}
		},
		{
			"fieldname": "month",
			"label": __("Tháng"),
			"fieldtype": "Select",
			"options": ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
			"on_change": function() {
				frappe.query_reports["Production Schedule"].handle_month_year_change();
			}
		},
		{
			"fieldname": "year",
			"label": __("Năm"),
			"fieldtype": "Int",
			"default": new Date().getFullYear(),
			"on_change": function() {
				frappe.query_reports["Production Schedule"].handle_month_year_change();
			}
		}
	],

	get_datatable_options(options) {
		return { ...options, freezeIndex: 2};
	},

	"onload": function(report) {
		setTimeout(() => { 
			this.render_components(); 
		}, 500);
		
		this.add_responsive_styles();

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
				report.refresh();
				setTimeout(() => {
					this.render_components();
				}, 500);
			}

			previous_values[fieldname] = new_value;
		};

		report.page.fields_dict.from_date.$input.on('change', () => on_date_cleared_handler("from_date"));
		report.page.fields_dict.to_date.$input.on('change', () => on_date_cleared_handler("to_date"));
		if (report.page.fields_dict.month) report.page.fields_dict.month.$input.on('change', () => on_date_cleared_handler("month"));
		if (report.page.fields_dict.year) report.page.fields_dict.year.$input.on('change', () => on_date_cleared_handler("year"));
	},

	"add_responsive_styles": function() {
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
				
				/* Responsive chart adjustments */
				@media (max-width: 768px) {
					.chart-container {
						height: 250px !important;
					}
					
					.chart-wrapper {
						padding: 8px !important;
					}
					
					/* Responsive chart title */
					.chartjs-chart canvas {
						max-width: 100% !important;
					}
				}
				
				@media (min-width: 769px) and (max-width: 1024px) {
					.chart-container {
						height: 300px !important;
					}
				}
				
				@media (min-width: 1025px) {
					.chart-container {
						height: 350px !important;
					}
				}
				
				/* Chart title responsive */
				.chartjs-chart {
					max-width: 100% !important;
					overflow: hidden !important;
				}
				
				.chartjs-chart canvas {
					max-width: 100% !important;
					height: auto !important;
				}
				
				/* Chart title alignment and wrapping */
				.chartjs-chart .chartjs-chart-title {
					text-align: center !important;
					white-space: normal !important;
					word-wrap: break-word !important;
					max-width: 100% !important;
				}
				
				@media (max-width: 768px) {
					.chartjs-chart .chartjs-chart-title {
						text-align: left !important;
						font-size: 14px !important;
						line-height: 1.3 !important;
						padding: 5px 0 !important;
					}
				}
			</style>
		`);
		$('head').append(style);
	},

	"render_components": function() {
		let existing_chart = Chart.getChart("week-plan-chart");
		if (existing_chart) existing_chart.destroy();
		$('.report-wrapper .main-layout-container').remove();
		
		const data_rows = frappe.query_report.data;
		const columns = frappe.query_report.columns;
		
		if (!data_rows || data_rows.length < 1) {
			return;
		}

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

		const total_summary_data = this.aggregate_total_summary(data_rows, columns);
		this.draw_progress_cards(total_summary_data, mainContainer.find('.progress-section'));

		const daily_chart_data = this.aggregate_data_for_daily_chart(data_rows, columns);
		this.draw_daily_production_chart(daily_chart_data, mainContainer.find('.chart-section'));
	},
	
	"aggregate_total_summary": function(data_rows, columns) {
		const product_columns = columns.filter(c => !['production_date', 'wwo_name', 'no_data'].includes(c.fieldname));
		const system_by_field = {};
		product_columns.forEach(c => { system_by_field[c.fieldname] = (c.parent || '').toString().trim(); });

		let p2o5 = { planned: 0, actual: 0 };
		let others = { planned: 0, actual: 0 };

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

		return [
			{ name: 'Thạch cao', ...others },
			{ name: 'P2O5', ...p2o5 },
		];
	},

	"draw_progress_cards": function(summary_data, container) {
		const gridContainer = $(`<div class="progress-grid" style="
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
			gap: 12px;
			width: 100%;
		"></div>`);
		container.append(gridContainer);

		const noteTextDiv = document.createElement("div");
        noteTextDiv.innerHTML = `<div>Phần in đậm là kế hoạch<br>Phần in nhạt là thực tế</div>`
        noteTextDiv.style.textAlign = "center";
        noteTextDiv.style.fontWeight = "bold";
        noteTextDiv.style.paddingTop = "10px";
		container.append(noteTextDiv);

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
			
			card.hover(
				function() { $(this).css('transform', 'translateY(-2px)').css('box-shadow', '0 8px 15px rgba(0,0,0,0.12)'); },
				function() { $(this).css('transform', 'translateY(0)').css('box-shadow', '0 4px 6px rgba(0,0,0,0.07)'); }
			);
			
			gridContainer.append(card);
		});
	},

	"aggregate_data_for_daily_chart": function(data_rows, columns) {
		let wwo_summary = {};
		const product_columns = columns.filter(c => !['production_date', 'wwo_name', 'no_data'].includes(c.fieldname));
		const system_by_field = {};
		product_columns.forEach(c => { system_by_field[c.fieldname] = (c.parent || '').toString().trim(); });

		data_rows.forEach(row => {
			const wwo_name = row.wwo_name;
			if (!wwo_name || wwo_name.includes("Tổng cộng")) return;
			if (!wwo_summary[wwo_name]) {
				wwo_summary[wwo_name] = { "P2O5": { planned: 0, actual: 0 }, "Thạch cao": { planned: 0, actual: 0 } };
			}
			product_columns.forEach(col => {
				const value_str = row[col.fieldname];
				if (value_str && typeof value_str === 'string' && value_str.includes('/')) {
					const parts = value_str.replace(/<[^>]*>/g, '').split('/');
					const actual = parseFloat(parts[0].trim().replace(/,/g, '')) || 0;
					const planned = parseFloat(parts[1].trim().replace(/,/g, '')) || 0;
					const system_name = (system_by_field[col.fieldname] || '');
					if (system_name.toLowerCase().includes('p2o5')) {
						wwo_summary[wwo_name]["P2O5"].planned += planned;
						wwo_summary[wwo_name]["P2O5"].actual += actual;
					} else {
						wwo_summary[wwo_name]["Thạch cao"].planned += planned;
						wwo_summary[wwo_name]["Thạch cao"].actual += actual;
					}
				}
			});
		});
		return wwo_summary;
	},

    "draw_daily_production_chart": function(wwo_data, container) {
        // Use the order from backend data instead of sorting by name
        const data_rows = frappe.query_report.data;
        let wwo_names = [];
        
        // Extract wwo names in the order they appear in the data
        for (let row of data_rows) {
            if (row.wwo_name && row.wwo_name !== "" && wwo_data[row.wwo_name]) {
                wwo_names.push(row.wwo_name);
            }
        }
        
        // Reverse the order for chart (oldest first, newest last)
        // Because backend returns newest first for table display
        wwo_names = wwo_names.reverse();
        
        if (wwo_names.length === 0) return;

        // Xóa biểu đồ cũ nếu tồn tại để tránh lỗi
        let existing_chart = Chart.getChart("week-plan-chart");
        if (existing_chart) {
            existing_chart.destroy();
        }

        const num_items = wwo_names.length;
        const is_mobile = window.innerWidth < 768;
        const is_tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        
        // Get container width for responsive sizing
        const containerWidth = container.width() || (is_mobile ? 300 : is_tablet ? 500 : 700);

        // Calculate bar width based on number of items and container
        let min_bar_width = is_mobile ? 60 : is_tablet ? 80 : 100;
        let max_bar_width = is_mobile ? 150 : is_tablet ? 200 : 250;
        
        // Calculate optimal bar width
        let bar_width_per_item = Math.max(min_bar_width, Math.min(max_bar_width, Math.floor(containerWidth / num_items)));
        
        // Calculate canvas dimensions
        let canvas_width = num_items * bar_width_per_item;
        let canvas_height = is_mobile ? 250 : is_tablet ? 300 : 350;
        
        // Ensure minimum width but also respect container width for few items
        const min_canvas_width = 300;
        if (canvas_width < min_canvas_width) {
            canvas_width = min_canvas_width;
            bar_width_per_item = Math.floor(canvas_width / num_items);
        }
        
        // For few items, expand chart to fill container width
        // This makes bars appear centered with proper spacing
        const needsScroll = canvas_width > containerWidth - 30;
        if (!needsScroll) {
            // Use full container width, Chart.js will center the bars automatically
            canvas_width = containerWidth - 30;
        }
        
        // Chart container style
        const chartContainerStyle = needsScroll
            ? `position: relative; height: ${canvas_height}px; width: ${canvas_width}px; flex-shrink: 0;`
            : `position: relative; height: ${canvas_height}px; width: 100%;`;

        // Xóa wrapper cũ trước khi tạo mới để không bị trùng lặp
        container.find('.chart-wrapper').remove();
        const chartWrapper = $(`<div class="chart-wrapper" style="
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            padding: 15px;
            margin-top: 15px;
            width: 100%;
        ">
            <div class="chart-scroll-area" style="
                overflow-x: ${needsScroll ? 'auto' : 'hidden'};
                overflow-y: hidden;
            ">
                <div class="chart-container" style="${chartContainerStyle}">
                    <canvas id="week-plan-chart" style="cursor: pointer;"></canvas>
                </div>
            </div>
            <div class="chart-note" style="
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #6c757d;
                text-align: left;
            ">
                <em>% trong biểu đồ là so sánh kế hoạch và thực tế của thạch cao. Click vào cột để xem chi tiết Work Order.</em>
            </div>
        </div>`);
        container.append(chartWrapper);

        const labels = wwo_names;
        
        const othersActual = wwo_names.map(wwo => wwo_data[wwo]["Thạch cao"].actual);
        const othersPlanned = wwo_names.map(wwo => wwo_data[wwo]["Thạch cao"].planned);
        const p2o5Actual = wwo_names.map(wwo => wwo_data[wwo]["P2O5"].actual);
        const p2o5Planned = wwo_names.map(wwo => wwo_data[wwo]["P2O5"].planned);
        
        // Tính phần trăm hoàn thành cho mỗi LSX (Thạch cao)
        const completionPercentages = wwo_names.map((wwo, index) => {
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

        // Calculate bar thickness based on number of items
        // Fewer items = wider bars to fill space nicely
        let barPercentage, categoryPercentage;
        if (num_items <= 2) {
            barPercentage = 0.6;
            categoryPercentage = 0.5;
        } else if (num_items <= 4) {
            barPercentage = 0.7;
            categoryPercentage = 0.6;
        } else {
            barPercentage = 0.8;
            categoryPercentage = 0.7;
        }

		const datasets = [
			{ 
				label: 'Thực tế (Thạch cao)', 
				data: othersActual, 
				backgroundColor: 'rgba(14, 165, 233, 0.5)', 
				borderColor: 'rgba(14, 165, 233, 1)', 
				borderWidth: 2, 
				stack: 'Others', 
				type: 'bar', 
				order: 1,
				barPercentage: barPercentage,
				categoryPercentage: categoryPercentage
			},
			{ 
				label: 'Kế hoạch (Thạch cao)', 
				data: othersPlanned.map((p,i)=> Math.max(0, p - othersActual[i])), 
				backgroundColor: 'rgba(14, 165, 233, 0.2)', 
				borderColor: 'rgba(14, 165, 233, 0.6)', 
				borderWidth: 2, 
				stack: 'Others', 
				type: 'bar', 
				order: 1,
				// Lưu giá trị kế hoạch gốc để hiển thị trong tooltip
				originalPlanned: othersPlanned,
				barPercentage: barPercentage,
				categoryPercentage: categoryPercentage
			},
			{ label: 'Kế hoạch (P2O5)', data: p2o5Planned, borderColor: 'rgba(108, 117, 125, 0.8)', backgroundColor: 'rgba(108, 117, 125, 0.0)', borderWidth: 2, fill: false, tension: 0.2, pointRadius: 4, pointHoverRadius: 6, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 1, spanGaps: true },
			{ label: 'Thực tế (P2O5)', data: p2o5Actual, borderColor: 'rgba(220, 38, 127, 1)', backgroundColor: 'rgba(220, 38, 127, 0.0)', borderWidth: 4, fill: false, tension: 0.2, pointRadius: 6, pointHoverRadius: 8, type: 'line', yAxisID: 'y2', xAxisID: 'x', order: 0, spanGaps: true }
		];

        // Plugin tùy chỉnh để hiển thị label phần trăm hoàn thành
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
                        // Lấy đỉnh của stack bar (tổng của planned + actual)
                        // Trong stacked bar, dataset 1 (kế hoạch) được vẽ trên dataset 0 (thực tế)
                        // Nên đỉnh của dataset 1 chính là đỉnh của stack bar
                        const plannedBar = meta1.data[index];
                        let topY;
                        if (plannedBar && plannedBar.y !== null) {
                            // Đỉnh của stack bar là đỉnh của cột kế hoạch (y nhỏ hơn = cao hơn)
                            topY = plannedBar.y;
                        } else if (bar.y !== null) {
                            // Nếu không có phần kế hoạch, dùng đỉnh của cột thực tế
                            topY = bar.y;
                        } else {
                            return; // Bỏ qua nếu không có dữ liệu
                        }
                        // Hiển thị label ở trên đỉnh của stack bar (5px phía trên)
                        ctx.fillText(`${percentage}%`, x, topY - 5);
                    }
                });
                
                ctx.restore();
            }
        };

        const canvas = document.getElementById('week-plan-chart');
        const ctx = canvas.getContext('2d');
        
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
                        const wwo_name = wwo_names[dataIndex];
                        
                        // Show notification
                        frappe.show_alert({
                            message: __(`Đang mở Week Work Order ${wwo_name}...`),
                            indicator: 'blue'
                        }, 2);
                        
                        // Open Week Work Order form in new tab
                        const wwo_url = `/app/week-work-order/${encodeURIComponent(wwo_name)}`;
                        window.open(wwo_url, '_blank');
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
                                
                                if (label) {
                                    label += ': ';
                                }
                                
                                // Nếu là dataset "Kế hoạch (Thạch cao)", hiển thị giá trị gốc
                                if (context.dataset.label === 'Kế hoạch (Thạch cao)') {
                                    const originalValue = context.dataset.originalPlanned[context.dataIndex];
                                    label += originalValue.toLocaleString('en-US') + ' Tấn';
                                } else {
                                    // Các dataset khác hiển thị bình thường
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y.toLocaleString('en-US') + ' Tấn';
                                    }
                                }
                                
                                return label;
                            },
                            footer: function(tooltipItems) {
                                return 'Click để xem chi tiết LSX';
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
                        text: 'Sản lượng sản xuất theo LSX ',
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
							// Always show every label and wrap long labels into multiple lines
							autoSkip: false,
							maxRotation: 0,
							minRotation: 0,
							align: 'center',
							crossAlign: 'center',
							font: {
								size: num_items <= 5 ? 12 : num_items <= 10 ? 10 : 9,
								weight: num_items <= 5 ? 'bold' : 'normal'
							},
							padding: 8,
							callback: function(value, index, values) {
								// Chart.js sometimes passes numeric indices as `value`.
								// Map numeric values to the actual label string from chart data.
								try {
									const chart = this.chart || this; // different contexts
									let label = value;
									if (typeof value === 'number') {
										const labels = (chart && chart.data && chart.data.labels) || values || [];
										label = labels[value] || labels[index] || '';
									}

									if (!label || typeof label !== 'string') return label;
									if (label.length <= 20) return label;

									const words = label.split(' ');
									const lines = [];
									let current = '';
									for (let w of words) {
										if ((current + (current ? ' ' : '') + w).length > 20) {
											if (current) lines.push(current);
											current = w;
										} else {
											current = current ? (current + ' ' + w) : w;
										}
									}
									if (current) lines.push(current);

									const finalLines = [];
									lines.forEach(l => {
										if (l.length <= 20) finalLines.push(l);
										else {
											for (let i = 0; i < l.length; i += 20) {
												finalLines.push(l.substring(i, i+20));
											}
										}
									});

									return finalLines;
								} catch (e) {
									return value;
								}
							}
						},
						offset: true
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
                        grid: { drawOnChartArea: false, drawTicks: false },
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
		const from_date = frappe.query_report.get_filter_value("from_date");
		const to_date = frappe.query_report.get_filter_value("to_date");
		
		if (from_date || to_date) {
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
			frappe.query_report.set_filter_value("from_date", "", false);
			frappe.query_report.set_filter_value("to_date", "", false);
			
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