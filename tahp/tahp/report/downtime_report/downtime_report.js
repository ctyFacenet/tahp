/**
 * Báo cáo dừng máy ("Downtime Report") .
 * 
 * Đây là cấu hình cho query report bao gồm:
 *  - Các filter: from_date, to_date, reason_group, reason_detail, category, machine_group, equipment_name
 *  - Các hàm callback khi filter thay đổi (on_change)
 *  - onload: hàm setup giao diện khi báo cáo được load
 *  - load_manufacturing_categories: load danh sách Category từ DB và cập nhật filter
 *  - setup_select_events: setup sự kiện cho dropdown chọn "Theo thiết bị" hoặc "Theo nguyên nhân"
 *  - hide_all_charts, show_reason_charts, show_device_charts: quản lý hiển thị chart
 *  - setup_title_observer, add_custom_title: thêm tiêu đề tuỳ chỉnh cho báo cáo
 * 
 * Charts:
 *  - draw_column_chart / draw_horizontal_chart: biểu đồ theo thiết bị
 *  - draw_column_chart1 / draw_horizontal_chart1: biểu đồ theo nguyên nhân
 * 
 * Các tính năng bổ sung:
 *  - Dropdown Top N trên chart
 *  - Progress bar hiển thị % thời gian downtime
 *  - Xử lý click vào chart để set filter động
 *  - Refresh dữ liệu khi filter thay đổi
 * 
 * Lưu ý:
 *  - Sử dụng Chart.js với plugin ChartDataLabels
 *  - on_change filter có delay 200ms để đảm bảo DOM đã cập nhật
 *  - Dữ liệu gọi qua frappe.call API với method tương ứng
 */

