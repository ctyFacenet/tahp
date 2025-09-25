// Thay thế toàn bộ nội dung file material_consumption.js

frappe.query_reports["Material Consumption"] = {
    "filters": [
        {
            "fieldname": "manufacturing_category",
            "label": __("Hệ"),
            "fieldtype": "Link",
            "options": "Manufacturing Category",
            "on_change": function() {
                // Xử lý khi CHỌN filter
                frappe.query_reports["Material Consumption"].handle_filter_change();
            }
        },
        {
            "fieldname": "from_date",
            "label": __("Từ ngày"),
            "fieldtype": "Date",
            "on_change": function() {
                // Xử lý khi CHỌN date
                frappe.query_reports["Material Consumption"].handle_filter_change();
            }
        },
        {
            "fieldname": "to_date",
            "label": __("Đến ngày"),
            "fieldtype": "Date",
            "on_change": function() {
                // Xử lý khi CHỌN date
                frappe.query_reports["Material Consumption"].handle_filter_change();
            }
        },
    ],
    
    "onload": function(report) {
        frappe.require("https://cdn.jsdelivr.net/npm/chart.js").then(() => {
            // Chờ một chút để đảm bảo báo cáo đã được khởi tạo hoàn toàn
            setTimeout(() => {
                // Vẽ biểu đồ lần đầu tiên
                this.draw_chart();

                // --- LOGIC CỦA BẠN ĐỂ XỬ LÝ VIỆC XÓA DATE (ĐÃ SỬA LẠI CHO ĐÚNG) ---
                let previous_values = {
                    from_date: report.get_filter_value("from_date"),
                    to_date: report.get_filter_value("to_date")
                };

                const on_date_field_change = (fieldname) => {
                    const new_value = report.page.fields_dict[fieldname].get_value();
                    const old_value = previous_values[fieldname];

                    // Logic của bạn để phát hiện xóa date là đúng
                    if (old_value && !new_value) {
                        console.log(`Date field '${fieldname}' was cleared. Triggering full refresh.`);
                        // THAY ĐỔI QUAN TRỌNG: Gọi hàm xử lý trung tâm thay vì report.refresh()
                        this.handle_filter_change();
                    }
                    
                    previous_values[fieldname] = new_value;
                };

                // Gắn sự kiện của bạn vào các ô input
                if (report.page.fields_dict.from_date) {
                    report.page.fields_dict.from_date.$input.on('change', () => on_date_field_change("from_date"));
                }
                if (report.page.fields_dict.to_date) {
                    report.page.fields_dict.to_date.$input.on('change', () => on_date_field_change("to_date"));
                }

            }, 500);
        });
    },

    "handle_filter_change": function() {
        frappe.query_report.refresh(); // Làm mới bảng
        setTimeout(() => {
            this.draw_chart(); // Vẽ lại biểu đồ
        }, 500);
    },

    "draw_chart": function() {
        const data_rows = frappe.query_report.data;

        let existing_chart = Chart.getChart("myCustomChart");
        if (existing_chart) existing_chart.destroy();
        $('.report-wrapper .chart-container').remove();

        if (!data_rows || data_rows.length === 0) return;

        // <<< LOGIC MỚI: TÍNH TOÁN CHIỀU CAO ĐỘNG >>>
        const bar_thickness = 30; // Chiều rộng CỐ ĐỊNH cho mỗi cột (bằng pixel)
        const chart_padding = 100; // Không gian dự phòng cho tiêu đề, chú thích, trục...
        const num_bars = data_rows.length;
        
        // Tính toán chiều cao cần thiết
        let calculated_height = (num_bars * bar_thickness) + chart_padding;
        
        // Đặt một chiều cao tối thiểu để biểu đồ không quá lùn khi có ít dữ liệu
        if (calculated_height < 300) {
            calculated_height = 300;
        }
        // <<< KẾT THÚC LOGIC MỚI >>>

        // Tạo khung chứa và ÁP DỤNG chiều cao vừa tính được
        const chartContainer = $(`<div class="chart-container" style="margin-bottom: 20px; height: ${calculated_height}px;">
            <canvas id="myCustomChart"></canvas>
        </div>`);
        $('.report-wrapper').prepend(chartContainer);

        const labels = data_rows.map(row => row.material_name);
        
        // Xóa thuộc tính barPercentage vì không cần nữa
        const datasets = [
            {
                label: 'Thực tế',
                data: data_rows.map(row => row.within_limit_qty),
                backgroundColor: 'rgba(128, 128, 224, 0.8)'
            },
            {
                label: 'Vượt định mức',
                data: data_rows.map(row => row.over_limit_qty),
                backgroundColor: 'rgba(255, 99, 132, 0.8)'
            }
        ];

        const ctx = document.getElementById('myCustomChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                // Rất quan trọng: Cho phép biểu đồ thay đổi tỉ lệ
                maintainAspectRatio: false, 
                scales: { x: { stacked: true }, y: { stacked: true } },
                plugins: { title: { display: true, text: 'Số lượng nguyên vật liệu tiêu hao' } }
            }
        });
    }
};
