// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Item Balance"] = {
    onload: function(report) {
		// report.charts = [
		// 	{
		// 		options: {
		// 			type: 'bar',
		// 			data: {
		// 				labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5'],
		// 				datasets: [{
		// 					label: 'Doanh số (triệu VNĐ)',
		// 					data: [120, 190, 300, 250, 280],
		// 					backgroundColor: [
		// 						'#FF6384',
		// 						'#36A2EB', 
		// 						'#FFCE56',
		// 						'#4BC0C0',
		// 						'#9966FF'
		// 					],
		// 					borderColor: '#fff',
		// 					borderWidth: 2,
		// 					borderRadius: 8
		// 				}]
		// 			},
		// 			options: {
		// 				responsive: true,
		// 				maintainAspectRatio: false,
		// 				plugins: {
		// 					title: {
		// 						display: true,
		// 						text: 'Biểu đồ doanh số theo tháng'
		// 					},
		// 					legend: {
		// 						position: 'top'
		// 					}
		// 				},
		// 				scales: {
		// 					y: {
		// 						beginAtZero: true,
		// 						title: {
		// 							display: true,
		// 							text: 'Triệu VNĐ'
		// 						}
		// 					},
		// 					x: {
		// 						title: {
		// 							display: true,
		// 							text: 'Tháng'
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 	},
		// 	{
		// 		options: {
		// 			type: 'bar',
		// 			data: {
		// 				labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5'],
		// 				datasets: [{
		// 					label: 'Doanh số (triệu VNĐ)',
		// 					data: [120, 190, 300, 250, 280],
		// 					backgroundColor: [
		// 						'#FF6384',
		// 						'#36A2EB', 
		// 						'#FFCE56',
		// 						'#4BC0C0',
		// 						'#9966FF'
		// 					],
		// 					borderColor: '#fff',
		// 					borderWidth: 2,
		// 					borderRadius: 8
		// 				}]
		// 			},
		// 			options: {
		// 				responsive: true,
		// 				maintainAspectRatio: false,
		// 				plugins: {
		// 					title: {
		// 						display: true,
		// 						text: 'Biểu đồ doanh số theo tháng'
		// 					},
		// 					legend: {
		// 						position: 'top'
		// 					}
		// 				},
		// 				scales: {
		// 					y: {
		// 						beginAtZero: true,
		// 						title: {
		// 							display: true,
		// 							text: 'Triệu VNĐ'
		// 						}
		// 					},
		// 					x: {
		// 						title: {
		// 							display: true,
		// 							text: 'Tháng'
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 	},
		// ];
        // report.chartjsOptions.number_per_row = 1
    },
};
