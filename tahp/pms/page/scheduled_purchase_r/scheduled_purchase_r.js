frappe.pages['scheduled-purchase-r'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Scheduled Purchase Request',
		single_column: true
	});

	// Filter
	let from_date_filter = page.add_field({
		fieldname: 'from_date',
		label: 'From Date',
		fieldtype: 'Date',
		change: function() {
			load_data();
		}
	});

	let to_date_filter = page.add_field({
		fieldname: 'to_date',
		label: 'To Date',
		fieldtype: 'Date',
		change: function() {
			load_data();
		}
	});

	// KPI cards container (centered)
	this.kpi_row = $(`<div class="row kpi-row" style="margin-top:1rem; display:flex; justify-content:center; gap:16px;"></div>`).appendTo(page.main);

	// inject KPI styles once
	if (!document.getElementById('scheduled-purchase-kpi-style')) {
		const style = document.createElement('style');
		style.id = 'scheduled-purchase-kpi-style';
		style.innerHTML = `
		.kpi-card { background: #ffffff; border-radius: 10px; box-shadow: 0 8px 20px rgba(48, 63, 79, 0.08); padding: 14px 18px; border-left: 6px solid #7cd6fd; width:260px; min-width:200px; min-height:84px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-sizing:border-box; text-align:center; }
		.kpi-card .kpi-label { color: #6b7280; font-size: 13px; margin-bottom: 6px; text-transform: none; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; width:100%; }
		.kpi-card .kpi-value { font-size: 28px; font-weight: 700; color: #111827; }
		.kpi-row { align-items: center; }
		`;
		document.head.appendChild(style);
	}

	const kpi_defs = [
		{ key: 'total_purchase', label: 'Tổng số đơn', value: 0 },
		{ key: 'total_value', label: 'Tổng giá trị', value: 0 },
		{ key: 'avg_value', label: 'Trung bình đơn', value: 0 },
	];

	this.kpis = {};

	kpi_defs.forEach(def => {
		const col = $(`<div class="col-xs-12 col-sm-6 col-md-3" style="flex: 0 0 260px; max-width:260px;"></div>`).appendTo(this.kpi_row);
		const card = $(
			`<div class="card mb-2 kpi-card">
				<div class="card-body text-center">
					<div class="kpi-label">${def.label}</div>
					<div class="kpi-value">${def.value}</div>
				</div>
			</div>`
		).appendTo(col);
		this.kpis[def.key] = {
			$el: card.find('.kpi-value'),
			label: def.label
		};
	});

	// Chart container với flexbox để đặt 2 biểu đồ cạnh nhau
	$(`<div id="chart-container" style="display: flex; gap: 20px; margin-top: 2rem; flex-wrap: wrap;"></div>`).appendTo(page.main);

	// Bar chart wrapper
	$(`<div id="bar-chart" style="flex: 1; min-width: 400px;"></div>`).appendTo('#chart-container');

	// Pie chart wrapper
	$(`<div id="pie-chart" style="flex: 1; min-width: 400px;"></div>`).appendTo('#chart-container');

	// DataTable container
	const table_container = $(`
		<div style="margin-top: 2rem;">
			<h4 style="margin-bottom: 1rem;">Chi tiết đơn mua hàng</h4>
			<div id="datatable-container" style="width: 100%;"></div>
		</div>
	`).appendTo(page.main);

	// Variables to store chart instances
	let bar_chart = null;
	let pie_chart = null;
	let datatable = null;
	
	// Store reference to kpis
	const kpis = this.kpis;

	// Load data function
	function load_data() {
		const from_date = from_date_filter.get_value();
		const to_date = to_date_filter.get_value();

		// Prepare filters
		let filters = {
			docstatus: 1 // Only submitted documents
		};

		if (from_date) {
			filters['transaction_date'] = ['>=', from_date];
		}
		if (to_date) {
			if (filters['transaction_date']) {
				filters['transaction_date'] = ['between', [from_date, to_date]];
			} else {
				filters['transaction_date'] = ['<=', to_date];
			}
		}

		// Fetch Purchase Order data with items
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Purchase Order',
				filters: filters,
				fields: ['name', 'supplier', 'transaction_date', 'status', 'grand_total'],
				limit_page_length: 0
			},
			callback: function(r) {
				if (r.message) {
					const purchase_orders = r.message;
					
					if (purchase_orders.length === 0) {
						update_ui_with_empty_data();
						return;
					}

					// Get full document to access items child table
					const fetch_promises = purchase_orders.map(po => {
						return new Promise((resolve) => {
							frappe.call({
								method: 'frappe.client.get',
								args: {
									doctype: 'Purchase Order',
									name: po.name
								},
								callback: function(doc_response) {
									if (doc_response.message) {
										resolve(doc_response.message);
									} else {
										resolve(null);
									}
								}
							});
						});
					});

					Promise.all(fetch_promises).then(full_docs => {
						const valid_docs = full_docs.filter(doc => doc !== null);
						process_data(valid_docs);
					});
				}
			}
		});
	}

	function process_data(purchase_orders) {
		// Extract all items from items field
		let all_items = [];
		
		purchase_orders.forEach(po => {
			if (po.items && Array.isArray(po.items)) {
				po.items.forEach(item => {
					all_items.push({
						...item,
						po_name: po.name,
						po_supplier: po.supplier,
						po_transaction_date: po.transaction_date,
						po_status: po.status
					});
				});
			}
		});

		// Calculate KPIs
		let total_purchase = purchase_orders.length;
		let total_value = 0;

		all_items.forEach(item => {
			// Use item.amount when available (matches 'Thành tiền' in table), fallback to item.total
			total_value += (item.amount || item.total) || 0;
		});

		let avg_value = total_purchase > 0 ? total_value / total_purchase : 0;

		// Update KPIs (use comma thousands, dot decimals)
		update_kpis({
			total_purchase: format_number(total_purchase, 0),
			total_value: format_currency_custom(total_value, 0),
			avg_value: format_currency_custom(avg_value, 0)
		});

		// Prepare chart data
		prepare_charts(purchase_orders, all_items);

		// Prepare table data
		prepare_table(all_items);
	}

	function update_kpis(data) {
		kpis['total_purchase'].$el.text(data.total_purchase);
		kpis['total_value'].$el.text(data.total_value);
		kpis['avg_value'].$el.text(data.avg_value);
	}

	function prepare_charts(purchase_orders, items) {
		// Bar chart - Orders by day
		const daily_data = {};
		purchase_orders.forEach(po => {
			const date_key = po.transaction_date; // YYYY-MM-DD format
			daily_data[date_key] = (daily_data[date_key] || 0) + 1;
		});

		const sorted_dates = Object.keys(daily_data).sort();
		const bar_labels = sorted_dates.map(d => {
			// Convert YYYY-MM-DD to DD/MM format only
			const parts = d.split('-');
			return `${parts[2]}/${parts[1]}`;
		});
		const bar_values = sorted_dates.map(d => daily_data[d]);

		// Destroy existing chart if it exists
		if (bar_chart) {
			try { if (bar_chart.destroy) bar_chart.destroy(); } catch (e) {}
			$('#bar-chart').empty();
			bar_chart = null;
		}

		// Create a scrollable wrapper so long x labels can be scrolled horizontally
		const perLabelPx = 80; // width allocated per label - adjusted for DD/MM format
		const innerWidth = Math.max(600, sorted_dates.length * perLabelPx);
		// compute chart height dynamically so tall bars and tooltips don't get clipped
		const maxVal = bar_values.length ? Math.max.apply(null, bar_values) : 0;
		// use a larger multiplier to give more vertical room for tall bars/tooltips
		const chartHeight = Math.min(1200, Math.max(450, 180 + Math.round(maxVal * 12)));
		$('#bar-chart').append(`
			<div class="chart-title" style="font-size:18px;font-weight:700;margin-bottom:8px">Số lượng đơn mua theo ngày</div>
			<div class="chart-scroll" style="overflow-x:auto; overflow-y:visible;">
				<div class="chart-inner" style="min-width:${innerWidth}px; overflow:visible; padding-top:24px; padding-bottom:60px;">
				</div>
			</div>
		`);

		// Only render bar chart if we have valid data
		if (bar_labels && bar_labels.length && bar_values && bar_values.length && bar_labels.length === bar_values.length && bar_values.every(v => typeof v === 'number')) {
			bar_chart = new frappe.Chart($('#bar-chart .chart-inner')[0], {
				data: {
					labels: bar_labels,
					datasets: [{ name: 'Số đơn', values: bar_values }]
				},
				type: 'bar',
				height: chartHeight,
				colors: ['#7cd6fd'],
				barOptions: {
					spaceRatio: 0.3,
					stacked: 0
				},
				tooltipOptions: {
					formatTooltipY: function(value) { return format_number(value, 0); }
				},
				axisOptions: {
					xIsSeries: 0,
					xAxisMode: 'span',
					shortenYAxisNumbers: 0,
					// ensure y-axis labels are integers (no 1.5 etc.)
					numberFormatter: function(label) { return format_number(label, 0); },
					// add a little headroom above the highest bar so labels/tooltips aren't clipped
					yAxisRange: { max: Math.ceil(maxVal * 1.15) }
				}
			});
		} else {
			console.warn('Bar chart not rendered - invalid data', { labels: bar_labels, values: bar_values });
			$('#bar-chart').html('<p class="text-muted text-center">Không có dữ liệu</p>');
		}

		// Pie chart - Distribution by supplier
		const supplier_data = {};
		purchase_orders.forEach(po => {
			const supplier = po.supplier || 'Unknown';
			supplier_data[supplier] = (supplier_data[supplier] || 0) + 1;
		});

		const pie_labels = Object.keys(supplier_data);
		const pie_values = Object.values(supplier_data);

		// Destroy existing chart if it exists
		if (pie_chart) {
			try { if (pie_chart.destroy) pie_chart.destroy(); } catch (e) {}
			$('#pie-chart').empty();
			pie_chart = null;
		}

		// Pie chart title (larger & bold)
		$('#pie-chart').append(`<div class="chart-title" style="font-size:18px;font-weight:700;margin-bottom:8px">Phân bố theo nhà cung cấp</div><div class="chart-inner-pie"></div>`);

		// Only render pie chart if we have valid data with matching arrays
		if (pie_labels && pie_labels.length > 0 && 
		    pie_values && pie_values.length > 0 && 
		    pie_labels.length === pie_values.length && 
		    pie_values.every(v => typeof v === 'number' && !isNaN(v))) {
			
			try {
				pie_chart = new frappe.Chart($('#pie-chart .chart-inner-pie')[0], {
					data: {
						labels: pie_labels,
						datasets: [{
							name: 'Số đơn',
							values: pie_values
						}]
					},
					type: 'pie',
					height: chartHeight || 250,
					colors: ['#ff6b6b', '#feca57', '#1dd1a1', '#8b27a7', '#54a0ff', '#ff9ff3'],
					tooltipOptions: {
						formatTooltipY: function(value) { 
							return format_number(value, 0); 
						}
					}
				});
			} catch (e) {
				console.error('Error creating pie chart:', e);
				$('#pie-chart').html('<p class="text-muted text-center">Lỗi khi tạo biểu đồ</p>');
			}
		} else {
			console.warn('Pie chart not rendered - invalid data', { 
				labels: pie_labels, 
				values: pie_values,
				labelsLength: pie_labels ? pie_labels.length : 0,
				valuesLength: pie_values ? pie_values.length : 0
			});
			$('#pie-chart').html('<p class="text-muted text-center">Không có dữ liệu</p>');
		}
	}

	function prepare_table(items) {
		// Prepare table data
		function getDeliveryDate(it) {
			return it.delivery_date || it.schedule_date || it.expected_delivery_date || it.expected_date || '';
		}

		// Group items by Purchase Order and build hierarchical data with indent
		const grouped = {};
		items.forEach(item => {
			const po = item.po_name || 'Unknown';
			if (!grouped[po]) {
				grouped[po] = {
					po_name: po,
					po_transaction_date: item.po_transaction_date,
					po_supplier: item.po_supplier,
					po_status: item.po_status,
					items: []
				};
			}
			grouped[po].items.push(item);
		});

		// Build hierarchical data array
		const hierarchical_data = [];
		Object.keys(grouped).forEach(po_name => {
			const group = grouped[po_name];
			// compute totals for parent row
			let po_total = 0;
			group.items.forEach(it => {
				po_total += (it.amount || it.total) || 0;
			});

			// Get delivery date for parent (use first item's delivery date)
			const first_delivery = group.items.length > 0 ? getDeliveryDate(group.items[0]) : '';

			// Parent row (indent: 0) - only show: Mã đơn, Ngày tạo, NCC, Thành tiền, Trạng thái, Ngày giao
			hierarchical_data.push({
				indent: 0,
				ma_don: po_name,
				ngay_tao: group.po_transaction_date ? frappe.datetime.str_to_user(group.po_transaction_date) : '',
				nha_cung_cap: group.po_supplier || '',
				san_pham: '',
				xuat_xu: '',
				so_luong: '',
				don_vi: '',
				don_gia: '',
				thanh_tien: format_currency_custom(po_total, 0),
				trang_thai: get_status_label(group.po_status),
				po_status_raw: group.po_status,
				ngay_giao: first_delivery ? frappe.datetime.str_to_user(first_delivery) : ''
			});

			// Child rows (indent: 1) - no Trạng thái, Ngày tạo, Ngày giao
			group.items.forEach(it => {
				const qty = Number(it.qty) || 0;
				const qtyDecimals = (Math.round(qty) === qty) ? 0 : 2;
				hierarchical_data.push({
					indent: 1,
					ma_don: '',
					ngay_tao: '',
					nha_cung_cap: '',
					san_pham: it.item_name || it.item_code,
					xuat_xu: it.brand || it.brand_name || '',
					so_luong: format_number(qty, qtyDecimals),
					don_vi: it.uom || it.stock_uom || '',
					don_gia: format_currency_custom(it.rate || 0, 0),
					thanh_tien: format_currency_custom(it.amount || it.total || 0, 0),
					trang_thai: '',
					ngay_giao: ''
				});
			});
		});

		// Define columns with tree: true for the first column
		const columns = [
			{ name: 'Mã đơn', id: 'ma_don', editable: false, width: 220, tree: true, format: function(value, row, column, data) {
				// Make parent order code bold
				if (data && data.indent === 0) {
					return `<strong>${value}</strong>`;
				}
				return value;
			} },
			{ name: 'Ngày tạo', id: 'ngay_tao', editable: false, width: 130 },
			{ name: 'Nhà cung cấp', id: 'nha_cung_cap', editable: false, width: 180 },
			{ name: 'Sản phẩm', id: 'san_pham', editable: false, width: 250 },
			{ name: 'Xuất xứ', id: 'xuat_xu', editable: false, width: 150 },
			{ name: 'Số lượng', id: 'so_luong', editable: false, width: 90 },
			{ name: 'Đơn vị', id: 'don_vi', editable: false, width: 90 },
			{ name: 'Đơn giá', id: 'don_gia', editable: false, width: 110 },
			{ name: 'Thành tiền', id: 'thanh_tien', editable: false, width: 110 },
			{ name: 'Trạng thái', id: 'trang_thai', editable: false, width: 200, format: function(value, row, column, data) {
				// Colored badges for logical statuses
				const raw = (data && data.po_status_raw) || data && data.trang_thai || '';
				const label = value || raw || '';
				let bg = '#e0e0e0';
				let color = '#000';
				if (/completed/i.test(raw) || /Hoàn thành/i.test(label)) { bg = '#d4edda'; color = '#155724'; }
				else if (/cancelled|cancel/i.test(raw) || /Đã hủy/i.test(label)) { bg = '#f8d7da'; color = '#721c24'; }
				else if (/to receive and bill|to receive/i.test(raw) || /Chờ nhận/i.test(label)) { bg = '#d1ecf1'; color = '#0c5460'; }
				else if (/to bill/i.test(raw) || /Chờ thanh toán/i.test(label)) { bg = '#fff3cd'; color = '#856404'; }
				else if (/closed/i.test(raw) || /Đã đóng/i.test(label)) { bg = '#e2e3e5'; color = '#41464b'; }
				return `<span style="display:inline-block;padding:6px 10px;border-radius:12px;background:${bg};color:${color};font-weight:600">${label}</span>`;
			} },
			{ name: 'Ngày giao', id: 'ngay_giao', editable: false, width: 130 }
		];

		// Destroy existing datatable if exists
		if (datatable) {
			$('#datatable-container').empty();
		}

		// Create DataTable with treeView enabled and frozen columns
		datatable = new frappe.DataTable('#datatable-container', {
			columns: columns,
			data: hierarchical_data,
			treeView: true,  // Enable tree view
			layout: 'fixed',
			serialNoColumn: false,
			checkboxColumn: false,
			clusterize: false,
			dynamicRowHeight: true,
			inlineFilters: true,
			frozenColumnsCount: 3  // Freeze first 3 columns
		});
	}

	function update_ui_with_empty_data() {
		// Update KPIs with zeros
		update_kpis({
			total_purchase: 0,
			total_value: format_currency(0),
			avg_value: format_currency(0)
		});

		// Clear charts
		$('#bar-chart').html('<p class="text-muted text-center">Không có dữ liệu</p>');
		$('#pie-chart').html('<p class="text-muted text-center">Không có dữ liệu</p>');

		// Clear table
		$('#datatable-container').html('<p class="text-muted text-center">Không có dữ liệu</p>');
	}

	function format_currency(value) {
		// legacy - keep for table formatting where vi-VN may be desired
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(value);
	}

	function format_number(value, decimals=0) {
		if (value === null || value === undefined || value === '') return '';
		const opts = {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		};
		return new Intl.NumberFormat('en-US', opts).format(Number(value));
	}

	function format_currency_custom(value, decimals=0) {
		if (value === null || value === undefined || value === '') return '';
		// format number with comma thousands and dot decimals, append VND symbol after
		return `${format_number(value, decimals)} ₫`;
	}

	function get_status_label(status) {
		const status_map = {
			'Draft': 'Nháp',
			'To Receive and Bill': 'Chờ nhận & thanh toán',
			'To Receive': 'Chờ nhận hàng',
			'To Bill': 'Chờ thanh toán',
			'Completed': 'Hoàn thành',
			'Cancelled': 'Đã hủy',
			'Closed': 'Đã đóng'
		};
		return status_map[status] || status;
	}

	// Initial load
	load_data();
}