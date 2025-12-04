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

    page.set_title('Tổng quan sản xuất theo phân loại');
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
        default: frappe.datetime.month_start(frappe.datetime.get_today()),
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
            
            // Xóa tất cả BOM charts
            if (this.charts.bom) {
                if (Array.isArray(this.charts.bom)) {
                    this.charts.bom.forEach(chart => chart.destroy());
                } else {
                    this.charts.bom.destroy();
                }
                this.charts.bom = null;
            }

            return; // Ngưng không render tiếp
        }

        // Lấy đơn vị từ overall
        const mainUnit = response.overall?.main?.unit || "Tấn";
        const subUnit = response.overall?.sub?.unit || "Tấn";

        if (response.overall) {
            document.querySelector(`.category-title`).textContent = `Sản lượng các thành phẩm theo hệ`;
            document.querySelector(`.attribute-title`).textContent = `Sản lượng nhóm theo ${page.fields_dict.attribute.get_value()} so với theo kế hoạch`;
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
        
        // Xóa tất cả BOM charts
        if (this.charts.bom) {
            if (Array.isArray(this.charts.bom)) {
                this.charts.bom.forEach(chart => chart.destroy());
            } else {
                this.charts.bom.destroy();
            }
            this.charts.bom = null;
        }

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
            const cat = response.category_overall;
            const catLabels = Object.keys(cat); // các hệ
            const allItems = new Set();

            // gom tất cả item
            catLabels.forEach(catName => {
                Object.keys(cat[catName]).forEach(itemCode => {
                    allItems.add(itemCode);
                });
            });

            const itemKeys = Array.from(allItems);

            // Tạo dữ liệu mới: mỗi category-item là 1 row riêng
            const chartLabels = [];
            const chartData = [];
            const chartColors = [];
            const chartBorders = [];
            const workOrdersMap = [];
            const itemNamesMap = [];

            catLabels.forEach(catName => {
                const itemsInCat = Object.keys(cat[catName]);
                
                itemsInCat.forEach((itemKey, idx) => {
                    const colorIndex = itemKeys.indexOf(itemKey);
                    const itemData = cat[catName][itemKey];
                    
                    chartLabels.push(catName); // Chỉ lấy tên category
                    chartData.push(itemData?.qty || 0);
                    chartColors.push(modernColors[colorIndex % modernColors.length].bg);
                    chartBorders.push(modernColors[colorIndex % modernColors.length].border);
                    itemNamesMap.push(itemData?.item_name || itemKey);
                    workOrdersMap.push({
                        category: catName,
                        item: itemKey,
                        workOrders: itemData?.work_orders || []
                    });
                });
            });

            if (this.charts.category) {
                this.charts.category.destroy();
            }

            this.charts.category = new Chart(document.getElementById("chart-category"), {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Số lượng',
                        data: chartData,
                        backgroundColor: chartColors,
                        borderColor: chartBorders,
                        borderWidth: 2,
                    }]
                },
                options: {
                    indexAxis: 'y', // trục ngang
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false // ẩn legend
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const index = context[0].dataIndex;
                                    return itemNamesMap[index];
                                },
                                label: function(context) {
                                    const value = context.parsed.x || 0;
                                    return `Số lượng: ${value.toFixed(2)} ${mainUnit}`;
                                }
                            }
                        },
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: `Số lượng (${mainUnit})`
                            }
                        },
                        y: {
                            ticks: {
                                autoSkip: false,
                                callback: function(value, index) {
                                    const categoryName = chartLabels[index];
                                    const itemName = itemNamesMap[index];
                                    
                                    // Wrap text cho itemName
                                    const maxLength = 40;
                                    const lines = [categoryName]; // Dòng đầu: tên category
                                    
                                    if (itemName) {
                                        if (itemName.length > maxLength) {
                                            const words = itemName.split(' ');
                                            let currentLine = '';
                                            
                                            words.forEach(word => {
                                                if ((currentLine + word).length > maxLength) {
                                                    if (currentLine) lines.push('  ' + currentLine.trim());
                                                    currentLine = word + ' ';
                                                } else {
                                                    currentLine += word + ' ';
                                                }
                                            });
                                            if (currentLine) lines.push('  ' + currentLine.trim());
                                        } else {
                                            lines.push('  ' + itemName); // Thụt lề 2 space
                                        }
                                    }
                                    
                                    return lines;
                                },
                                font: {
                                    size: 14
                                }
                            }
                        }
                    },
                    onClick: (evt, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const workOrders = workOrdersMap[index].workOrders;
                            if (workOrders.length > 0) {
                                // const url = `/app/work-order?name=["in",${JSON.stringify(workOrders)}]`;
                                // window.open(url, '_blank');
                                frappe.custom_utils_detail_reason(workOrders)
                            }
                        }
                    }
                },
            });


            // Thêm event listener để click vào label trên trục Y
            const canvas = document.getElementById("chart-category");
            canvas.style.cursor = 'pointer';
            canvas.addEventListener('click', (evt) => {
                const chart = this.charts.category;
                const rect = canvas.getBoundingClientRect();
                const x = evt.clientX - rect.left;
                const y = evt.clientY - rect.top;
                
                // Kiểm tra xem click có nằm trong vùng trục Y không
                const yAxis = chart.scales.y;
                if (x < yAxis.right && x > yAxis.left && y > yAxis.top && y < yAxis.bottom) {
                    // Tìm index của label được click
                    const clickedIndex = Math.floor((y - yAxis.top) / (yAxis.height / chartLabels.length));
                    
                    if (clickedIndex >= 0 && clickedIndex < chartLabels.length) {
                        const workOrders = workOrdersMap[clickedIndex].workOrders;
                        if (workOrders.length > 0) {
                            const url = `/app/work-order?name=["in",${JSON.stringify(workOrders)}]`;
                            window.open(url, '_blank');
                        }
                    }
                }
            });
        }

        if (response.attribute_overall) {
            const categories = Object.keys(response.category_overall);
            const systemSelect = document.getElementById('attribute-system-select');
            
            // Render dropdown categories
            systemSelect.innerHTML = [
                `<option value="Tất cả" selected>Tất cả</option>`,
                ...categories.map(c => `<option value="${c}">${c}</option>`)
            ].join('');

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
                    let percent_raw = val.qty > 0 ? (val.produced_qty / val.qty * 100) : 0;
                    let percent = Math.min(percent_raw, 100);

                    return {
                        label: val.label || k,
                        data: [percent, 100 - percent],
                        qty: val.qty,
                        produced_qty: val.produced_qty,
                        percent_raw: percent_raw,
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
                        cutout: `${50 - i * 15}%`
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
                                        const percent_real = dataset.percent_raw.toFixed(1);
                                        const produced = dataset.produced_qty;
                                        const qty = dataset.qty;
                                        return `${label}: ${percent_real}% (${produced}/${qty} ${mainUnit})`;
                                    }
                                }
                            }
                        },
                    },
                    plugins: [{
                        id: 'doughnutLabel',
                        afterDatasetsDraw: function(chart) {
                            const ctx = chart.ctx;

                            // Hàm tự wrap text
                            function wrapText(context, text, x, y, maxWidth, lineHeight) {
                                const words = text.split(' ');
                                let line = '';
                                let lines = [];
                                for (let n = 0; n < words.length; n++) {
                                    const testLine = line + words[n] + ' ';
                                    const metrics = context.measureText(testLine);
                                    const testWidth = metrics.width;
                                    if (testWidth > maxWidth && n > 0) {
                                        lines.push(line.trim());
                                        line = words[n] + ' ';
                                    } else {
                                        line = testLine;
                                    }
                                }
                                lines.push(line.trim());
                                lines.forEach((l, i) => {
                                    context.fillText(l, x, y + i * lineHeight);
                                });
                            }

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
                                    ctx.font = '12px sans-serif';
                                    ctx.fillStyle = '#111';

                                    const percent_real = dataset.percent_raw.toFixed(1);
                                    const text = `${dataset.label} ${percent_real}% (${dataset.produced_qty}/${dataset.qty})`;

                                    // Vẽ text có tự xuống dòng nếu dài
                                    wrapText(ctx, text, centerX, centerY - 10, 190, 15);

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

            const ctx = document.getElementById("chart-manufacturing").getContext("2d");

            // Hàm chuyển màu RGBA về cùng tone nhưng alpha khác
            function adjustAlpha(color, alpha) {
                if (color.startsWith("rgba")) {
                    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${alpha})`);
                } else if (color.startsWith("rgb")) {
                    return color.replace(/rgb\(([^,]+),([^,]+),([^,]+)\)/, `rgba($1,$2,$3,${alpha})`);
                } else if (color.startsWith("#")) {
                    const hex = color.replace("#", "");
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    return `rgba(${r},${g},${b},${alpha})`;
                }
                return color;
            }

            // Cấu hình trục y
            let yAxisConfig = {
                y: {
                    stacked: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: `${response.overall.main.label} (${mainUnit})`
                    }
                }
            };

            if (page.fields_dict.sub_item.get_value()) {
                const gradient1 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient1.addColorStop(0, adjustAlpha(modernColors[4].bg, 0.4));
                gradient1.addColorStop(1, adjustAlpha(modernColors[4].bg, 0));

                const gradient2 = ctx.createLinearGradient(0, 0, 0, 400);
                gradient2.addColorStop(0, adjustAlpha(modernColors[5].bg, 0.4));
                gradient2.addColorStop(1, adjustAlpha(modernColors[5].bg, 0));

                datasets.push(
                    {
                        type: 'line',
                        label: `${response.overall.sub.label} chưa sản xuất`,
                        data: manuLabels.map(k => manu[k].sub.qty),
                        borderColor: modernColors[4].border,
                        backgroundColor: gradient1,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: modernColors[4].border,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y1'
                    },
                    {
                        type: 'line',
                        label: `${response.overall.sub.label} đã sản xuất`,
                        data: manuLabels.map(k => manu[k].sub.produced_qty),
                        borderColor: modernColors[5].border,
                        backgroundColor: gradient2,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: modernColors[5].border,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y1'
                    }
                );

                // Thêm trục y1 cho sub item
                yAxisConfig.y1 = {
                    position: 'right',
                    title: {
                        display: true,
                        text: `${response.overall.sub.label} (${subUnit})`
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    min: 0,
                };
            }

            // Luôn có main → vẽ bar
            datasets.push(
                {
                    type: 'bar',
                    label: `${response.overall.main.label} đã sản xuất`,
                    data: manuLabels.map(k => manu[k].main.produced_qty),
                    backgroundColor: modernColors[0].bg,
                    borderColor: modernColors[0].border,
                    borderWidth: 2,
                    stack: 'main',
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: `${response.overall.main.label} chưa sản xuất`,
                    data: manuLabels.map(k => manu[k].main.qty),
                    backgroundColor: modernColors[1].bg,
                    borderColor: modernColors[1].border,
                    borderWidth: 2,
                    stack: 'main',
                    yAxisID: 'y'
                }
            );

            this.charts.manufacturing = new Chart(ctx, {
                data: {
                    labels: manuLabels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: yAxisConfig,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    let value = context.parsed.y || 0;
                                    let unit = context.dataset.yAxisID === 'y1' ? subUnit : mainUnit;
                                    return `${label}: ${value.toFixed(2)} ${unit}`;
                                }
                            }
                        }
                    },
                    onClick: (evt, elements) => {
                        if (elements.length > 0) {
                            let chart = this.charts.manufacturing;
                            let elem = elements[0];
                            let day = chart.data.labels[elem.index];
                            let datasetLabel = chart.data.datasets[elem.datasetIndex].label;

                            let isMain = datasetLabel.includes(response.overall.main.label);
                            let isProduced = datasetLabel.includes("đã sản xuất");

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
                                frappe.custom_utils_detail_reason(wo_list)
                            } else {
                                frappe.msgprint("Không có LSX ca nào trong danh sách này.");
                            }
                        }
                    }
                }
            });
        }

        if (response.bom_overall) {
            let bom = response.bom_overall;
            let bomDates = Object.keys(bom).sort();
            let items = [...new Set(bomDates.flatMap(d => Object.keys(bom[d])))];
            const container = document.getElementById("charts-container");
            container.innerHTML = "";
            let producedColor = modernColors[1];

            items.forEach((item, i) => {
                let itemLabel = item;
                let itemUnit = "";
                for (let d of bomDates) {
                    if (bom[d][item]?.label) {
                        itemLabel = bom[d][item].label;
                        itemUnit = bom[d][item].unit || "";
                        break;
                    }
                }

                const chartDiv = document.createElement("div");
                chartDiv.className = "bom-chart-wrapper"; 
                chartDiv.style.height = "250px";
                const canvas = document.createElement("canvas");
                chartDiv.appendChild(canvas);
                container.appendChild(chartDiv);

                let qtyColor = modernColors[(i + 2) % modernColors.length];
                const datasets = [
                    {
                        label: itemLabel,
                        data: bomDates.map(d => bom[d][item]?.qty || 0),
                        backgroundColor: qtyColor.bg,
                        borderColor: qtyColor.border,
                        borderWidth: 2
                    },
                    {
                        label: "Vượt định mức",
                        data: bomDates.map(d => bom[d][item]?.produced_qty || 0),
                        backgroundColor: producedColor.bg,
                        borderColor: producedColor.border,
                        borderWidth: 2
                    }
                ];

                const chart = new Chart(canvas.getContext("2d"), {
                    type: 'bar',
                    data: { labels: bomDates, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: `Tiêu hao ${itemLabel} / 1 ${response.overall.main.unit} thành phẩm`,
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                },
                                padding: { top: 10, bottom: 20 }
                            },
                            legend: {
                                labels: {
                                    generateLabels: function(chart) {
                                        const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                        const seen = new Set();
                                        return original.filter(item => {
                                            if (seen.has(item.text)) return false;
                                            seen.add(item.text);
                                            return true;
                                        });
                                    }
                                },
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let value = context.formattedValue || 0;
                                        return `${context.dataset.label}: ${value} ${itemUnit}`;
                                    }
                                }
                            }
                        },
                        onHover: (event, elements) => {
                            event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                        },
                        onClick: (evt, elements) => {
                            if (elements.length > 0) {
                                const elem = elements[0];
                                const day = bomDates[elem.index];
                                const datasetLabel = datasets[elem.datasetIndex].label;
                                const isProduced = datasetLabel.includes("Vượt");

                                const dayData = bom[day]?.[item];
                                if (!dayData) {
                                    frappe.msgprint("Không tìm thấy dữ liệu cho ngày này.");
                                    return;
                                }

                                const wo_list = isProduced
                                    ? (dayData.work_order || [])
                                    : (dayData.work_order_norm || []);

                                if (wo_list.length > 0) {
                                    frappe.custom_utils_detail_reason(wo_list)
                                } else {
                                    frappe.msgprint("Không có LSX nào trong danh sách này.");
                                }
                            }
                        },
                        scales: {
                            x: { stacked: true },
                            y: { 
                                stacked: true,
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: `Số lượng (${itemUnit})`
                                }
                            }
                        }
                    }
                });
            });
        }
        
    };

    this.refresh_dashboard();
};