frappe.query_reports["Downtime Report"] = {
    _initialized: false,
    _isSettingFilterFromChart: false,
    
    "filters": [
        {
            "fieldname": "view_type",
            "label": "Chế độ xem",
            "fieldtype": "Select",
            "options": ["Theo nguyên nhân", "Theo thiết bị"],
            "default": "Theo nguyên nhân",
            "on_change": function() {
                if (!frappe.query_reports["Downtime Report"]._initialized) return;
                const report = frappe.query_report;
                const view_type = report.get_filter_value("view_type");
                
                report.filters
                    .filter(f => !["from_date", "to_date", "view_type"].includes(f.df.fieldname))
                    .forEach(f => f.set_value(""));
                
                let category = report.get_filter("category");
                if (category) {
                    category.toggle(view_type === "Theo thiết bị");
                }
                
                frappe.query_reports["Downtime Report"].hide_all_charts();
                if (view_type === "Theo thiết bị") {
                    frappe.query_reports["Downtime Report"].show_device_charts();
                } else {
                    frappe.query_reports["Downtime Report"].show_reason_charts();
                }
            }
        },
        {
            "fieldname": "from_date",
            "label": "Từ ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.add_days(frappe.datetime.get_today(), -7),
            "on_change": function() {
                if (!frappe.query_reports["Downtime Report"]._initialized) return;
                if (frappe.query_reports["Downtime Report"]._isSettingFilterFromChart) return;
                frappe.query_report.refresh();
                setTimeout(() => {
                    frappe.query_reports["Downtime Report"].refresh_charts();
                }, 200);
            }
        },
        {
            "fieldname": 'to_date',
            "label": "Đến ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.get_today(),
            "on_change": function() {
                if (!frappe.query_reports["Downtime Report"]._initialized) return;
                if (frappe.query_reports["Downtime Report"]._isSettingFilterFromChart) return;
                frappe.query_report.refresh();
                setTimeout(() => {
                    frappe.query_reports["Downtime Report"].refresh_charts();
                }, 200);
            }
        },
        {
            fieldname: "reason_group",
            label: "Nhóm nguyên nhân",
            fieldtype: "Data",
            hidden: 1
        },
        {
            fieldname: "reason_detail",
            label: "Nguyên nhân",
            fieldtype: "Data",
            hidden: 1
        },
        {
            fieldname: "category",
            label: "Hệ",
            fieldtype: "Select",
            options: [],
            hidden: 1,
            on_change: function() {
                frappe.query_report.refresh();
            }
        },
        {
            fieldname: "machine_group",
            label: "Cụm máy",
            fieldtype: "Data",
            hidden: 1
        },
        {
            fieldname: "equipment_name",
            label: "Máy dừng",
            fieldtype: "Data",
            hidden: 1
        }
    ],

    refresh_charts: function() {
        const currentReport = frappe.query_report;
        if (currentReport && currentReport.report_name === "Downtime Report") {
            const view_type = currentReport.get_filter_value("view_type");
            this.hide_all_charts();
            if (view_type === "Theo thiết bị") {
                this.show_device_charts();
            } else {
                this.show_reason_charts();
            }
        }
    },

    onload: function(report) {
        report.page.set_title("Báo cáo dừng máy");
        if (report.report_name !== "Downtime Report") return;
        
        this.inject_responsive_styles();
        this.setup_title_observer(report);
        this.load_manufacturing_categories(report);

        // report.page.wrapper.find(".standard-actions").css("display", "none");
        report.page.wrapper.find(".custom-actions.hidden-xs.hidden-md").css("display", "none");

        let title_el = report.page.wrapper.find(".page-head-content .title-text");
        title_el.css({
            "margin": "8px auto",
            "text-align": "center"
        });

        setTimeout(() => {
            let category = report.get_filter("category");
            if (category) category.toggle(false);
        }, 100);

        
        this._initialized = true;
       
        
    },

    inject_responsive_styles: function() {
        if (!document.getElementById('downtime-responsive-styles')) {
            const style = document.createElement('style');
            style.id = 'downtime-responsive-styles';
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
                    
                    #top-select-device,
                    #top-select-reason {
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

    load_manufacturing_categories: function(report) {
        frappe.db.get_list('Manufacturing Category', {
            fields: ['name'],
            limit: 0,
            order_by: 'name asc'
        }).then(records => {
            if (records && records.length > 0) {
                const manufacturing_filter = report.get_filter("category");
                if (manufacturing_filter) {
                    const options = [''].concat(records.map(r => r.name));
                    manufacturing_filter.df.options = options;
                    manufacturing_filter.refresh();
                }
            }
        })
    },
    hide_all_charts: function() {
        const chartIds = [
            'myCustomColumnChart_device',
            'myCustomBarChart_device',
            'myCustomColumnChart_reason',
            'myCustomBarChart_reason'
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

    show_reason_charts: function() {
        this.create_chart_container();
        if (typeof draw_column_chart1 === 'function') {
            draw_column_chart1();
        }
        if (typeof draw_horizontal_chart1 === 'function') {
            draw_horizontal_chart1();
        }
    },

    show_device_charts: function() {
        this.create_chart_container();
        if (typeof draw_column_chart === 'function') {
            draw_column_chart();
        }
        if (typeof draw_horizontal_chart === 'function') {
            draw_horizontal_chart();
        }
    },
    
    setup_title_observer: function(report) {
        const $reportBody = $(report.page.body);
        
        this.observer = new MutationObserver((mutations, obs) => {
            this.add_custom_title($reportBody);
            if ($reportBody.find(".downtime-report-title").length) {
                obs.disconnect();
            }
        });

        this.observer.observe(report.page.body.get(0), { childList: true, subtree: true });
    },
    
    add_custom_title: function($reportBody) {
        const $datatable = $reportBody.find(".datatable");
        if ($datatable.length && !$reportBody.find(".downtime-report-title").length) {
            $datatable.before('<h4 class="downtime-report-title" style="margin: 15px 0; font-weight: 600;">Chi tiết theo thiết bị:</h4>');
        }
    },
    after_datatable_render: function(datatable) {
       
        const view_type = frappe.query_report.get_filter_value("view_type");
        setTimeout(() => {
            if (view_type === "Theo thiết bị") {
                this.show_device_charts();
            } else {
                this.show_reason_charts();
            }
        }, 300);
    }

};

//Theo thiết bị
async function draw_column_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let existing_chart = Chart.getChart("myCustomColumnChart_device");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-device-column').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Downtime Report"].create_chart_container === 'function') {
            frappe.query_reports["Downtime Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-device-column");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";
    
    chartsContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomColumnChart_device";   

    wrapper.appendChild(canvas);
   
    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};
    // Gọi API
    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.tahp.report.downtime_report.downtime_report.downtime_machine_group_data",
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
                indexAxis: "x", // biểu đồ cột (dọc)
                responsive: true,
                onClick: async (event, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0];
                        const machine = labels[chart.index]; 
                        const currentFilter_mc = frappe.query_report.get_filter_value("machine_group");
                       
                       
                        if(currentFilter_mc === machine) {  
                            
                            frappe.query_report.set_filter_value("machine_group", "");
                            
                            
                            
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo cụm máy" ,
                                indicator: "blue"
                            });
                        }
                        else {
                            frappe.query_report.set_filter_value("machine_group", machine);
                            
                            frappe.show_alert({
                                message: "Đã lọc theo: " + machine,
                                indicator: "green"
                            })
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
                                return index === ticks.length - 1 ? '(Giờ)' : value.toLocaleString('en-US');
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
        titleDiv.innerText = "Downtime theo Cụm máy";
        wrapper.insertBefore(titleDiv, wrapper.firstChild);

        let placeholderDiv = document.createElement("div");
        placeholderDiv.style.height = "85px";
        placeholderDiv.style.marginBottom = "0px";
        wrapper.insertBefore(placeholderDiv, canvas);
    }
    
}

