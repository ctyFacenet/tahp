// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Downtime Report Advanced"] = {
	"filters": [
		{
            fieldname: "view_mode",
            label: "Chế độ xem",
            fieldtype: "Select",
            options: [
                "Theo nguyên nhân",
                "Theo thiết bị"
            ],
            default: "Theo nguyên nhân",
			on_change: function() {
				const report = frappe.query_report;
				
				report.filters
					.filter(f => !["from_date", "to_date", "view_mode"].includes(f.df.fieldname))
					.forEach(f => f.set_value(""));

				// Tạo lại charts theo view_mode
				initializeCharts(report);

				if (report.get_filter_value("view_mode") === "Theo thiết bị") {
					frappe.query_reports["Downtime Report Advanced"].load_manufacturing_categories(report);
				}

				
				if (report._charts_initialized) {
					setTimeout(() => {
						refresh_charts_all(report);
					}, 100);
				}
			}
        },
		{
			"fieldname": "from_date",
            "label": "Từ ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.add_days(frappe.datetime.get_today(), -7),
			on_change: function() {  
                const report = frappe.query_report;
				
				if (!validateDateRange(report)) {
					return;
				}
                if (report._charts_initialized) {
					refresh_charts_all(report);
				}
            }
		},
		{
			 "fieldname": 'to_date',
            "label": "Đến ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.get_today(),
			on_change: function() { 
                const report = frappe.query_report;
				
				if (!validateDateRange(report)) {
					return;
				}
                if (report._charts_initialized) {
					refresh_charts_all(report);
				}
            }
		},
		{
            fieldname: "reason_group",
            label: "Nhóm nguyên nhân",
            fieldtype: "Data",
            hidden: "1"
        },
        {
            fieldname: "reason_detail",
            label: "Nguyên nhân",
            fieldtype: "Data",
            hidden: "1"
        },
		{
            fieldname: "category",
            label: "Hệ",
            fieldtype: "Select",
            options: [],
			depends_on: "eval:doc.view_mode=='Theo thiết bị'",
            on_change: function() {
                frappe.query_report.refresh();
            }
        },
		{
            fieldname: "machine_group",
            label: "Cụm máy",
            fieldtype: "Data",
            hidden: "1"
        },
        {
            fieldname: "equipment_name",
            label: "Máy dừng",
            fieldtype: "Data",
            hidden: "1"
        },
	],

	onload: async function (report) {
		report.page.set_title("Báo cáo dừng máy");
		this.load_manufacturing_categories(report);
		

		
		report.filters.forEach(f => {
			if (f.df.fieldname === "from_date") {
				f.set_value(frappe.datetime.add_days(frappe.datetime.get_today(), -7));
			} else if (f.df.fieldname === "to_date") {
				f.set_value(frappe.datetime.get_today());
			} else if (f.df.fieldname === "view_mode") {
				f.set_value("Theo nguyên nhân");
			} else {
				f.set_value("");
			}
		});

		// Khởi tạo charts lần đầu
		initializeCharts(report);

		// Hiển thị 2 chart mỗi hàng
		report.chartjsOptions = { number_per_row: 2 };

		// Load dữ liệu chart
		setTimeout(() => {
			refresh_charts_all(report);
			report._charts_initialized = true;  
		}, 100);
	},

	get_datatable_options(options) {
		return {
			...options,
			freezeIndex: 1,
			styleTitle:
				"text-align: left; font-size: clamp(16px, 1.5vw, 20px); margin-left: 10px; font-weight: 600;",
			title: "Chi tiết theo thiết bị:",
		};
	},

	load_manufacturing_categories: function(report) {
		frappe.db.get_list('Manufacturing Category', {
			fields: ['name'],
			limit: 0,
			order_by: 'name asc'
		}).then(records => {
			if (records && records.length > 0) {
				const filter = report.get_filter("category");
				if (filter) {
					filter.df.options = ['', ...records.map(r => r.name)];
					filter.refresh();
				}
			}
		});
	}
};



