/**
 * Báo cáo đánh giá nhà cung cấp ("Supplier Evaluation Report")
 * 
 * Giao diện tương tự Downtime Report với:
 *  - Filter: view_type, from_date, to_date, supplier, item_category, ranking
 *  - 2 chế độ xem:
 *    + "Nhà cung cấp": 2 biểu đồ (Điểm đánh giá cột + Top chi phí ngang)
 *    + "Loại mặt hàng": 2 biểu đồ (% Đúng hạn cột + % Chất lượng ngang)
 */

frappe.query_reports["Supplier Evaluation Report"] = {
    _initialized: false,
    _isSettingFilterFromChart: false,
    
    "filters": [
        {
            "fieldname": "view_type",
            "label": "Chế độ xem",
            "fieldtype": "Select",
            "options": ["Nhà cung cấp", "Loại mặt hàng"],
            "default": "Nhà cung cấp",
            "on_change": function() {
                if (!frappe.query_reports["Supplier Evaluation Report"]._initialized) return;
                const report = frappe.query_report;
                const view_type = report.get_filter_value("view_type");
                
                // Clear các filter khác khi đổi view
                report.filters
                    .filter(f => !["from_date", "to_date", "view_type"].includes(f.df.fieldname))
                    .forEach(f => f.set_value(""));
                
                frappe.query_reports["Supplier Evaluation Report"].hide_all_charts();
                if (view_type === "Nhà cung cấp") {
                    frappe.query_reports["Supplier Evaluation Report"].show_supplier_charts();
                } else {
                    frappe.query_reports["Supplier Evaluation Report"].show_item_charts();
                }
            }
        },
        {
            "fieldname": "from_date",
            "label": "Từ ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.add_days(frappe.datetime.get_today(), -120),
            "on_change": function() {
                if (!frappe.query_reports["Supplier Evaluation Report"]._initialized) return;
                if (frappe.query_reports["Supplier Evaluation Report"]._isSettingFilterFromChart) return;
                frappe.query_report.refresh();
                setTimeout(() => {
                    frappe.query_reports["Supplier Evaluation Report"].refresh_charts();
                }, 200);
            }
        },
        {
            "fieldname": 'to_date',
            "label": "Đến ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.get_today(),
            "on_change": function() {
                if (!frappe.query_reports["Supplier Evaluation Report"]._initialized) return;
                if (frappe.query_reports["Supplier Evaluation Report"]._isSettingFilterFromChart) return;
                frappe.query_report.refresh();
                setTimeout(() => {
                    frappe.query_reports["Supplier Evaluation Report"].refresh_charts();
                }, 200);
            }
        },
        {
            fieldname: "supplier",
            label: "Nhà cung cấp",
            fieldtype: "Data",
            hidden: 1
        },
        {
            fieldname: "item_category",
            label: "Loại mặt hàng",
            fieldtype: "Data",
            hidden: 1
        },
        {
            fieldname: "ranking",
            label: "Xếp hạng",
            fieldtype: "Data",
            hidden: 1
        }
    ],

    formatter: function(value, row, column, data, default_formatter) {
        if(column.fieldname == "order_value" && value) {
            return `<strong>${frappe.format(value, {fieldtype: 'Currency'})}</strong>`;
        }
        if(['cost_ratio', 'on_time_percentage', 'quality_percentage'].includes(column.fieldname) && value) {
            return `${value.toFixed(2)}%`;
        }
        if(column.fieldname == "rating_score" && value) {
            return `${value.toFixed(2)}`;
        }
        return default_formatter(value, row, column, data);
    },

    refresh_charts: function() {
        const currentReport = frappe.query_report;
        if (currentReport && currentReport.report_name === "Supplier Evaluation Report") {
            const view_type = currentReport.get_filter_value("view_type");
            this.hide_all_charts();
            if (view_type === "Nhà cung cấp") {
                this.show_supplier_charts();
            } else {
                this.show_item_charts();
            }
        }
    },

    onload: function(report) {
        report.page.set_title("Báo cáo đánh giá nhà cung cấp");
        if (report.report_name !== "Supplier Evaluation Report") return;
        
        this.inject_responsive_styles();
        this.setup_title_observer(report);

        report.page.wrapper.find(".custom-actions.hidden-xs.hidden-md").css("display", "none");

        let title_el = report.page.wrapper.find(".page-head-content .title-text");
        title_el.css({
            "margin": "8px auto",
            "text-align": "center"
        });

        this._initialized = true;
    },

    inject_responsive_styles: function() {
        if (!document.getElementById('supplier-responsive-styles')) {
            const style = document.createElement('style');
            style.id = 'supplier-responsive-styles';
            style.innerHTML = `
                @media (max-width: 768px) {
                    .charts-container.d-flex {
                        flex-direction: column !important;
                        gap: 30px !important;
                    }
                    
                    .custom-chart-wrapper {
                        width: 100% !important;
                        margin-bottom: 20px;
                    }
                    
                    .custom-chart-wrapper > div:first-of-type {
                        flex-wrap: nowrap !important;
                        gap: 10px !important;
                    }
                    
                    #top-select-supplier,
                    #top-select-item {
                        flex-shrink: 0;
                        min-width: auto !important;
                        font-size: 12px;
                        padding: 4px 8px !important;
                    }
                    
                    .custom-chart-wrapper > div:first-of-type > div {
                        min-width: 0 !important;
                        flex: 1 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    hide_all_charts: function() {
        const chartIds = [
            'myCustomColumnChart_supplier',
            'myCustomBarChart_supplier',
            'myCustomColumnChart_item',
            'myCustomBarChart_item'
        ];
        
        chartIds.forEach(id => {
            let existing_chart = Chart.getChart(id);
            if (existing_chart) existing_chart.destroy();
        });
        
        $('.report-wrapper .charts-container').remove();
    },

    create_chart_container: function() {
        if (!$('.report-wrapper .charts-container').length) {
            const chartsContainer = $('<div class="charts-container d-flex" style="gap: 20px; margin-bottom: 20px;"></div>');
            $('.report-wrapper').prepend(chartsContainer);
        }
    },

    show_supplier_charts: function() {
        this.create_chart_container();
        if (typeof draw_supplier_rating_chart === 'function') {
            draw_supplier_rating_chart();
        }
        if (typeof draw_supplier_cost_chart === 'function') {
            draw_supplier_cost_chart();
        }
    },

    show_item_charts: function() {
        this.create_chart_container();
        if (typeof draw_item_ontime_chart === 'function') {
            draw_item_ontime_chart();
        }
        if (typeof draw_item_quality_chart === 'function') {
            draw_item_quality_chart();
        }
    },

    setup_title_observer: function(report) {
        const $reportBody = $(report.page.body);
        
        this.observer = new MutationObserver((mutations, obs) => {
            this.add_custom_title($reportBody);
            if ($reportBody.find(".supplier-report-title").length) {
                obs.disconnect();
            }
        });

        this.observer.observe(report.page.body.get(0), { childList: true, subtree: true });
    },
    
    add_custom_title: function($reportBody) {
        const $datatable = $reportBody.find(".datatable");
        if ($datatable.length && !$reportBody.find(".supplier-report-title").length) {
            $datatable.before('<h4 class="supplier-report-title" style="margin: 15px 0; font-weight: 600;">Chi tiết đánh giá:</h4>');
        }
    },

    after_datatable_render: function(datatable) {
        const view_type = frappe.query_report.get_filter_value("view_type");
        setTimeout(() => {
            if (view_type === "Nhà cung cấp") {
                this.show_supplier_charts();
            } else {
                this.show_item_charts();
            }
        }, 300);
    }
};



/// Biểu đồ cột: Điểm đánh giá nhà cung cấp
async function draw_supplier_rating_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let existing_chart = Chart.getChart("myCustomColumnChart_supplier");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-supplier-column').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Supplier Evaluation Report"].create_chart_container === 'function') {
            frappe.query_reports["Supplier Evaluation Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-supplier-column");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";
    
    chartsContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomColumnChart_supplier";   
    wrapper.appendChild(canvas);
   
    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};
    
    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.pms.report.supplier_evaluation_report.supplier_evaluation_report.supplier_rating_data",
            args: {filters: filters},
            callback: resolve,
            error: reject
        });
    });

    if (r.message && r.message.labels && r.message.labels.length > 0) {
        const chartData = r.message;
        const labels = chartData.labels;
        const values = chartData.values;
        const colors = chartData.colors;
        const ctx = canvas.getContext("2d");

        let chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: "x",
                responsive: true,
                onClick: async (event, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0];
                        const supplier = labels[chart.index];
                        const currentFilter = frappe.query_report.get_filter_value("supplier");
                       
                        if(currentFilter === supplier) {
                            frappe.query_report.set_filter_value("supplier", "");
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo nhà cung cấp",
                                indicator: "blue"
                            });
                        } else {
                            frappe.query_report.set_filter_value("supplier", supplier);
                            frappe.show_alert({
                                message: "Đã lọc theo: " + supplier,
                                indicator: "green"
                            });
                        }
                    }
                },
                plugins: {
                    legend: { display: false, position: "top" },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#3b3939ff',
                        font: { weight: 'bold' },
                        formatter: (value) => value.toFixed(2)
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        suggestedMax: Math.max(...values) * 1.2,
                        ticks: {
                            callback: function(value, index, ticks) {
                                return index === ticks.length - 1 ? '(Điểm)' : value.toLocaleString('en-US');
                            }
                        }
                    },
                    x: {
                        ticks: {
                            autoSkip: false, 
                            maxRotation: 45, 
                            minRotation: 0,
                        }
                    }
                }
            }
        });
       
        let titleDiv = document.createElement("div");
        titleDiv.style.textAlign = "center";
        titleDiv.style.fontSize = "16px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.color = "#333";
        titleDiv.style.marginBottom = "15px";
        titleDiv.innerText = "Điểm đánh giá nhà cung cấp";
        wrapper.insertBefore(titleDiv, wrapper.firstChild);

        let placeholderDiv = document.createElement("div");
        placeholderDiv.style.height = "85px";
        placeholderDiv.style.marginBottom = "0px";
        wrapper.insertBefore(placeholderDiv, canvas);
    }
}

// Biểu đồ ngang: Top chi phí theo nhà cung cấp
async function draw_supplier_cost_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let existing_chart = Chart.getChart("myCustomBarChart_supplier");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-supplier-horizontal').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Supplier Evaluation Report"].create_chart_container === 'function') {
            frappe.query_reports["Supplier Evaluation Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-supplier-horizontal");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";
    chartsContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomBarChart_supplier";
    wrapper.appendChild(canvas);

    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};

    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.pms.report.supplier_evaluation_report.supplier_evaluation_report.supplier_cost_data",
            args: {filters: filters},
            callback: resolve,
            error: reject
        });
    });
    
    if (r.message && r.message.labels && r.message.labels.length > 0) {
        const chartData = r.message;

        let combined = chartData.labels.map((label, i) => ({
            label: label,
            value: chartData.values[i],
        }));
        combined.sort((a, b) => b.value - a.value);

        const ctx = canvas.getContext("2d");

        let chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: chartData.colors,
                    borderColor: chartData.colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                onClick: async (event, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0];
                        const supplier = chartInstance.data.labels[chart.index];
                        const currentFilter = frappe.query_report.get_filter_value("supplier");
                        
                        if (currentFilter === supplier) {
                            frappe.query_report.set_filter_value("supplier", "");
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo nhà cung cấp",
                                indicator: "blue"
                            });
                        } else {
                            frappe.query_report.set_filter_value("supplier", supplier);
                            frappe.show_alert({
                                message: "Đã lọc theo: " + supplier,
                                indicator: "green"
                            });
                        }
                    }
                },
                plugins: {
                    legend: { display: false, position: "top" },
                    datalabels: {
                        anchor: 'end',   
                        align: 'right',  
                        color: '#3b3939ff',
                        font: { weight: 'bold' },
                        formatter: (value) => value.toFixed(2)
                    }
                },
                scales: { 
                    x: { 
                        beginAtZero: true, 
                        suggestedMax: Math.max(...chartData.values) * 1.2,
                        ticks: {
                            callback: function(value, index, ticks) {
                                return index === ticks.length - 1 ? '(Triệu VNĐ)' : value.toLocaleString('en-US');
                            }
                        }
                    } 
                }
            },
        });

        let titleDiv = document.createElement("div");
        titleDiv.style.textAlign = "center";
        titleDiv.style.fontSize = "16px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.color = "#333";
        titleDiv.style.marginBottom = "15px";
        titleDiv.innerText = "Top chi phí theo nhà cung cấp";
        wrapper.insertBefore(titleDiv, canvas);

        let controlsContainer = document.createElement("div");
        controlsContainer.style.display = "flex";
        controlsContainer.style.gap = "15px";
        controlsContainer.style.alignItems = "center";
        controlsContainer.style.marginBottom = "10px";

        let select = document.createElement("select");
        select.id = "top-select-supplier";
        select.style.padding = "6px 12px";
        select.style.borderRadius = "16px";
        select.style.border = "1px solid #000";
        select.style.background = "#fff";
        select.innerHTML = `
            <option value="1">--Top 1--</option>
            <option value="5" selected>--Top 5--</option>
            <option value="10">--Top 10--</option>
            <option value="15">--Top 15--</option>
            <option value="20">--Top 20--</option>
        `;
        controlsContainer.appendChild(select);

        let progressWrapper = document.createElement("div");
        progressWrapper.style.flex = "1";
        progressWrapper.style.minWidth = "200px";
        progressWrapper.style.height = "22px";
        progressWrapper.style.background = "#f0f0f0";
        progressWrapper.style.borderRadius = "20px";
        progressWrapper.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.15)";
        progressWrapper.style.overflow = "hidden";

        let progressBar = document.createElement("div");
        progressBar.style.height = "100%";
        progressBar.style.width = "0%";
        progressBar.style.background = "linear-gradient(90deg, #ff6b6b, #e84118)";
        progressBar.style.borderRadius = "20px";
        progressBar.style.display = "flex";
        progressBar.style.alignItems = "center";
        progressBar.style.justifyContent = "center";
        progressBar.style.color = "#fff";
        progressBar.style.fontWeight = "bold";
        progressBar.style.fontSize = "12px";
        progressBar.style.transition = "width 0.6s ease";

        progressWrapper.appendChild(progressBar);
        controlsContainer.appendChild(progressWrapper);
        wrapper.insertBefore(controlsContainer, canvas);

        let progressText = document.createElement("div");
        progressText.style.textAlign = "center";
        progressText.style.fontSize = "13px";
        progressText.style.color = "#333";
        progressText.style.fontWeight = "500";
        progressText.style.marginBottom = "15px";
        progressText.innerText = "Top N nhà cung cấp chiếm --% tổng chi phí";
        wrapper.insertBefore(progressText, canvas);

        function updateChart(topN) {
            const topData = combined.slice(0, topN);
            const labels = topData.map(item => item.label);
            const values = topData.map(item => item.value);
            
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = values;
            chartInstance.update();

            const total = combined.reduce((sum, item) => sum + item.value, 0);
            const topTotal = values.reduce((sum, v) => sum + v, 0);
            const percent = total > 0 ? ((topTotal / total) * 100).toFixed(2) : 0;

            progressBar.style.width = percent + "%";
            progressBar.innerText = percent + "%";

            progressText.innerText = `Top ${topN} nhà cung cấp chiếm ${percent}% tổng chi phí`;
        }

        updateChart(5);

        select.addEventListener("change", (e) => {
            let topN = parseInt(e.target.value, 10);
            updateChart(topN);
        });
    } 
}



// Biểu đồ cột: % Đúng hạn theo loại mặt hàng
async function draw_item_ontime_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let existing_chart = Chart.getChart("myCustomColumnChart_item");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-item-column').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Supplier Evaluation Report"].create_chart_container === 'function') {
            frappe.query_reports["Supplier Evaluation Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-item-column");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";
    
    chartsContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomColumnChart_item";   
    wrapper.appendChild(canvas);
   
    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};
    
    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.pms.report.supplier_evaluation_report.supplier_evaluation_report.item_ontime_data",
            args: {filters: filters},
            callback: resolve,
            error: reject
        });
    });

    if (r.message && r.message.labels && r.message.labels.length > 0) {
        const chartData = r.message;
        const labels = chartData.labels;
        const values = chartData.values;
        const colors = chartData.colors;
        const ctx = canvas.getContext("2d");

        let chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: "x",
                responsive: true,
                onClick: async (event, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0];
                        const item_category = labels[chart.index];
                        const currentFilter = frappe.query_report.get_filter_value("item_category");
                       
                        if(currentFilter === item_category) {
                            frappe.query_report.set_filter_value("item_category", "");
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo loại mặt hàng",
                                indicator: "blue"
                            });
                        } else {
                            frappe.query_report.set_filter_value("item_category", item_category);
                            frappe.show_alert({
                                message: "Đã lọc theo: " + item_category,
                                indicator: "green"
                            });
                        }
                    }
                },
                plugins: {
                    legend: { display: false, position: "top" },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#3b3939ff',
                        font: { weight: 'bold' },
                        formatter: (value) => value.toFixed(2) + '%'
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        suggestedMax: Math.max(...values) * 1.2,
                        ticks: {
                            callback: function(value, index, ticks) {
                                return index === ticks.length - 1 ? '(%)' : value.toLocaleString('en-US');
                            }
                        }
                    },
                    x: {
                        ticks: {
                            autoSkip: false, 
                            maxRotation: 45, 
                            minRotation: 0,
                        }
                    }
                }
            },
        });
       
        let titleDiv = document.createElement("div");
        titleDiv.style.textAlign = "center";
        titleDiv.style.fontSize = "16px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.color = "#333";
        titleDiv.style.marginBottom = "15px";
        titleDiv.innerText = "% Đúng hạn theo loại mặt hàng";
        wrapper.insertBefore(titleDiv, wrapper.firstChild);

        let placeholderDiv = document.createElement("div");
        placeholderDiv.style.height = "85px";
        placeholderDiv.style.marginBottom = "0px";
        wrapper.insertBefore(placeholderDiv, canvas);
    }
}

// Biểu đồ ngang: % Chất lượng theo loại mặt hàng
async function draw_item_quality_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let existing_chart = Chart.getChart("myCustomBarChart_item");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-item-horizontal').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Supplier Evaluation Report"].create_chart_container === 'function') {
            frappe.query_reports["Supplier Evaluation Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-item-horizontal");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";
    chartsContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomBarChart_item";
    wrapper.appendChild(canvas);

    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};

    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.pms.report.supplier_evaluation_report.supplier_evaluation_report.item_quality_data",
            args: {filters: filters},
            callback: resolve,
            error: reject
        });
    });
    
    if (r.message && r.message.labels && r.message.labels.length > 0) {
        const chartData = r.message;

        let combined = chartData.labels.map((label, i) => ({
            label: label,
            value: chartData.values[i],
        }));
        combined.sort((a, b) => b.value - a.value);

        const ctx = canvas.getContext("2d");

        let chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: chartData.colors,
                    borderColor: chartData.colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                onClick: async (event, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0];
                        const item_category = chartInstance.data.labels[chart.index];
                        const currentFilter = frappe.query_report.get_filter_value("item_category");
                        
                        if (currentFilter === item_category) {
                            frappe.query_report.set_filter_value("item_category", "");
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo loại mặt hàng",
                                indicator: "blue"
                            });
                        } else {
                            frappe.query_report.set_filter_value("item_category", item_category);
                            frappe.show_alert({
                                message: "Đã lọc theo: " + item_category,
                                indicator: "green"
                            });
                        }
                    }
                },
                plugins: {
                    legend: { display: false, position: "top" },
                    datalabels: {
                        anchor: 'end',   
                        align: 'right',  
                        color: '#3b3939ff',
                        font: { weight: 'bold' },
                        formatter: (value) => value.toFixed(2) + '%'
                    }
                },
                scales: { 
                    x: { 
                        beginAtZero: true, 
                        suggestedMax: Math.max(...chartData.values) * 1.2,
                        ticks: {
                            callback: function(value, index, ticks) {
                                return index === ticks.length - 1 ? '(%)' : value.toLocaleString('en-US');
                            }
                        }
                    } 
                }
            },
        });

        let titleDiv = document.createElement("div");
        titleDiv.style.textAlign = "center";
        titleDiv.style.fontSize = "16px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.color = "#333";
        titleDiv.style.marginBottom = "15px";
        titleDiv.innerText = "Top chất lượng theo loại mặt hàng";
        wrapper.insertBefore(titleDiv, canvas);

        let controlsContainer = document.createElement("div");
        controlsContainer.style.display = "flex";
        controlsContainer.style.gap = "15px";
        controlsContainer.style.alignItems = "center";
        controlsContainer.style.marginBottom = "10px";

        let select = document.createElement("select");
        select.id = "top-select-item";
        select.style.padding = "6px 12px";
        select.style.borderRadius = "16px";
        select.style.border = "1px solid #000";
        select.style.background = "#fff";
        select.innerHTML = `
            <option value="1">--Top 1--</option>
            <option value="3" selected>--Top 3--</option>
            <option value="5">--Top 5--</option>
            <option value="10">--Top 10--</option>
            <option value="15">--Top 15--</option>
        `;
        controlsContainer.appendChild(select);

        let progressWrapper = document.createElement("div");
        progressWrapper.style.flex = "1";
        progressWrapper.style.minWidth = "200px";
        progressWrapper.style.height = "22px";
        progressWrapper.style.background = "#f0f0f0";
        progressWrapper.style.borderRadius = "20px";
        progressWrapper.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.15)";
        progressWrapper.style.overflow = "hidden";

        let progressBar = document.createElement("div");
        progressBar.style.height = "100%";
        progressBar.style.width = "0%";
        progressBar.style.background = "linear-gradient(90deg, #4ecdc4, #44a08d)";
        progressBar.style.borderRadius = "20px";
        progressBar.style.display = "flex";
        progressBar.style.alignItems = "center";
        progressBar.style.justifyContent = "center";
        progressBar.style.color = "#fff";
        progressBar.style.fontWeight = "bold";
        progressBar.style.fontSize = "12px";
        progressBar.style.transition = "width 0.6s ease";

        progressWrapper.appendChild(progressBar);
        controlsContainer.appendChild(progressWrapper);
        wrapper.insertBefore(controlsContainer, canvas);

        let progressText = document.createElement("div");
        progressText.style.textAlign = "center";
        progressText.style.fontSize = "13px";
        progressText.style.color = "#333";
        progressText.style.fontWeight = "500";
        progressText.style.marginBottom = "15px";
        progressText.innerText = "Top N loại mặt hàng có chất lượng tốt nhất";
        wrapper.insertBefore(progressText, canvas);

        function updateChart(topN) {
            const topData = combined.slice(0, topN);
            const labels = topData.map(item => item.label);
            const values = topData.map(item => item.value);
            
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = values;
            chartInstance.update();

            const avgQuality = values.length > 0 ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2) : 0;

            progressBar.style.width = avgQuality + "%";
            progressBar.innerText = avgQuality + "%";

            progressText.innerText = `Top ${topN} loại mặt hàng có chất lượng trung bình ${avgQuality}%`;
        }

        updateChart(3);

        select.addEventListener("change", (e) => {
            let topN = parseInt(e.target.value, 10);
            updateChart(topN);
        });
    } 
}

