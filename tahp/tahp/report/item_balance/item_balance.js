frappe.query_reports["Item Balance"] = {
    onload: function(report) {
        // report.charts = [
        //     {
        //         html: "hybrid",   // bật chế độ hybrid
        //         options: {
        //             type: 'bar',
        //             data: {
        //                 labels: ['Điện tử', 'Văn phòng phẩm', 'Thực phẩm', 'Đồ dùng nhà bếp'],
        //                 datasets: [
        //                     {
        //                         label: 'Số lượng đang có',
        //                         data: [120, 80, 150, 60],
        //                         backgroundColor: [
        //                             'rgba(75, 192, 192, 0.5)',
        //                             'rgba(255, 159, 64, 0.5)',
        //                             'rgba(153, 102, 255, 0.5)',
        //                             'rgba(255, 99, 132, 0.5)'
        //                         ],
        //                         borderColor: [
        //                             'rgba(75, 192, 192, 1)',
        //                             'rgba(255, 159, 64, 1)',
        //                             'rgba(153, 102, 255, 1)',
        //                             'rgba(255, 99, 132, 1)'
        //                         ],
        //                         borderWidth: 1
        //                     }
        //                 ]
        //             },
        //             options: {
        //                 plugins: {
        //                     legend: { position: 'top' }
        //                 }
        //             }
        //         },
        //         hybrid: {
        //             top: "<div class='hybrid-top text-muted mb-2'><strong>Báo cáo tồn kho</strong></div>",
        //             bottom: () => {
        //                 return $("<div class='hybrid-bottom small mt-2 text-muted'>Nguồn dữ liệu: ERPNext</div>");
        //             }
        //         }
        //     }
        // ];

        report.chartjsOptions.number_per_row = 2
    },
};