function validateDateRange(report) {
	const from_date = report.get_filter_value("from_date");
	const to_date = report.get_filter_value("to_date");
	
	if (from_date && to_date) {
		const from = frappe.datetime.str_to_obj(from_date);
		const to = frappe.datetime.str_to_obj(to_date);
		
		if (from > to) {
			frappe.throw({
				title: "Lỗi chọn ngày",
				message: "Từ ngày không được lớn hơn Đến ngày!",
				indicator: "red"
			});
			return false;
		}
	}
	
	return true;
}

function initializeCharts(report) {
	const view_mode = report.get_filter_value("view_mode");

	if (view_mode === "Theo nguyên nhân") {
		report.charts = [
			{
				title: "Downtime theo Nhóm nguyên nhân",
				options: {
					type: "bar",
					data: { labels: [], datasets: [{ data: [] }] },
					options: {
						responsive: true,
						onClick: async (event, elements, chartInstance) => {
							handleColumnFilter(chartInstance, elements, "reason_group", "Nhóm nguyên nhân");
						},
						plugins: {
							legend: { display: false },
							title: {
								display: true,
								text: "Downtime theo Nhóm nguyên nhân",
								font: { size: 16, weight: "bold" },
							},
						},
						scales: { y: { beginAtZero: true } },
					},
				},
			},
			{
				title: "Top nguyên nhân Downtime",
				options: {
					type: "bar",
					data: { labels: [], datasets: [{ data: [] }] },
					options: {
						indexAxis: "y",
						responsive: true,
						onClick: async (event, elements, chartInstance) => {
							handleColumnFilter(chartInstance, elements, "reason_detail", "Nguyên nhân");
						},
						plugins: {
							legend: { display: false },
							title: {
								display: true,
								text: "Top nguyên nhân Downtime",
								font: { size: 16, weight: "bold" },
							},
						},
						scales: { x: { beginAtZero: true } },
					},
				},
			},
		];
	} else {
		report.charts = [
			{
				title: "Downtime theo Cụm máy",
				options: {
					type: "bar",
					data: { labels: [], datasets: [{ data: [] }] },
					options: {
						responsive: true,
						onClick: async (event, elements, chartInstance) => {
							handleColumnFilter(chartInstance, elements, "machine_group", "Cụm máy");
						},
						plugins: {
							legend: { display: false },
							title: {
								display: true,
								text: "Downtime theo Cụm máy",
								font: { size: 16, weight: "bold" },
							},
						},
						scales: { y: { beginAtZero: true } },
					},
				},
			},
			{
				title: "Top Máy dừng nhiều nhất",
				options: {
					type: "bar",
					data: { labels: [], datasets: [{ data: [] }] },
					options: {
						indexAxis: "y",
						responsive: true,
						onClick: async (event, elements, chartInstance) => {
							handleColumnFilter(chartInstance, elements, "equipment_name", "Máy dừng");
						},
						plugins: {
							legend: { display: false },
							title: {
								display: true,
								text: "Top Máy dừng nhiều nhất",
								font: { size: 16, weight: "bold" },
							},
						},
						scales: { x: { beginAtZero: true } },
					},
				},
			},
		];
	}
}

