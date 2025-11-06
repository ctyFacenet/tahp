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
        setTimeout(() => {
            report.$report.find('.dt-dropdown').hide();
        }, 300);
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
                font-weight: 500;
                position: relative;
                overflow: hidden;
            `;

            // CSS animation ripple
            const animations = `
                <style>
                @keyframes ripple-flow {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                </style>
            `;

            if (!document.querySelector("#status-animations")) {
                const styleEl = document.createElement("div");
                styleEl.id = "status-animations";
                styleEl.innerHTML = animations;
                document.head.appendChild(styleEl);
            }

            const randomDelay = (Math.random() * 1).toFixed(2);

            // ---- Xử lý trạng thái ----
            if (data.status === "Đang chạy") {
                value = `<span style="${base_style} 
                    background: linear-gradient(90deg, 
                        #53ff7b 0%, 
                        #7effa0 25%,
                        #53ff7b 50%, 
                        #7effa0 75%,
                        #53ff7b 100%
                    );
                    background-size: 200% 100%;
                    animation: ripple-flow 3s linear infinite;
                    animation-delay: -${randomDelay}s;">${value}</span>`;
            } 
            else if (data.status && data.status.endsWith("Đang chạy")) {
                // ví dụ: "75% Đang chạy"
                value = `<span style="${base_style} 
                    background: linear-gradient(90deg, 
                        #d4f4dd 0%, 
                        #e8f9ec 25%,
                        #d4f4dd 50%, 
                        #e8f9ec 75%,
                        #d4f4dd 100%
                    );
                    background-size: 200% 100%;
                    color:#28a745; 
                    font-weight: bold;
                    animation: ripple-flow 3s linear infinite;
                    animation-delay: -${randomDelay}s;">${value}</span>`;
            } 
            else if (data.status === "Tạm dừng") {
                value = `<span style="${base_style} 
                    background: linear-gradient(90deg, 
                        #ffc107 0%, 
                        #ffd24c 25%,
                        #ffc107 50%, 
                        #ffd24c 75%,
                        #ffc107 100%
                    );
                    background-size: 200% 100%;
                    animation: ripple-flow 4s linear infinite;
                    animation-delay: -${randomDelay}s;">${value}</span>`;
            } 
            else if (["Bảo trì", "Sự cố"].includes(data.status)) {
                value = `<span style="${base_style} 
                    background: linear-gradient(90deg, 
                        #ff8a8a 0%, 
                        #ffabab 25%,
                        #ff8a8a 50%, 
                        #ffabab 75%,
                        #ff8a8a 100%
                    );
                    background-size: 200% 100%;
                    animation: ripple-flow 4s linear infinite;
                    animation-delay: -${randomDelay}s;">${value}</span>`;
            }
            else if (data.status && (data.status.endsWith("Sự cố") || data.status.endsWith("Bảo trì"))) {
                // ví dụ: "60% Sự cố" hoặc "40% Bảo trì"
                value = `<span style="${base_style} 
                    background: linear-gradient(90deg, 
                        #ffd6d6 0%, 
                        #ffe1e1 25%,
                        #ffd6d6 50%, 
                        #ffe1e1 75%,
                        #ffd6d6 100%
                    );
                    background-size: 200% 100%;
                    color:#d63031; 
                    font-weight: bold;
                    animation: ripple-flow 4s linear infinite;
                    animation-delay: -${randomDelay}s;">${value}</span>`;
            }
            else if (["Đang tắt"].includes(data.status)) {
                value = `<span style="${base_style} 
                    background: linear-gradient(90deg, 
                        #e0e0e0 0%, 
                        #eeeeee 25%,
                        #e0e0e0 50%, 
                        #eeeeee 75%,
                        #e0e0e0 100%
                    );
                    background-size: 200% 100%;
                    animation: ripple-flow 5s linear infinite;
                    animation-delay: -${randomDelay}s;">${value}</span>`;
            }
        }

        // In đậm cụm máy cha
        if (column.fieldname === "workstation" && row[0].indent === 0) {
            let base_style = `
                font-weight: bold;
                padding: 2px 8px;
            `;
            value = `<span style="${base_style}">${value}</span>`;
        }

        // --- Đếm thời gian runtime ---
        function parseDuration(text) {
            if (!text) return 0;
            let parts = text.split(':').map(Number);
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            return 0;
        }
        function formatDuration(sec) {
            let h = Math.floor(sec / 3600);
            let m = Math.floor((sec % 3600) / 60);
            let s = sec % 60;
            return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
        }

        if (
            (data.status === "Tạm dừng" && ["stop_time", "stop_time_overall"].includes(column.fieldname)) ||
            (data.status === "Đang chạy" && column.fieldname === "active_time")
        ) {
            let seconds = parseDuration(data[column.fieldname]);
            const cellId = `${column.fieldname}-${data.name || data.id || Math.random().toString(36).slice(2)}`;

            value = `
                <div id="${cellId}" class="runtime-timer"
                    data-seconds="${seconds}"
                    data-status="${data.status}"
                    style="text-align:center;">
                    ${formatDuration(seconds)}
                </div>
            `;

            setTimeout(() => {
                const el = document.getElementById(cellId);
                if (!el) return;
                if (el.dataset.timerId) {
                    clearInterval(Number(el.dataset.timerId));
                    delete el.dataset.timerId;
                }
                if (["Đang chạy", "Tạm dừng"].includes(el.dataset.status)) {
                    let current = Number(el.dataset.seconds);
                    const id = setInterval(() => {
                        current++;
                        el.dataset.seconds = current;
                        el.textContent = formatDuration(current);
                    }, 1000);
                    el.dataset.timerId = id;
                }
            }, 0);
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
                       style="min-width:100%; border-collapse: collapse; white-space: nowrap; border:1px solid #b6b6b6;">
                    <thead style="background-color: rgb(205, 222, 238); font-weight: bold;">
                        <tr>
        `;

        // header
        columns.forEach(col => {
            html += `<th style="padding:5px 12px; border:1px solid #b6b6b6 !important;">${col.label}</th>`;
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
                let cellStyle = "padding:5px; border:1px solid #b6b6b6; text-align:center; font-weight:bold;";

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

        html += `</tbody></table>*Dữ liệu được cập nhật theo ca gần nhất</div>`;
        return html;
    }

    return "<div class='text-center'>Không có dữ liệu</div>";
}
