frappe.listview_settings["Custom Invoice Allocation"] = {
    hide_name_column: true,

    get_indicator: function(doc) {
        if (doc.docstatus === 0) {
            return ["Chưa in", "red", "docstatus"];
        } else if (doc.docstatus === 1) {
            return ["Đã in", "green", "docstatus"];
        }
    },
    refresh: async function(listview) {
		listview.page.add_action_item('In chứng từ', () => print(listview));
    },
};

async function print(list_view) {
    let checked_items = cur_list.get_checked_items(true); 
    if (checked_items.length === 0) { 
        frappe.msgprint('Vui lòng chọn ít nhất 1 chứng từ trước khi in');
        return;
    }

    frappe.confirm(
        "Bạn có chắc chắn muốn in không? Hành động này không thể hoàn tác.",
        async function() {
            const today = new Date();
            const formattedDate = today.toLocaleString('vi-VN', { hour12: false });

			let res = await frappe.call({
                method: "tahp.tahp.doctype.custom_invoice_allocation.custom_invoice_allocation.get_invoice_allocation_items",
                args: { items: checked_items },
            });
			list_view.refresh();

			const items_data = res.message; 
            
            let html = `
                <html >
                <body style="font-family: 'Times New Roman', Times, serif;margin: 0;padding: -20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <img src="/assets/tahp/images/tahp.svg" style="width: 80px; height: auto;" alt="Logo">
                        <div style="flex-grow: 1; text-align: center;">
                            <h2 style="text-align: center; text-transform: uppercase; font-weight: bold; margin-bottom: 0;">Phiếu chốt chứng từ mặt hàng</h2>
                            <h5 style="text-align: center; font-weight: bold; margin-top: 5px; color: #555;">Ngày tạo: ${formattedDate}</h5>
                        </div>
                    </div>

                    <table style="width: 100%; margin-top: 20px; font-size: 12px; border-collapse: collapse; border: 1px solid black;">
                        <thead>
                            <tr style="background-color: #f0f0f0;">
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Ngày tạo phiếu</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Mã phiếu</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Ngày chứng từ</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Mã mặt hàng</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Tên mặt hàng</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Đơn vị</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">SL nhập</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">SL xuất</th>
                                <th style="border: 1px solid black; padding: 5px; text-align: center;">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

			for (let item of items_data) {
				html += `
					<tr>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.posting_date || ''}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.stock_entry || ''}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.approved_date || ''}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.item_code || ''}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.item_name || ''}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.stock_uom || ''}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.in_qty || 0}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: center;">${item.out_qty || 0}</td>
						<td style="border: 1px solid black; padding: 5px; text-align: left; word-wrap: break-word; max-width: 200px;">${item.remark || ''}</td>
					</tr>
				`;
			}

            html += `
                        </tbody>
                    </table>

                    <div style="margin-top: 40px; display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif;">
                        <div>
                        </div>
                        <div style="text-align: center;">
                            <p style="margin:0;">Người lập phiếu</p>
                            <p style="margin:0;font-weight: bold;">${frappe.session.user_fullname || frappe.session.user}</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

			console.log(html);

            const params = new URLSearchParams({ html: html });
            const url = `/api/method/tahp.utils.weasyprint.download_pdf?${params}`;
            const w = window.open(url);
            if (!w) frappe.msgprint(__("Please enable pop-ups"));
        },
        function() { 
            return;
        }
    );
}

