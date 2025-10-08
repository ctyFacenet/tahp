
frappe.pages['manufacturing_dash'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Manufacturing Dashboard',
        single_column: true
    });

    this.charts = {
        category: null,
        attribute: null,
        manufacturing: null,
        bom: null
    };

    page.set_title('Báo cáo sản lượng theo phân loại');
    // debounce control
    this.refreshTimeout = null;

    // render dashboard template 1 lần duy nhất
    let initial_data = {
        today_output: 0,
        success_rate: 0
    };
    $(frappe.render_template("manufacturing_dash", initial_data)).appendTo(page.main);

    // refresh_dashboard
    this.refresh_dashboard = async () => {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(async () => {
            let filters = {
                from_date: page.fields_dict.from_date.get_value(),
                to_date: page.fields_dict.to_date.get_value(),
                main_item: page.fields_dict.main_item.get_value(),
                sub_item: page.fields_dict.sub_item.get_value(),
                attribute: page.fields_dict.attribute.get_value()
            };

            // if (filters.to_date < filters.from_date) {
            //     frappe.msgprint('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
            //     return;
            // }

            // const diff_days = frappe.datetime.get_diff(filters.to_date, filters.from_date);
            // if (diff_days > 7) {
            //     frappe.msgprint('Khoảng ngày không được vượt quá 7 ngày');
            //     return;
            // }

            console.log("Refreshing with filters:", filters);

            let response = await frappe.xcall(
                "tahp.tahp.page.manufacturing_dash.manufacturing_dash.execute", 
                { filters }
            );

            let data = {
                today_output: 1200,
                success_rate: 95
            };

            // chỉ update DOM, không render lại template
            $("#dash-container .today-output").text(data.today_output + " sản phẩm");
            $("#dash-container .success-rate").text(data.success_rate + "%");

            this.render_charts(response);

            this.refreshTimeout = null;
        }, 300); // debounce 100ms
    };

    page.add_field({
        fieldname: 'from_date',
        label: 'Từ ngày',
        fieldtype: 'Date',
        default: frappe.datetime.add_days(frappe.datetime.get_today(), -7),
        change: () => this.refresh_dashboard()
    });
    page.add_field({
        fieldname: 'to_date',
        label: 'Đến ngày',
        fieldtype: 'Date',
        default: frappe.datetime.get_today(),
        change: () => this.refresh_dashboard()
    });

    page.add_field({
        fieldname: 'main_item',
        label: 'Mặt hàng chính',
        fieldtype: 'Link',
        options: 'Item',
        change: () => this.refresh_dashboard()
    });

    page.add_field({
        fieldname: 'sub_item',
        label: 'Mặt hàng phụ',
        fieldtype: 'Link',
        options: 'Item',
        change: () => this.refresh_dashboard()
    });

    page.add_field({
        fieldname: 'attribute',
        label: 'Phân loại',
        fieldtype: 'Link',
        options: 'Item Attribute',
        change: () => this.refresh_dashboard()
    });

    (async () => {
        if (await frappe.db.exists('Item', 'TP00001')) {
            page.fields_dict.main_item.set_value('TP00001');
        }

        if (await frappe.db.exists('Item', 'TP00004')) {
            page.fields_dict.sub_item.set_value('TP00004');
        }

        if (await frappe.db.exists('Item Attribute', 'Phân loại')) {
            page.fields_dict.attribute.set_value('Phân loại');
        }
    })();

    $(page.body).append(`<div id="dash-container" style="margin-top:20px;"></div>`);

    this.render_charts = (response) => {
        console.log(response)

        let main_item = page.fields_dict.main_item.get_value();
        if (!main_item) {
            document.querySelector(`.category-title`).textContent = "Chưa chọn mặt hàng chính";
            document.querySelector(`.attribute-title`).textContent = "";
            document.querySelector(`.bom-title`).textContent = "";

            // Reset cards
            function resetCard(section) {
                const labelEl = document.querySelector(`.${section}-label`);
                const producedEl = document.querySelector(`.${section}-produced`);
                const qtyEl = document.querySelector(`.${section}-qty`);
                const unitEl = document.querySelector(`.${section}-unit`);
                const changeEl = document.querySelector(`.${section}-change`);
                const progressEl = section === "main" ? document.querySelector(".progress-bar.bg-success") 
                                                    : document.querySelectorAll(".progress-bar")[1];

                labelEl.textContent = "Chưa có";
                producedEl.textContent = "0";
                qtyEl.textContent = "";
                unitEl.textContent = "Tấn";
                changeEl.textContent = "0";
                changeEl.className = `${section}-change text-success`;
                progressEl.style.width = "0%";
                progressEl.className = `progress-bar bg-success`;
            }
            resetCard("main");
            resetCard("sub");

            // Xóa chart nếu có
            if (this.charts.category) { this.charts.category.destroy(); this.charts.category = null; }
            if (this.charts.attribute) { this.charts.attribute.destroy(); this.charts.attribute = null; }
            if (this.charts.manufacturing) { this.charts.manufacturing.destroy(); this.charts.manufacturing = null; }
            if (this.charts.bom) { this.charts.bom.destroy(); this.charts.bom = null; }

            return; // Ngưng không render tiếp
        }

        if (response.overall) {
            document.querySelector(`.category-title`).textContent = `Sản lượng ${response.overall.main.label} theo hệ`;
            document.querySelector(`.attribute-title`).textContent = `Sản lượng ${response.overall.main.label} hoàn thành theo kế hoạch`;
            if (response.overall.main.unit) document.querySelector(`.bom-title`).textContent = `Báo cáo tiêu hao NVL / 1 ${response.overall.main.unit} thành phẩm`;
        }

        // Bảng màu hiện đại
        const modernColors = [
            { bg: 'rgba(99, 102, 241, 0.5)', border: 'rgba(99, 102, 241, 1)' },      // Indigo
            { bg: 'rgba(244, 63, 94, 0.5)', border: 'rgba(244, 63, 94, 1)' },        // Rose
            { bg: 'rgba(14, 165, 233, 0.5)', border: 'rgba(14, 165, 233, 1)' },      // Sky
            { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' },      // Purple
            { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' },       // Amber
            { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 1)' },        // Green
            { bg: 'rgba(248, 113, 113, 0.5)', border: 'rgba(248, 113, 113, 1)' },    // Red-400
            { bg: 'rgba(251, 207, 232, 0.5)', border: 'rgba(251, 207, 232, 1)' },    // Pink-200
            { bg: 'rgba(34, 211, 238, 0.5)', border: 'rgba(34, 211, 238, 1)' },      // Cyan-400
            { bg: 'rgba(132, 204, 22, 0.5)', border: 'rgba(132, 204, 22, 1)' },      // Lime-400
            { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 1)' },      // Amber-400 (copy để phối)
            { bg: 'rgba(168, 85, 247, 0.5)', border: 'rgba(168, 85, 247, 1)' },      // Purple-400 (copy để phối)
        ];

        if (this.charts.category) this.charts.category.destroy();
        if (this.charts.attribute) this.charts.attribute.destroy();
        if (this.charts.manufacturing) this.charts.manufacturing.destroy();
        if (this.charts.bom) this.charts.bom.destroy();

        function updateCard(section, data) {
            const labelEl = document.querySelector(`.${section}-label`);
            const producedEl = document.querySelector(`.${section}-produced`);
            const qtyEl = document.querySelector(`.${section}-qty`);
            const unitEl = document.querySelector(`.${section}-unit`);
            const changeEl = document.querySelector(`.${section}-change`);
            const progressEl = section === "main" ? document.querySelector(".progress-bar.bg-success") 
                                                : document.querySelectorAll(".progress-bar")[1];

            if (data) {
                const percent = data.qty > 0 ? (data.produced_qty / data.qty * 100) : 0;
                labelEl.textContent = data.label;
                producedEl.textContent = data.produced_qty + " " + (data.unit || "Tấn");
                qtyEl.textContent = data.qty;
                unitEl.textContent = data.unit || "Tấn";
                const colorClass = data.produced_qty >= data.old_qty ? 'text-success' : 'text-danger';
                changeEl.textContent = `(${data.produced_qty >= data.old_qty ? '+' : '-'}${Math.abs(data.produced_qty - data.old_qty)})`;
                changeEl.className = `${section}-change ${colorClass}`;
                progressEl.style.width = percent + "%";
                progressEl.className = `progress-bar bg-success`;
            } else {
                // Reset về mặc định
                labelEl.textContent = "Chưa có";
                producedEl.textContent = "0";
                qtyEl.textContent = "";
                unitEl.textContent = "Tấn";
                changeEl.textContent = "0";
                changeEl.className = `${section}-change text-success`;
                progressEl.style.width = "0%";
                progressEl.className = `progress-bar bg-success`;
            }
        }

        // Gọi hàm
        updateCard("main", response.overall && response.overall.main);
        updateCard("sub", response.overall && response.overall.sub);

        if (response.category_overall) {
            let cat = response.category_overall;
            let catLabels = Object.keys(cat);
            let subKeys = Object.keys(cat[catLabels[0]]).filter(k => k !== "label");

            // Chuẩn bị datasets
            this.charts.category = new Chart(document.getElementById("chart-category"), {
                type: 'bar',
                data: {
                    labels: catLabels.map(k => cat[k].label || k),
                    datasets: subKeys.map((sub, i) => ({
                        label: sub,
                        data: catLabels.map(k => cat[k][sub].qty),   // dùng qty
                        backgroundColor: modernColors[i % modernColors.length].bg,
                        borderColor: modernColors[i % modernColors.length].border,
                        borderWidth: 2
                    }))
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                    },
                    onClick: (evt, elements) => {
                        if (elements.length > 0) {
                            let chart = elements[0];
                            let catName = catLabels[chart.index];
                            let subKey = subKeys[chart.datasetIndex];
                            let workOrders = cat[catName][subKey].work_orders;

                            if (workOrders.length > 0) {
                                // Ví dụ: điều hướng sang list view Work Order
                                frappe.set_route("List", "Work Order", { "name": ["in", workOrders] });
                            }
                        }
                    }
                }
            });
        }

        if (response.attribute_overall) {
            const categories = Object.keys(response.category_overall);
            const systemSelect = document.getElementById('attribute-system-select');
            
            // Render dropdown categories
            systemSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');

            // Sự kiện khi chọn category khác
            systemSelect.onchange = async () => {
                let category = systemSelect.value;
                let main = page.fields_dict.main_item.get_value();
                let from_date = page.fields_dict.from_date.get_value();
                let to_date = page.fields_dict.to_date.get_value();
                let attribute = page.fields_dict.attribute.get_value();

                // Gọi API backend
                let new_attr = await frappe.call({
                    method: "tahp.tahp.page.manufacturing_dash.manufacturing_dash.attribute_overall",
                    args: { main, from_date, to_date, attribute, category }
                });

                if (new_attr.message) {
                    this.render_attribute_chart(new_attr.message);
                }
            };

            // Hàm vẽ chart tách riêng để dùng lại
            this.render_attribute_chart = (attr) => {
                let attrKeys = Object.keys(attr);
                let datasets = attrKeys.map((k, i) => {
                    let val = attr[k];
                    let percent = val.qty > 0 ? val.produced_qty / val.qty * 100 : 0;
                    return {
                        label: val.label || k,
                        data: [percent, 100 - percent],
                        qty: val.qty,                // thêm qty gốc
                        produced_qty: val.produced_qty, // thêm produced gốc
                        backgroundColor: [
                            modernColors[i % modernColors.length].bg,
                            "rgba(229, 231, 235, 0.5)"
                        ],
                        borderColor: [
                            modernColors[i % modernColors.length].border,
                            "rgb(209, 213, 219)"
                        ],
                        borderWidth: 2,
                        rotation: 0,
                        circumference: 270,
                        cutout: `${60 - i * 15}%`
                    };
                });

                // Xóa chart cũ nếu có
                if (this.charts.attribute) {
                    this.charts.attribute.destroy();
                }

                this.charts.attribute = new Chart(document.getElementById("chart-attribute"), {
                    type: 'doughnut',
                    data: { datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const dataset = context.dataset;
                                        const label = dataset.label || '';
                                        const percent = dataset.data[0].toFixed(1);
                                        const produced = dataset.produced_qty;
                                        const qty = dataset.qty;
                                        return `${label}: ${percent}% (${produced}/${qty})`;
                                    }
                                }
                            }
                        },
                    },
                    plugins: [{
                        id: 'doughnutLabel',
                        afterDatasetsDraw: function(chart) {
                            const ctx = chart.ctx;
                            const fixedAngle = 0 * Math.PI / 180;
                            chart.data.datasets.forEach((dataset, i) => {
                                const meta = chart.getDatasetMeta(i);
                                if (!meta.hidden) {
                                    const arc = meta.data[0];
                                    const radius = (arc.innerRadius + arc.outerRadius) / 2;
                                    const centerX = arc.x + radius * Math.cos(fixedAngle - Math.PI / 2) - 10;
                                    const centerY = arc.y + radius * Math.sin(fixedAngle - Math.PI / 2) + 8;

                                    ctx.save();
                                    ctx.textAlign = 'right';
                                    ctx.textBaseline = 'middle';

                                    const percent = dataset.data[0].toFixed(1);
                                    ctx.fillText(dataset.label, centerX, centerY - 14);
                                    ctx.fillText(`${percent}% (${dataset.produced_qty}/${dataset.qty})`, centerX, centerY);
                                    ctx.restore();
                                }
                            });
                        }
                    }]
                });
            };


            // Vẽ chart lần đầu
            this.render_attribute_chart(response.attribute_overall);
        }

        if (response.manufacturing_overall) {
            let manu = response.manufacturing_overall;
            let manuLabels = Object.keys(manu);

            let datasets = [];

            if (page.fields_dict.sub_item.get_value()) {
                datasets.push(
                    {
                        type: 'line',
                        label: `${response.overall.sub.label} chưa sản xuất`,
                        data: manuLabels.map(k => manu[k].sub.qty),
                        borderColor: modernColors[4].border,
                        backgroundColor: modernColors[4].bg,
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        stack: undefined
                    },
                    {
                        type: 'line',
                        label: `${response.overall.sub.label} đã sản xuất`,
                        data: manuLabels.map(k => manu[k].sub.produced_qty),
                        borderColor: modernColors[5].border,
                        backgroundColor: modernColors[5].bg,
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        stack: undefined
                    }
                );
            }

            // Luôn có main → vẽ bar
            datasets.push(
                {
                    type: 'bar',
                    label: `${response.overall.main.label} đã sản xuất`,
                    data: manuLabels.map(k => manu[k].main.produced_qty),
                    backgroundColor: modernColors[1].bg,
                    borderColor: modernColors[1].border,
                    borderWidth: 2,
                    stack: 'main'
                },
                {
                    type: 'bar',
                    label: `${response.overall.main.label} chưa sản xuất`,
                    data: manuLabels.map(k => manu[k].main.qty),
                    backgroundColor: modernColors[0].bg,
                    borderColor: modernColors[0].border,
                    borderWidth: 2,
                    stack: 'main'
                },
            );

            this.charts.manufacturing = new Chart(document.getElementById("chart-manufacturing"), {
                data: {
                    labels: manuLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { stacked: true }
                    },
                onClick: (evt, elements) => {
                    if (elements.length > 0) {
                        let chart = this.charts.manufacturing;
                        let elem = elements[0];
                        let day = chart.data.labels[elem.index]; // YYYY-MM-DD
                        let datasetLabel = chart.data.datasets[elem.datasetIndex].label;

                        // Xác định nhóm main/sub và loại (đã/chưa sản xuất)
                        let isMain = datasetLabel.includes(response.overall.main.label);
                        let isProduced = datasetLabel.includes("đã sản xuất");

                        // Lấy danh sách work order từ response
                        let wo_list = [];
                        if (isMain) {
                            wo_list = isProduced
                                ? (response.manufacturing_overall[day].main.produced_qty_wo || [])
                                : (response.manufacturing_overall[day].main.qty_wo || []);
                        } else {
                            wo_list = isProduced
                                ? (response.manufacturing_overall[day].sub.produced_qty_wo || [])
                                : (response.manufacturing_overall[day].sub.qty_wo || []);
                        }

                        if (wo_list.length > 0) {
                            frappe.set_route("List", "Work Order", { name: ["in", wo_list] });
                        } else {
                            frappe.msgprint("Không có Work Order nào trong danh sách này.");
                        }
                    }
                }
                }
            });
        }

        if (response.bom_overall) {
            // Div5: bom_overall (grouped bar)
            let bom = response.bom_overall;
            let bomDates = Object.keys(bom);
            let items = [...new Set(bomDates.flatMap(d => Object.keys(bom[d])))]; // gom tất cả item xuất hiện ở bất kỳ ngày nào
            let bomDatasets = [];
            
            // Màu cho Produced_qty - luôn dùng màu thứ 2
            let producedColor = modernColors[1];
            
            items.forEach((item, i) => {
                // Tìm label từ ngày đầu tiên có dữ liệu
                let itemLabel = item;
                for (let d of bomDates) {
                    if (bom[d][item]?.label) {
                        itemLabel = bom[d][item].label;
                        break;
                    }
                }

                // Chọn màu cho Qty (bỏ 2 màu đầu)
                let qtyColor = modernColors[(i + 2) % modernColors.length];

                // Qty
                bomDatasets.push({
                    label: itemLabel,
                    data: bomDates.map(d => bom[d][item]?.qty || 0),
                    backgroundColor: qtyColor.bg,
                    borderColor: qtyColor.border,
                    borderWidth: 2,
                    stack: item
                });

                // Produced_qty
                bomDatasets.push({
                    label: "Vượt định mức",
                    data: bomDates.map(d => bom[d][item]?.produced_qty || 0),
                    backgroundColor: producedColor.bg,
                    borderColor: producedColor.border,
                    borderWidth: 2,
                    stack: item
                });
            });

            this.charts.bom = new Chart(document.getElementById("chart-bom"), {
                type: 'bar',
                data: { labels: bomDates, datasets: bomDatasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                // Gộp các dataset có cùng label
                                generateLabels: function(chart) {
                                    const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                    const seen = new Set();
                                    return original.filter(item => {
                                        if (seen.has(item.text)) {
                                            return false;
                                        }
                                        seen.add(item.text);
                                        return true;
                                    });
                                }
                            },
                            onClick: function(e, legendItem, legend) {
                                const index = legendItem.datasetIndex;
                                const chart = legend.chart;
                                const label = legendItem.text;
                                
                                if (label === "Vượt định mức") {
                                    const isVisible = chart.isDatasetVisible(index);
                                    chart.data.datasets.forEach((dataset, i) => {
                                        if (dataset.label === "Vượt định mức") {
                                            chart.setDatasetVisibility(i, !isVisible);
                                        }
                                    });
                                } else {
                                    Chart.defaults.plugins.legend.onClick(e, legendItem, legend);
                                }
                                chart.update();
                            }
                        }
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                    },
                    onClick: (evt, elements) => {
                        if (elements.length === 0) return;

                        let elem = elements[0];
                        let chart = this.charts.bom;
                        let day = chart.data.labels[elem.index];   // YYYY-MM-DD
                        let dataset = chart.data.datasets[elem.datasetIndex];
                        let itemCode = dataset.stack;               // ví dụ: RM000000

                        // Lấy object của item trong ngày, nếu có
                        let dayData = bom?.[day]?.[itemCode];
                        if (!dayData) {
                            frappe.msgprint("Không tìm thấy dữ liệu cho nguyên liệu này.");
                            return;
                        }

                        // Xác định danh sách work order tương ứng
                        let woList = [];
                        if (dataset.label === "Vượt định mức") {
                            woList = dayData.work_order || [];
                        } else {
                            woList = dayData.work_order_norm || [];
                        }

                        if (woList && woList.length > 0) {
                            frappe.set_route("List", "Work Order", {
                                name: ["in", woList]
                            });
                        } else {
                            frappe.msgprint("Không có Work Order nào trong danh sách này.");
                        }
                    }

                }
            });
        }
    };

    this.refresh_dashboard();
};