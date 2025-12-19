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

	// KPI cards container
	this.kpi_row = $(`<div class="row kpi-row" style="margin-top:1rem"></div>`).appendTo(page.main);

	const kpi_defs = [
		{ key: 'total_purchase', label: 'Tổng số đơn', value: 0 },
		{ key: 'total_qty', label: 'Tổng số lượng', value: 0 },
		{ key: 'total_value', label: 'Tổng giá trị', value: 0 },
		{ key: 'avg_value', label: 'Trung bình đơn', value: 0 },
	];

	this.kpis = {};

	kpi_defs.forEach(def => {
		const col = $(`<div class="col-xs-12 col-sm-6 col-md-3"></div>`).appendTo(this.kpi_row);
		const card = $(
			`<div class="card mb-2">
				<div class="card-body">
					<div class="kpi-label text-muted">${def.label}</div>
					<div class="kpi-value" style="font-size:24px; font-weight:600">${def.value}</div>
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

		// Fetch Purchase Order data with custom_detail
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

					// Get full document to access custom_detail child table
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
		// Extract all items from custom_detail field
		let all_items = [];
		
		purchase_orders.forEach(po => {
			if (po.custom_detail && Array.isArray(po.custom_detail)) {
				po.custom_detail.forEach(item => {
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
		let total_qty = 0;
		let total_value = 0;

		all_items.forEach(item => {
			total_qty += item.qty || 0;
			total_value += item.total || 0;
		});

		let avg_value = total_purchase > 0 ? total_value / total_purchase : 0;

		// Update KPIs
		update_kpis({
			total_purchase: total_purchase,
			total_qty: total_qty.toFixed(2),
			total_value: format_currency(total_value),
			avg_value: format_currency(avg_value)
		});

		// Prepare chart data
		prepare_charts(purchase_orders, all_items);

		// Prepare table data
		prepare_table(all_items);
	}

	function update_kpis(data) {
		kpis['total_purchase'].$el.text(data.total_purchase);
		kpis['total_qty'].$el.text(data.total_qty);
		kpis['total_value'].$el.text(data.total_value);
		kpis['avg_value'].$el.text(data.avg_value);
	}

	function prepare_charts(purchase_orders, items) {
		// Bar chart - Orders by month
		const monthly_data = {};
		purchase_orders.forEach(po => {
			const date = new Date(po.transaction_date);
			const month_key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			monthly_data[month_key] = (monthly_data[month_key] || 0) + 1;
		});

		const sorted_months = Object.keys(monthly_data).sort();
		const bar_labels = sorted_months.map(m => {
			const [year, month] = m.split('-');
			return `${month}/${year}`;
		});
		const bar_values = sorted_months.map(m => monthly_data[m]);

		// Destroy existing chart if it exists
		if (bar_chart) {
			$('#bar-chart').empty();
		}

		bar_chart = new frappe.Chart("#bar-chart", {
			title: "Số lượng đơn mua theo tháng",
			data: {
				labels: bar_labels,
				datasets: [{
					name: 'Số đơn',
					values: bar_values
				}]
			},
			type: 'bar',
			height: 250,
			colors: ['#7cd6fd']
		});

		// Pie chart - Distribution by supplier
		const supplier_data = {};
		purchase_orders.forEach(po => {
			supplier_data[po.supplier] = (supplier_data[po.supplier] || 0) + 1;
		});

		const pie_labels = Object.keys(supplier_data);
		const pie_values = Object.values(supplier_data);

		// Destroy existing chart if it exists
		if (pie_chart) {
			$('#pie-chart').empty();
		}

		pie_chart = new frappe.Chart("#pie-chart", {
			title: "Phân bổ theo nhà cung cấp",
			data: {
				labels: pie_labels,
				datasets: [{
					name: 'Số đơn',
					values: pie_values
				}]
			},
			type: 'pie',
			height: 250,
			colors: ['#ff6b6b', '#feca57', '#1dd1a1', '#8b27a7', '#54a0ff', '#ff9ff3']
		});
	}

	function prepare_table(items) {
		// Prepare table data
		const table_rows = items.map(item => {
			return [
				item.po_name,
				frappe.datetime.str_to_user(item.po_transaction_date),
				item.po_supplier,
				item.item_name || item.item_code,
				item.qty || 0,
				format_currency(item.rate || 0),
				format_currency(item.total || 0),
				get_status_label(item.po_status),
				item.origin || '',
				item.delivery_date ? frappe.datetime.str_to_user(item.delivery_date) : '',
				item.delivered_date ? frappe.datetime.str_to_user(item.delivered_date) : ''
			];
		});

		const table_data = {
			columns: [
				{ name: 'Mã đơn', editable: false, width: 140 },
				{ name: 'Ngày tạo', editable: false, width: 110 },
				{ name: 'Nhà cung cấp', editable: false, width: 180 },
				{ name: 'Sản phẩm', editable: false, width: 200 },
				{ name: 'Số lượng', editable: false, width: 90 },
				{ name: 'Đơn giá', editable: false, width: 110 },
				{ name: 'Thành tiền', editable: false, width: 110 },
				{ name: 'Trạng thái', editable: false, width: 120 },
				{ name: 'Xuất xứ', editable: false, width: 120 },
				{ name: 'Ngày giao', editable: false, width: 110 },
				{ name: 'Ngày đã giao', editable: false, width: 110 }
			],
			data: table_rows
		};

		// Destroy existing datatable if exists
		if (datatable) {
			$('#datatable-container').empty();
		}

		// Wait for DOM to be ready
		setTimeout(() => {
			if ($('#datatable-container').length) {
				datatable = new frappe.DataTable('#datatable-container', {
					columns: table_data.columns,
					data: table_data.data,
					layout: 'fluid',
					serialNoColumn: true,
					checkboxColumn: true,
					clusterize: false,
					dynamicRowHeight: true,
					inlineFilters: true
				});

				// Refresh layout
				setTimeout(() => {
					if (datatable && datatable.refresh) {
						datatable.refresh();
					}
				}, 100);
			}
		}, 300);
	}

	function update_ui_with_empty_data() {
		// Update KPIs with zeros
		update_kpis({
			total_purchase: 0,
			total_qty: 0,
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
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND'
		}).format(value);
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