// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Stock Ledger Custom"] = {
    onload: function(report) {
        console.log('hi');
        setTimeout(function() {
            $('.dt-scrollable').css('height', '800px');
        }, 200); // chờ 300ms
    },
};
