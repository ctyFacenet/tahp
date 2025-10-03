// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Workstation Status Report"] = {
	"filters": [
		{
			"fieldname": "category",
			"label": "Hệ sản xuất",
			"fieldtype": "Link",
			"options": "Manufacturing Category",
		}
	],
	"onload": async function(report) {
		let ws = report.get_filter("category");
		if (ws.value) report.refresh();
		report.charts = [
			{
				html: true,
				htmlRender: () => execute_summary(report)
			}
		];
	},

	formatter: function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname === "status") {
			let base_style = `
				padding-inline: 10px;
				border-radius: 15px;
				display: inline-block;
				width: 100%;
				height: 100%;
				text-align: center;
				display: flex;
				align-items: center;
				justify-content: center;
			`;

			if (data.status === "Đang chạy") {
				// Thiết bị con
				value = `<span style="${base_style} background-color: #53ff7bff;">${value}</span>`;
			} else if (data.status && data.status.endsWith("Đang chạy")) {
				// Cụm cha (có % Đang chạy)
				value = `<span style="${base_style} color:#28a745; font-weight: bold;">${value}</span>`;
			} else if (data.status === "Tạm dừng") {
				value = `<span style="${base_style} background-color: #ffeeba;">${value}</span>`;
			} else if (["Bảo trì", "Sự cố"].includes(data.status)) {
				value = `<span style="${base_style} background-color: #ff8a8aff;">${value}</span>`;
			} else if (["Đang tắt"].includes(data.status)) {
				value = `<span style="${base_style} background-color: #e0e0e0;">${value}</span>`;
			}
		}

		if (column.fieldname === "workstation" && row[0].indent === 0) {
			let base_style = `
				font-weight: bold;
				padding: 2px 8px;
			`;
			value = `<span style="${base_style}">${value}</span>`;
		}

		return value;
	},
	
    get_datatable_options(options) {
        return { ...options, headerBackground: "rgba(205, 222, 238, 1)"};
    }
};

async function execute_summary(report) {
    let filters = {};
    report.filters.forEach(d => {
        filters[d.fieldname] = d.value;
    });

    let response = await frappe.call({
        method: "tahp.tahp.report.workstation_status_report.workstation_status_report.execute_summary",
        args: { filters: filters }
    });

    if (response.message) {
        let columns = response.message[0];  // [{fieldname, label}, ...]
        let data = response.message[1];     // [{status: "...", ...}, ...]

        let html = `
            <div style="overflow-x:auto; width:100%;">
                <table class="table table-bordered text-center" 
                       style="min-width:100%; border-collapse: collapse; white-space: nowrap;">
                    <thead style="background-color: rgb(205, 222, 238); font-weight: bold;">
                        <tr>
        `;

        // header
        columns.forEach(col => {
            html += `<th style="padding:5px 12px; border:1px solid #ddd;">${col.label}</th>`;
        });
        html += `</tr></thead><tbody>`;

        // body
        data.forEach(row => {
            let rowStyle = "";
            const status = row["status"];

            // highlight nguyên dòng theo status
            if (status === "% Máy khả dụng") {
                rowStyle = "background-color:#53ff7bff;";
            } else if (status === "Đang tắt") {
                rowStyle = "background-color:rgba(238, 238, 238, 1);";
            } else if (status === "Tổng số máy") {
                rowStyle = "background-color:rgb(205, 222, 238);";
            }

            html += `<tr style="${rowStyle}">`;

            columns.forEach((col, idx) => {
                let cellValue = row[col.fieldname] || "";
                let cellStyle = "padding:5px; border:1px solid #ddd; text-align:center; font-weight:bold;";

                // cột đầu tiên luôn có nền
                if (idx === 0) {
                    cellStyle += " background-color: rgb(205, 222, 238);";
                }

                // sự cố / bảo trì: highlight ô > 0
                if ((status === "Sự cố" || status === "Bảo trì") && Number(cellValue) > 0) {
                    cellStyle += " background-color:#ff8a8aff;";
                }

                html += `<td style="${cellStyle}">${cellValue}</td>`;
            });

            html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        return html;
    }

    return "<div class='text-center'>Không có dữ liệu</div>";
}

