// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Week Work Order Comments Report"] = {
	onload: function(report) {
        // Thêm CSS để wrap text cho cột comment (col-5)
        const style = document.createElement('style');
        style.textContent = `
            .dt-cell__content--col-5 {
                cursor: pointer;
            }
            .dt-cell__content--col-5:hover {
                background-color: #f0f0f0;
            }
        `;
        document.head.appendChild(style);
        
        // Bắt sự kiện click vào cột comment
        $(document).on('click', '.dt-cell--col-5', function(e) {
            const cell = $(this);
            const commentText = cell.find('.dt-cell__content').text();
            
            if (commentText && commentText.trim()) {
                frappe.msgprint({
                    title: __('Chi tiết bình luận'),
                    message: commentText,
                    wide: true
                });
            }
        });
    },
    
	formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
        if (data && data.indent === 0 && column.fieldname === "name") {
            value = `<a href="/app/week-work-order/${data.name}" style="font-weight: 600;">${data.name}</a>`;
        }
        
        return value;
    }
};