async function refresh_charts_all(report) {
	let filters = frappe.query_report.get_filter_values();
	const mode = filters.view_mode;

	if (filters.from_date && !filters.to_date) {
		filters.to_date = frappe.datetime.get_today();
	} else if (!filters.from_date && filters.to_date) {
		filters.from_date = "2000-01-01";
	} else if (!filters.from_date && !filters.to_date) {
		filters.to_date = frappe.datetime.get_today();
		filters.from_date = frappe.datetime.add_days(frappe.datetime.get_today(), -7);
	}

	if (mode === "Theo nguyên nhân") {
		console.log('Theo nguyên nhân');

		const [r1, r2] = await Promise.all([
			frappe.call({
				method: "tahp.tahp.report.downtime_report_advanced.downtime_report_advanced.downtime_reason_group_data",
				args: { filters },
			}),
			frappe.call({
				method: "tahp.tahp.report.downtime_report_advanced.downtime_report_advanced.downtime_reason_detail_data",
				args: { filters },
			}),
		]);

		if (r1?.message?.labels) {
			const { labels, values, colors } = r1.message;
			report.charts[0].options.data.labels = labels;
			report.charts[0].options.data.datasets[0] = {
				data: values,
				backgroundColor: colors,
				borderColor: colors,
			};
			report.charts[0].options.options.scales.y.suggestedMax = Math.max(...values) * 1.1;
		}

		if (r2?.message?.labels) {
			let combined = r2.message.labels.map((label, i) => ({
				label,
				value: r2.message.values[i],
			}));
			combined.sort((a, b) => b.value - a.value);
			let top10 = combined.slice(0, 10);

			report.charts[1].options.data.labels = top10.map((i) => i.label);
			report.charts[1].options.data.datasets[0] = {
				data: top10.map((i) => i.value),
				backgroundColor: r2.message.colors,
				borderColor: r2.message.colors,
			};
			report.charts[1].options.options.scales.x.suggestedMax = Math.max(...top10.map((i) => i.value)) * 1.1;
		}
	}

	if (mode === "Theo thiết bị") {
		console.log('Theo thiết bị');

		const [r3, r4] = await Promise.all([
			frappe.call({
				method: "tahp.tahp.report.downtime_report_advanced.downtime_report_advanced.downtime_machine_group_data",
				args: { filters },
			}),
			frappe.call({
				method: "tahp.tahp.report.downtime_report_advanced.downtime_report_advanced.downtime_equipment_name_data",
				args: { filters },
			}),
		]);

		if (r3?.message?.labels) {
			const { labels, values, colors } = r3.message;
			report.charts[0].options.data.labels = labels;
			report.charts[0].options.data.datasets[0] = {
				data: values,
				backgroundColor: colors,
				borderColor: colors,
			};
			report.charts[0].options.options.scales.y.suggestedMax = Math.max(...values) * 1.1;
		}

		if (r4?.message?.labels) {
			let combined = r4.message.labels.map((label, i) => ({
				label,
				value: r4.message.values[i],
			}));
			combined.sort((a, b) => b.value - a.value);
			let top10 = combined.slice(0, 10);

			report.charts[1].options.data.labels = top10.map((i) => i.label);
			report.charts[1].options.data.datasets[0] = {
				data: top10.map((i) => i.value),
				backgroundColor: r4.message.colors,
				borderColor: r4.message.colors,
			};
			report.charts[1].options.options.scales.x.suggestedMax = Math.max(...top10.map((i) => i.value)) * 1.1;
		}
	}

	report.refresh();
}

function handleColumnFilter(chartInstance, elements, filter_field, fieldLabel) {
    if (elements.length === 0) return;
    
    const el = elements[0];
    const dataset = chartInstance.data.datasets[0];
    const label = chartInstance.data.labels[el.index];
    const currentFilter = frappe.query_report.get_filter_value(filter_field);

    if (!dataset._originalBackgroundColor) {
        dataset._originalBackgroundColor = [...dataset.backgroundColor];
    }

    if (currentFilter === label) {
        frappe.query_report.set_filter_value(filter_field, "");
        frappe.query_report.refresh();
        dataset.backgroundColor = [...dataset._originalBackgroundColor];
        frappe.show_alert({ message: "Đã xóa bộ lọc theo " + fieldLabel, indicator: "blue" });
    } else {
        frappe.query_report.set_filter_value(filter_field, label);
        frappe.query_report.refresh();
        dataset.backgroundColor = dataset._originalBackgroundColor.map((c, i) => {
            return i === el.index ? shadeColor(c, -40) : shadeColor(c, 50);
        });
        frappe.show_alert({ message: "Đã lọc theo: " + label, indicator: "green" });
    }

    chartInstance.update();
}

function shadeColor(color, percent) {
    let f = parseInt(color.slice(1),16), 
        t = percent < 0 ? 0 : 255, 
        p = Math.abs(percent)/100,
        R = f>>16,
        G = f>>8&0x00FF,
        B = f&0x0000FF;
    return "#" + (0x1000000 + (Math.round((t-R)*p)+R)*0x10000 + (Math.round((t-G)*p)+G)*0x100 + (Math.round((t-B)*p)+B)).toString(16).slice(1);
}