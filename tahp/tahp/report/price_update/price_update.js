// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

if (typeof window.Chart === 'undefined') {
	var script = document.createElement('script');
	script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
	script.onload = function() {
		window.Chart = Chart;
	};
	document.head.appendChild(script);
}

frappe.query_reports["Price Update"] = {
	filters: [],

	get_datatable_options(options) {
        return { ...options, freezeIndex: 3};
    },
	
	onload: function(report) {
		// Thêm nút "Tạo giá tự khai" vào header
		const $btn = $(
			'<button class="btn btn-primary" style="margin-left: 12px;">Tạo giá tự khai</button>'
		);
		$btn.on('click', function() {
			frappe.query_reports["Price Update"].open_supplier_item_rate_dialog();
		});
		setTimeout(() => {
			// Chỉ thêm nếu chưa có
			if (!$('.report-btn-tao-gia-tu-khai').length) {
				$('.page-head .page-actions').prepend($btn.addClass('report-btn-tao-gia-tu-khai'));
			}
		}, 300);
		
		// Đăng ký các hàm global để có thể gọi từ HTML buttons
		window.edit_price = this.edit_price.bind(this);
		window.add_new_price = this.add_new_price.bind(this);
		window.show_price_chart = this.show_price_chart.bind(this);
	},

	open_supplier_item_rate_dialog: function(default_values = {}) {
		const dialog = new frappe.ui.Dialog({
			title: 'Tạo giá tự khai',
			fields: [
				{
					fieldtype: 'Link',
					label: 'Nhà cung cấp',
					fieldname: 'supplier',
					options: 'Supplier',
					reqd: 1,
					default: default_values.supplier || ''
				},
				{
					fieldtype: 'Link',
					label: 'Mã mặt hàng',
					fieldname: 'item_code',
					options: 'Item',
					reqd: 1,
					default: default_values.item_code || '',
					read_only: default_values.item_code ? 1 : 0
				},
				{
					fieldtype: 'Currency',
					label: 'Đơn giá',
					fieldname: 'rate',
					reqd: 1,
					default: default_values.rate || 0
				},
				{
					fieldtype: 'Link',
					label: 'Xuất xứ',
					fieldname: 'origin',
					options: 'Custom Origin',
					reqd: 1,
					default: default_values.origin || ''
				},
			],
			primary_action_label: 'Tạo',
			primary_action(values) {
				frappe.call({
					method: 'tahp.tahp.report.price_update.price_update.create_supplier_item_rate',
					args: values,
					callback: function(r) {
						if (!r.exc) {
							dialog.hide();
							frappe.show_alert({
								message: __('Tạo giá tự khai thành công!'),
								indicator: 'green'
							});
							frappe.query_report.refresh();
						}
					}
				});
			}
		});
		dialog.show();
	},

	// Hàm sửa giá
	edit_price: function(item_code, supplier, origin, current_rate) {
		frappe.prompt([
			{
				label: 'Đơn giá mới',
				fieldname: 'new_rate',
				fieldtype: 'Currency',
				default: current_rate,
				reqd: 1
			}
		],
		function(values) {
			frappe.call({
				method: 'tahp.tahp.report.price_update.price_update.update_supplier_item_rate',
				args: {
					item_code: item_code,
					supplier: supplier,
					origin: origin,
					rate: values.new_rate
				},
				callback: function(r) {
					if (r.message) {
						frappe.show_alert({
							message: __('Đã cập nhật giá thành công'),
							indicator: 'green'
						});
						frappe.query_report.refresh();
					}
				}
			});
		},
		'Cập nhật đơn giá',
		'Cập nhật'
		);
	},

	// Hàm thêm giá mới cho item (không cố định supplier/origin)
	add_new_price: function(item_code) {
		this.open_supplier_item_rate_dialog({
			item_code: item_code
		});
	},

	// Hàm hiển thị biểu đồ giá với filter tháng/năm
	show_price_chart: function(item_code) {
		// Lấy tất cả các supplier và origin của item_code này
		const data = frappe.query_report.datatable ? frappe.query_report.datatable.data : [];
		let suppliers = [];
		let origins = [];
		let item_name = item_code; // Default to item_code
		
		if (data && data.length) {
			data.forEach(row => {
				if (row.item_code === item_code) {
					if (row.item_name) item_name = row.item_name; // Get item name
					if (row.supplier && !suppliers.includes(row.supplier)) suppliers.push(row.supplier);
					if (row.origin && !origins.includes(row.origin)) origins.push(row.origin);
				}
			});
		}

		// Tạo dialog với filter
		let chartDialog = new frappe.ui.Dialog({
			title: `Biểu đồ Biến động giá - ${item_name}`,
			size: 'extra-large',
			fields: [
				{
					fieldtype: 'Section Break',
					label: 'Bộ lọc'
				},
				{
					fieldtype: 'Select',
					label: 'Tháng',
					fieldname: 'month',
					options: [
						'',
						'1', '2', '3', '4', '5', '6',
						'7', '8', '9', '10', '11', '12'
					],
					default: '',
					change: function() {
						const month = chartDialog.get_value('month');
						const year = chartDialog.get_value('year');
						loadChartData(month, year);
					}
				},
				{
					fieldtype: 'Column Break'
				},
				{
					fieldtype: 'Select',
					label: 'Năm',
					fieldname: 'year',
					options: this.get_year_options(),
					default: new Date().getFullYear().toString(),
					change: function() {
						const month = chartDialog.get_value('month');
						const year = chartDialog.get_value('year');
						loadChartData(month, year);
					}
				},
				{
					fieldtype: 'Section Break'
				},
				{
					fieldtype: 'HTML',
					fieldname: 'chart_html'
				}
			]
		});

		let currentChart = null;

		const loadChartData = (month, year) => {
			frappe.call({
				method: 'tahp.tahp.report.price_update.price_update.get_multi_price_history',
				args: {
					item_code: item_code,
					suppliers: JSON.stringify(suppliers),
					origins: JSON.stringify(origins),
					month: month || null,
					year: year || null
				},
				callback: function(r) {
					if (r.message && r.message.labels && r.message.datasets && r.message.datasets.length > 0) {
						// Destroy previous chart if exists
						if (currentChart) {
							currentChart.destroy();
						}

						chartDialog.fields_dict.chart_html.$wrapper.html(`
							<div style="position: relative; height: 500px; width: 100%;">
								<canvas id="price-chart-${item_code}"></canvas>
							</div>
						`);

						setTimeout(() => {
							const $canvas = chartDialog.fields_dict.chart_html.$wrapper.find('canvas')[0];
							if ($canvas) {
								const ctx = $canvas.getContext('2d');
								
								// Định nghĩa màu sắc đẹp cho các đường
								const colors = [
									'#5470C6', // Xanh dương
									'#EE6666', // Đỏ
									'#91CC75', // Xanh lá
									'#FAC858', // Vàng
									'#73C0DE', // Xanh nhạt
									'#3BA272', // Xanh lục
									'#FC8452', // Cam
									'#9A60B4', // Tím
								];
								
								currentChart = new Chart(ctx, {
									type: 'line',
									data: {
										labels: r.message.labels.map(date => {
											// Format ngày theo dạng dd/mm
											const d = new Date(date);
											return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
										}),
										datasets: r.message.datasets.map((ds, idx) => ({
											label: ds.name,
											data: ds.values,
											borderColor: colors[idx % colors.length],
											backgroundColor: colors[idx % colors.length] + '20',
											pointRadius: 5,
											pointHoverRadius: 7,
											pointBackgroundColor: colors[idx % colors.length],
											pointBorderColor: '#fff',
											pointBorderWidth: 2,
											fill: false,
											tension: 0.4,
											borderWidth: 2
										}))
									},
									options: {
										responsive: true,
										maintainAspectRatio: false,
										layout: {
											padding: {
												left: 20,
												right: 20,
												top: 20,
												bottom: 10
											}
										},
										interaction: {
											mode: 'index',
											intersect: false,
										},
										plugins: {
											legend: { 
												display: true, 
												position: 'bottom',
												labels: {
													boxWidth: 15,
													padding: 15,
													font: {
														size: 12
													},
													usePointStyle: true,
													pointStyle: 'circle'
												}
											},
											title: { 
												display: false 
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
													label: function(context) {
														const value = context.parsed.y;
														const formatted = new Intl.NumberFormat('vi-VN', {
															style: 'currency',
															currency: 'VND'
														}).format(value);
														return `${context.dataset.label}: ${formatted}`;
													}
												}
											}
										},
										scales: {
											y: {
												beginAtZero: false,
												grace: '5%',
												title: { 
													display: true, 
													text: 'Đơn giá (VNĐ)',
													font: {
														size: 13,
														weight: 'bold'
													}
												},
												ticks: {
													callback: function(value) {
														return new Intl.NumberFormat('vi-VN').format(value);
													},
													font: {
														size: 11
													},
													padding: 10
												},
												grid: {
													color: 'rgba(0, 0, 0, 0.05)',
													drawBorder: false
												}
											},
											x: {
												title: { 
													display: true, 
													text: 'Ngày',
													font: {
														size: 13,
														weight: 'bold'
													}
												},
												ticks: {
													maxRotation: 0,
													minRotation: 0,
													font: {
														size: 11
													}
												},
												grid: {
													display: false,
													drawBorder: false
												}
											}
										}
									}
								});
							}
						}, 100);
					} else {
						chartDialog.fields_dict.chart_html.$wrapper.html(
							'<div style="padding: 60px; text-align: center; color: #888; font-size: 14px;">Không có dữ liệu lịch sử giá cho bộ lọc này</div>'
						);
					}
				}
			});
		};

		chartDialog.show();
		
		// Load dữ liệu ban đầu với năm hiện tại
		loadChartData('', new Date().getFullYear().toString());
	},

	// Hàm tạo options cho select năm
	get_year_options: function() {
		const currentYear = new Date().getFullYear();
		const years = [''];
		for (let i = 0; i < 5; i++) {
			years.push((currentYear - i).toString());
		}
		return years;
	}
};