async function draw_horizontal_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

   
    let existing_chart = Chart.getChart("myCustomBarChart_device");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-device-horizontal').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Downtime Report"].create_chart_container === 'function') {
            frappe.query_reports["Downtime Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-device-horizontal");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";

    chartsContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomBarChart_device";

    
    
    wrapper.appendChild(canvas);

    
    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};

    // call api
    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.tahp.report.downtime_report.downtime_report.downtime_equipment_name_data",
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
                        const equipmentName = chartInstance.data.labels[chart.index];
                        const currentFilter_name = frappe.query_report.get_filter_value("equipment_name");
                        
                        if (currentFilter_name === equipmentName) {  
                            // Xóa filter
                            frappe.query_report.set_filter_value("equipment_name", "");
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo máy",
                                indicator: "blue"
                            });
                        } else {
                            // Set filter 
                            frappe.query_report.set_filter_value("equipment_name", equipmentName);
                            
                            frappe.show_alert({
                                message: "Đã lọc theo: " + equipmentName,
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
                                return index === ticks.length - 1 ? '(Giờ)' : value.toLocaleString('en-US');
                            }
                        }
                    } 
                }
            },
            
        });

        //dropdown chọn top
        let titleDiv = document.createElement("div");
        titleDiv.style.textAlign = "center";
        titleDiv.style.fontSize = "16px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.color = "#333";
        titleDiv.style.marginBottom = "15px";
        titleDiv.innerText = "Top máy dừng nhiều nhất";
        wrapper.insertBefore(titleDiv, canvas);

        // 2. Container cho controls
        let controlsContainer = document.createElement("div");
        controlsContainer.style.display = "flex";
        controlsContainer.style.gap = "15px";
        controlsContainer.style.alignItems = "center";
        controlsContainer.style.marginBottom = "10px";
        // controlsContainer.style.flexWrap = "wrap";

        let select = document.createElement("select");
        select.id = "top-select-device";
        select.style.padding = "6px 12px";
        select.style.borderRadius = "16px";
        select.style.border = "1px solid #000";
        select.style.background = "#fff";
        select.innerHTML = `
            <option value="1">--Top 1--</option>
            <option value="5">--Top 5--</option>
            <option value="10" selected>--Top 10--</option>
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

        // 3. Text mô tả
        let progressText = document.createElement("div");
        progressText.style.textAlign = "center";
        progressText.style.fontSize = "13px";
        progressText.style.color = "#333";
        progressText.style.fontWeight = "500";
        progressText.style.marginBottom = "15px";
        progressText.innerText = "Top N máy dừng chiếm --% toàn bộ số giờ downtime";
        wrapper.insertBefore(progressText, canvas);

        // update chart theo topN
        function updateChart(topN) {
            const topData = combined.slice(0, topN);
            const labels = topData.map(item => item.label);
            const values = topData.map(item => item.value);
            
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = values;
            chartInstance.update();

            // % chiếm
            const total = combined.reduce((sum, item) => sum + item.value, 0);
            const topTotal = values.reduce((sum, v) => sum + v, 0);
            const percent = total > 0 ? ((topTotal / total) * 100).toFixed(2) : 0;

            // update progress bar
            progressBar.style.width = percent + "%";
            progressBar.innerText = percent + "%";

            // update text mô tả
            progressText.innerText = `Top ${topN} máy dừng chiếm ${percent}% tổng thời gian downtime`;
        }

        // Khởi tạo chart với top 10
        updateChart(10);

        // Event listener cho dropdown
        select.addEventListener("change", (e) => {
            let topN = parseInt(e.target.value, 10);
            updateChart(topN);
        });

    } 
        
   
}

// theo nguyên nhân
async function draw_column_chart1() {
   
    await new Promise(resolve => setTimeout(resolve, 200));

    let existing_chart = Chart.getChart("myCustomColumnChart_reason");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-reason-column').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Downtime Report"].create_chart_container === 'function') {
            frappe.query_reports["Downtime Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-reason-column");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";
    
    chartsContainer.appendChild(wrapper);
    

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomColumnChart_reason";   
    wrapper.appendChild(canvas);

    
    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};
    // Gọi API
    
    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.tahp.report.downtime_report.downtime_report.downtime_reason_group_data",
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
                    // label: "Tổng giờ downtime",
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: "x", // biểu đồ cột (dọc)
                responsive: true,
                onClick: async (event, elements) => {
                    if (elements.length > 0) {
                        const chart = elements[0];
                        const reason = labels[chart.index]; 
                        const currentFilter = frappe.query_report.get_filter_value("reason_group");
                       
                        if(currentFilter === reason) {  
                           
                            frappe.query_report.set_filter_value("reason_group", "");
                            
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo nhóm nguyên nhân" ,
                                indicator: "blue"
                            });
                        }
                        else {
                            frappe.query_report.set_filter_value("reason_group", reason);
                            
                            frappe.show_alert({
                                message: "Đã lọc theo: " + reason,
                                indicator: "green"
                            })
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
                                return index === ticks.length - 1 ? '(Giờ)' : value.toLocaleString('en-US');
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
        titleDiv.innerText = "Thời gian downtime theo nhóm nguyên nhân";
        wrapper.insertBefore(titleDiv, wrapper.firstChild);  
      
        let placeholderDiv = document.createElement("div");
        placeholderDiv.style.height = "85px";
        placeholderDiv.style.marginBottom = "0px";
        wrapper.insertBefore(placeholderDiv, canvas);  
    }
    
}

async function draw_horizontal_chart1() {
   
    await new Promise(resolve => setTimeout(resolve, 200));

   
    let existing_chart = Chart.getChart("myCustomBarChart_reason");
    if (existing_chart) existing_chart.destroy();
    $('.report-wrapper .chart-container-reason-horizontal').remove();

    let chartsContainer = document.querySelector(".report-wrapper .charts-container");
    if (!chartsContainer) {
        if (typeof frappe.query_reports["Downtime Report"].create_chart_container === 'function') {
            frappe.query_reports["Downtime Report"].create_chart_container();
            chartsContainer = document.querySelector(".report-wrapper .charts-container");
        }
        if (!chartsContainer) return;
    }

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper", "chart-container-reason-horizontal");
    wrapper.style.width = "100%";
    wrapper.style.flex = "1";

    chartsContainer.appendChild(wrapper);
    
    let canvas = document.createElement("canvas");
    canvas.id = "myCustomBarChart_reason";
    wrapper.appendChild(canvas);

   
    const filters = frappe.query_report ? frappe.query_report.get_filter_values() : {};
    // call api
    const r = await new Promise((resolve, reject) => {
        frappe.call({
            method: "tahp.tahp.report.downtime_report.downtime_report.downtime_reason_detail_data",
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
                        const reasonDetail = chartInstance.data.labels[chart.index];
                        const currentFilter_dt = frappe.query_report.get_filter_value("reason_detail");
                       
                      
                        if (currentFilter_dt === reasonDetail) {  
                            
                            frappe.query_report.set_filter_value("reason_detail", "");
                            
                            frappe.show_alert({
                                message: "Đã xóa bộ lọc theo nguyên nhân",
                                indicator: "blue"
                            });
                        } else {
                            
                            frappe.query_report.set_filter_value("reason_detail", reasonDetail);
                            
                                frappe.show_alert({
                                message: "Đã lọc theo: " + reasonDetail,
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
                                return index === ticks.length - 1 ? '(Giờ)' : value.toLocaleString('en-US');
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
        titleDiv.innerText = "Top nguyên nhân downtime";
        wrapper.insertBefore(titleDiv, canvas);

        // 2. Container cho controls
        let controlsContainer = document.createElement("div");
        controlsContainer.style.display = "flex";
        controlsContainer.style.gap = "15px";
        controlsContainer.style.alignItems = "center";
        controlsContainer.style.marginBottom = "10px";
        // controlsContainer.style.flexWrap = "wrap";

        let select = document.createElement("select");
        select.id = "top-select-device";
        select.style.padding = "6px 12px";
        select.style.borderRadius = "16px";
        select.style.border = "1px solid #000";
        select.style.background = "#fff";
        select.innerHTML = `
            <option value="1">--Top 1--</option>
            <option value="5">--Top 5--</option>
            <option value="10" selected>--Top 10--</option>
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

        // 3. Text mô tả
        let progressText = document.createElement("div");
        progressText.style.textAlign = "center";
        progressText.style.fontSize = "13px";
        progressText.style.color = "#333";
        progressText.style.fontWeight = "500";
        progressText.style.marginBottom = "15px";
        progressText.innerText = "Top N nguyên nhân chiếm --% toàn bộ nguyên nhân dừng máy";
        wrapper.insertBefore(progressText, canvas);
        // update chart theo topN
        function updateChart(topN) {
            const topData = combined.slice(0, topN);
            const labels = topData.map(item => item.label);
            const values = topData.map(item => item.value);
            
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = values;
            chartInstance.update();

            // % chiếm
            const total = combined.reduce((sum, item) => sum + item.value, 0);
            const topTotal = values.reduce((sum, v) => sum + v, 0);
            const percent = total > 0 ? ((topTotal / total) * 100).toFixed(2) : 0;

            // update progress bar
            progressBar.style.width = percent + "%";
            progressBar.innerText = percent + "%";

            // update text mô tả
            progressText.innerText = `Top ${topN} nguyên nhân chiếm ${percent}% toàn bộ nguyên nhân dừng máy`;
        }

        
        updateChart(10);

        
        select.addEventListener("change", (e) => {
            let topN = parseInt(e.target.value, 10);
            updateChart(topN);
        });

        
    }
    
}