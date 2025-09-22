frappe.query_reports["Downtime Report"] = {
    _initialized: false,
    "filters": [
        
        {
            "fieldname": "from_date",
            "label": "Từ ngày",
            "fieldtype": "Date",
            "default": frappe.datetime.add_days(frappe.datetime.get_today(), -7), // mặc định 7 ngày trước
            "on_change": function() {
                if (!frappe.query_reports["Downtime Report"]._initialized) return;
                
                 
                frappe.query_report.refresh();
                // Delay một chút để đảm bảo filter đã được cập nhật
                setTimeout(() => {
                    const currentReport = frappe.query_report;
                    if (currentReport && currentReport.report_name === "Downtime Report") {
                        // Lấy giá trị select hiện tại
                        const selectEl = document.querySelector('#report-view-select');
                        if (selectEl) {
                            // Ẩn tất cả chart cũ
                            frappe.query_reports["Downtime Report"].hide_all_charts();
                            
                            // Vẽ lại chart theo mode hiện tại
                            if (selectEl.value === "device") {
                                frappe.query_reports["Downtime Report"].show_device_charts();
                            } else {
                                frappe.query_reports["Downtime Report"].show_reason_charts();
                            }
                        }
                    }
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
                
                
                frappe.query_report.refresh();
                
                setTimeout(() => {
                    const currentReport = frappe.query_report;
                    if (currentReport && currentReport.report_name === "Downtime Report") {
                        // Lấy giá trị select hiện tại
                        const selectEl = document.querySelector('#report-view-select');
                        if (selectEl) {
                            // Ẩn tất cả chart cũ
                            frappe.query_reports["Downtime Report"].hide_all_charts();
                            
                            // Vẽ lại chart theo mode hiện tại
                            if (selectEl.value === "device") {
                                frappe.query_reports["Downtime Report"].show_device_charts();
                            } else {
                                frappe.query_reports["Downtime Report"].show_reason_charts();
                            }
                        }
                    }
                }, 200);
            }
           

        },
        {
            fieldname: "reason_group",
            label: "Nhóm nguyên nhân",
            fieldtype: "Data"
        },
        {
            fieldname: "reason_detail",
            label: "Nguyên nhân",
            fieldtype: "Data"
        },
        {
            fieldname: "category",
            label: "Hệ",
            fieldtype: "Select",
            options: [],
            on_change: function() {
                
                frappe.query_report.refresh();
            }
            
        },
        {
            fieldname: "machine_group",
            label: "Cụm máy",
            fieldtype: "Data"
        },
        {
            fieldname: "equipment_name",
            label: "Máy dừng",
            fieldtype: "Data"
        },
        
       
    ],
    

    
    
    onload: function(report) {
        report.page.set_title("Báo cáo dừng máy")
        // Kiểm tra chắc chắn đây là Downtime Report
        if (report.report_name !== "Downtime Report") return;
        
        this.setup_title_observer(report);
        this.load_manufacturing_categories(report);
       

        // Ẩn 2 nút Action với ...
        report.page.wrapper.find(".standard-actions").css("display", "none");
        report.page.wrapper.find(".custom-actions.hidden-xs.hidden-md").css("display", "none");


        $(".page-wrapper").css({
            "margin-top": "50px"
        });

       
        let title_el = report.page.wrapper.find(".page-head-content .title-text");

        title_el.css({
            
                "margin": "8px auto",   
                "text-align": "center",
                
        });


        if (!report.page.wrapper.find(".select-wrapper").length) {
            title_el.append(`
                <div class="select-wrapper" style="margin-top:30px; display:flex; justify-content:center; font-size:15px; font-weight:normal; width:100%;">
                    
                    <select id="report-view-select" style="padding:5px 10px; border-radius:6px; border:1px solid #ccc;">
                        <option value="reason" selected>Theo nguyên nhân</option>
                        <option value="device">Theo thiết bị</option>
                    </select>
                </div>
            `);

            this.setup_select_events(report);
        }
        
        
        
        
        setTimeout(() => {
            this.show_reason_charts();
            // Đánh dấu là đã khởi tạo xong
            this._initialized = true;
            // this.setup_select_events(report);
        }, 100);
        
        
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
                   
                    const options = records.map(r => r.name);
                    
                    manufacturing_filter.df.options = options;
                    
                    // Refresh filter để hiển thị options mới
                    manufacturing_filter.refresh();
                }
            }
        }).catch(err => {
            console.error('Error loading Manufacturing Categories:', err);
        });
    },
    setup_select_events: function(report) {
        const selectEl = document.querySelector('#report-view-select');
        if (selectEl) {
            selectEl.addEventListener('change', () => {
                this.hide_all_charts();
                // Giữ lại 2 filter from_date va to_date
                report.filters
                    .filter(f => !["from_date", "to_date"].includes(f.df.fieldname))
                    .forEach(f => f.set_value(""));

                // Lấy các filter cần ẩn/hiện
                let reason_group = report.get_filter("reason_group");
                let reason_detail = report.get_filter("reason_detail");
                let category = report.get_filter("category");
                let machine_group = report.get_filter("machine_group");
                let equipment_name = report.get_filter("equipment_name");

                

                if (selectEl.value === "reason") {
                    this.show_reason_charts();
                    reason_group.toggle(true);
                    reason_detail.toggle(true);
                    category.toggle(false);
                    machine_group.toggle(false);
                    equipment_name.toggle(false);
                } else if (selectEl.value === "device") {
                    this.show_device_charts();
                    reason_group.toggle(false);
                    reason_detail.toggle(false);
                    category.toggle(true);
                    machine_group.toggle(true);
                    equipment_name.toggle(true);

                }
            });

            // Khi load lần đầu, set filter theo default (reason)
            setTimeout(() => {
                let reason_group = report.get_filter("reason_group");
                let reason_detail = report.get_filter("reason_detail");
                let machine_group = report.get_filter("machine_group");
                let equipment_name = report.get_filter("equipment_name");
                let category = report.get_filter("category");


                reason_group.toggle(true);
                reason_detail.toggle(true);
                category.toggle(false);
                machine_group.toggle(false);
                equipment_name.toggle(false);
            }, 100);
        }
    },

    hide_all_charts: function() {
        document.querySelectorAll('.custom-chart-wrapper').forEach(wrapper => {
            wrapper.style.display = 'none';
        });
    },

    show_reason_charts: function() {

            draw_column_chart1();
            draw_horizontal_chart1();
        
    },

    show_device_charts: function() {
        
            draw_column_chart();
            draw_horizontal_chart();
        
    },
    setup_title_observer: function(report) {
        const $reportBody = $(report.page.body);
        
        this.observer = new MutationObserver(() => {
            this.add_custom_title($reportBody);
        });
        
        this.observer.observe(report.page.body.get(0), { childList: true });
    },
    
    add_custom_title: function($reportBody) {
       
         const $datatable = $reportBody.find(".datatable");
        
        if ($datatable.length && !$reportBody.find(".downtime-report-title").length) {
            $datatable.before('<h4 class="downtime-report-title" style="margin: 15px 0; font-weight: 600;">Chi tiết theo thiết bị:</h4>');
        }
    }
};


async function draw_column_chart() {
    
    await new Promise(resolve => setTimeout(resolve, 200));

  
    let reportWrapper = document.querySelector(".form-message");
    if (!reportWrapper) {
        console.warn("Không tìm thấy .form-message");
        return;
    }

    
    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper");
    wrapper.style.width = "100%";
    wrapper.style.height = "400px";
    
    
    reportWrapper.appendChild(wrapper);

    
    let canvas = document.createElement("canvas");
    canvas.id = "myCustomColumnChart_device";   
    wrapper.appendChild(canvas);

    try {
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
            Chart.register(ChartDataLabels);

            new Chart(ctx, {
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
                            const machine = labels[chart.index]; 
                            const currentFilter_mc = frappe.query_report.get_filter_value("machine_group");
                            const dataset = event.chart.data.datasets[0];
                            // console.log("Click vào:", reason);

                            try {
                                if(currentFilter_mc === machine) {  
                                    // frappe.query_report.set_filter_value("reason_group", "");
                                    frappe.query_report.set_filter_value("machine_group", "");
                                    frappe.query_report.refresh();
                                    // selectedReason = null;
                                    
                                   
                                    frappe.show_alert({
                                        message: "Đã xóa bộ lọc theo cụm máy" ,
                                        indicator: "blue"
                                    });
                                }
                                else {
                                    frappe.query_report.set_filter_value("machine_group", machine);
                                    frappe.query_report.refresh();
                                    // selectedReason = reason;
                                    

                                    frappe.show_alert({
                                        message: "Đã lọc theo: " + machine,
                                        indicator: "green"
                                    })
                                }
                                
                                
                                
                                
                                
                            } catch (err) {
                                // console.error("Lỗi khi set filter:", err);
                                
                                
                                setTimeout(() => {
                                    frappe.query_report.refresh();
                                }, 100);
                            }
                        }
                    },

                    plugins: {
                        legend: { display: false, position: "top" },
                        title: { 
                            display: true,
                            text: "Downtime theo Cụm máy",
                            padding: {
                                    top: 10,
                                    bottom: 60
                                },
                                font: {
                                    size: 16,   
                                    weight: 'bold'  
                                },
                                color: '#333',
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            color: '#3b3939ff',
                            font: { weight: 'bold' },
                            formatter: (value) => value.toFixed(2)
                        }
                    },
                    scales: { y: { beginAtZero: true, suggestedMax: Math.max(...values) * 1.1 } }
                },
                plugins: [ChartDataLabels]
            });
        }
    } catch (err) {
        console.error("Lỗi khi gọi API:", err);
    }
}

async function draw_horizontal_chart() {
    await new Promise(resolve => setTimeout(resolve, 200));

    let chartContainer = document.querySelector(".form-message");
    if (!chartContainer) {
        console.warn("Không tìm thấy div.form-message");
        return;
    }
    chartContainer.classList.add("d-flex");
    chartContainer.style.gap = "20px";
    

    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper");
    wrapper.style.width = "100%";
    wrapper.style.height = "400px";

   

    chartContainer.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomBarChart_device";
    wrapper.appendChild(canvas);

    try {
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
            Chart.register(ChartDataLabels);

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

                            try {
                                if (currentFilter_name === equipmentName) {  
                                    // Xóa filter
                                    frappe.query_report.set_filter_value("equipment_name", "");
                                    frappe.query_report.refresh();
                                    
                                    frappe.show_alert({
                                        message: "Đã xóa bộ lọc theo máy",
                                        indicator: "blue"
                                    });
                                } else {
                                    // Set filter 
                                    frappe.query_report.set_filter_value("equipment_name", equipmentName);
                                    frappe.query_report.refresh();
                                    
                                    frappe.show_alert({
                                        message: "Đã lọc theo: " + equipmentName,
                                        indicator: "green"
                                    });
                                }
                            } catch (err) {
                                setTimeout(() => {
                                    frappe.query_report.refresh();
                                }, 100);
                            }
                        }
                    },

                    plugins: {
                        legend: { display: false, position: "top" },
                        title: { 
                            display: true,
                            text: "Top máy dừng nhiều nhất",
                            padding: {
                                top: 10,
                                bottom: 60
                            },
                            font: {
                                size: 16,   
                                weight: 'bold'  
                            },
                            color: '#333',
                        },
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
                            suggestedMax: Math.max(...chartData.values) * 1.1  
                        } 
                    }
                },
                plugins: [ChartDataLabels] 
            });

            //dropdown chọn top
            let select = document.createElement("select");
            select.id = "top-select-device";
            select.style.position = "absolute";
            select.style.top = "46px";
            select.style.right = "470px";
            select.style.padding = "6px 12px";
            select.style.borderRadius = "16px";
            select.style.border = "1px solid #000";
            select.style.background = "#fff";
            select.style.zIndex = "10";
            select.innerHTML = `
                <option value="1">--Top 1--</option>
                <option value="5">--Top 5--</option>
                <option value="10" selected>--Top 10--</option>
                <option value="15">--Top 15--</option>
                <option value="20">--Top 20--</option>
            `;
            wrapper.appendChild(select);

            // Progress bar 
            let progressWrapper = document.createElement("div");
            progressWrapper.style.position = "absolute";
            progressWrapper.style.top = "46px";
            progressWrapper.style.right = "20px";
            progressWrapper.style.width = "430px";
            progressWrapper.style.height = "22px";
            progressWrapper.style.background = "#f0f0f0";
            progressWrapper.style.borderRadius = "20px";
            progressWrapper.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.15)";
            progressWrapper.style.overflow = "hidden";

            // Thanh progress
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
            wrapper.appendChild(progressWrapper);

            // Text hiển thị mô tả
            let progressText = document.createElement("div");
            progressText.style.position = "absolute";
            progressText.style.top = "74px"; 
            progressText.style.right = "20px";
            progressText.style.width = "430px";
            progressText.style.textAlign = "center";
            progressText.style.fontSize = "13px";
            progressText.style.color = "#333";
            progressText.style.fontWeight = "500";
            progressText.innerText = "Top N máy dừng chiếm --% toàn bộ số giờ downtime";

            wrapper.appendChild(progressText);

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
        
    } catch (err) {
        console.error("Lỗi khi gọi API:", err);
    }
}



// theo nguyên nhân
async function draw_column_chart1() {
   
    await new Promise(resolve => setTimeout(resolve, 200));

   
    let reportWrapper = document.querySelector(".form-message");
    if (!reportWrapper) {
        console.warn("Không tìm thấy .form-message");
        return;
    }

   
    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper");
    wrapper.style.width = "100%";
    wrapper.style.height = "400px";
    
   
    reportWrapper.appendChild(wrapper);

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomColumnChart_reason";   
    wrapper.appendChild(canvas);

    try {
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
            Chart.register(ChartDataLabels);
            
            // let selectedReason = null;
            new Chart(ctx, {
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
                            const dataset = event.chart.data.datasets[0];
                            console.log("Click vào:", reason);

                            try {
                                if(currentFilter === reason) {  
                                    // frappe.query_report.set_filter_value("reason_group", "");
                                    frappe.query_report.set_filter_value("reason_group", "");
                                    frappe.query_report.refresh();
                                    // selectedReason = null;
                                    
                                   
                                    frappe.show_alert({
                                        message: "Đã xóa bộ lọc theo nhóm nguyên nhân" ,
                                        indicator: "blue"
                                    });
                                }
                                else {
                                    frappe.query_report.set_filter_value("reason_group", reason);
                                    frappe.query_report.refresh();
                                    // selectedReason = reason;
                                    

                                    frappe.show_alert({
                                        message: "Đã lọc theo: " + reason,
                                        indicator: "green"
                                    })
                                }
                                
                                
                                
                                
                                
                            } catch (err) {
                                // console.error("Lỗi khi set filter:", err);
                                
                                
                                setTimeout(() => {
                                    frappe.query_report.refresh();
                                }, 100);
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false, position: "top" },
                        title: { display: true,
                                text: "Thời gian downtime theo nhóm nguyên nhân",
                                padding: {
                                    top: 10,
                                    bottom: 60
                                },
                                font: {
                                    size: 16,   
                                    weight: 'bold'  
                                },
                                color: '#333',

                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            color: '#3b3939ff',
                            font: { weight: 'bold' },
                            formatter: (value) => value.toFixed(2)
                        }
                    },
                    scales: { y: { beginAtZero: true, suggestedMax: Math.max(...values) * 1.1 } }
                },
                plugins: [ChartDataLabels]
            });
        }
    } catch (err) {
        console.error("Lỗi khi gọi API:", err);
    }
}

async function draw_horizontal_chart1() {
   
    await new Promise(resolve => setTimeout(resolve, 200));

    let chartContainer = document.querySelector(".form-message");
    if (!chartContainer) {
        console.warn("Không tìm thấy div.form-message");
        return;
    }
    chartContainer.classList.add("d-flex");
    chartContainer.style.gap = "20px";
    

   
    let wrapper = document.createElement("div");
    wrapper.classList.add("custom-chart-wrapper");
    wrapper.style.width = "100%";
    wrapper.style.height = "400px";

  
  
    chartContainer.appendChild(wrapper);
    
    

    let canvas = document.createElement("canvas");
    canvas.id = "myCustomBarChart_reason";
    wrapper.appendChild(canvas);

    try {
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
            Chart.register(ChartDataLabels);
            // let selectedReasonDetail = null;

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

                            // console.log("Click vào:", reason);

                            try {
                                if (currentFilter_dt === reasonDetail) {  
                                    // Xóa filter reason_detail
                                    frappe.query_report.set_filter_value("reason_detail", "");
                                    frappe.query_report.refresh();
                                    // selectedReasonDetail = null;
                                    
                                    frappe.show_alert({
                                        message: "Đã xóa bộ lọc theo nguyên nhân",
                                        indicator: "blue"
                                    });
                                } else {
                                    // Set filter reason_detail mới
                                    frappe.query_report.set_filter_value("reason_detail", reasonDetail);
                                    frappe.query_report.refresh();
                                    // selectedReasonDetail = reasonDetail;
                                     frappe.show_alert({
                                        message: "Đã lọc theo: " + reasonDetail,
                                        indicator: "green"
                                    });
                                    
                                }
                                
                                
                                
                                
                                
                            } catch (err) {
                                // console.error("Lỗi khi set filter:", err);
                                
                                
                                setTimeout(() => {
                                    frappe.query_report.refresh();
                                }, 100);
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false, position: "top" },
                        title: { display: true,
                                text: "Top nguyên nhân downtime",
                                padding: {
                                    top: 10,
                                    bottom: 60
                                },
                                font: {
                                    size: 16,   
                                    weight: 'bold'  
                                },
                                color: '#333',
                            
                            },
                        
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
                            suggestedMax: Math.max(...chartData.values) * 1.1  
                        } 
                    }
                },
                plugins: [ChartDataLabels] 
            });

            //dropdown chọn top
            let select = document.createElement("select");
            select.id = "top-select-reason";
            select.style.position = "absolute";
            select.style.top = "46px";
            select.style.right = "470px";
            select.style.padding = "6px 12px";
            select.style.borderRadius = "16px";
            select.style.border = "1px solid #000";
            select.style.background = "#fff";
            select.style.zIndex = "10";
            select.innerHTML = `
                <option value="1">--Top 1--</option>
                <option value="5">--Top 5--</option>
                <option value="10" selected>--Top 10--</option>
                <option value="15">--Top 15--</option>
                <option value="20">--Top 20--</option>
            `;
            wrapper.appendChild(select);
            

            // Progress bar 
            let progressWrapper = document.createElement("div");
            progressWrapper.style.position = "absolute";
            progressWrapper.style.top = "46px";
            progressWrapper.style.right = "20px";
            progressWrapper.style.width = "430px";
            progressWrapper.style.height = "22px";
            progressWrapper.style.background = "#f0f0f0";
            progressWrapper.style.borderRadius = "20px";
            progressWrapper.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.15)";
            progressWrapper.style.overflow = "hidden";

            // Thanh progress
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
            wrapper.appendChild(progressWrapper);

            // Text hiển thị mô tả
            let progressText = document.createElement("div");
            progressText.style.position = "absolute";
            progressText.style.top = "74px"; 
            progressText.style.right = "20px";
            progressText.style.width = "430px";
            progressText.style.textAlign = "center";
            progressText.style.fontSize = "13px";
            progressText.style.color = "#333";
            progressText.style.fontWeight = "500";
            progressText.innerText = "Top N nguyên nhân chiếm --% toàn bộ nguyên nhân dừng máy";

            wrapper.appendChild(progressText);
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

            // click ra màn hình xóa bộ lọc 
            // document.addEventListener('click', function(e) {
            //     if (!e.target.closest('.custom-chart-wrapper') && frappe.query_report.get_filter_value("reason_group")) {
            //         frappe.query_report.set_filter_value("reason_group", "");
            //         frappe.query_report.refresh();
            //         frappe.show_alert({
            //             message: 'Đã xóa bộ lọc theo nguyên nhân',
            //             indicator: "blue"
            //         });
            //     }
            // });
        }
    } catch (err) {
        console.error("Lỗi khi gọi API:", err);
    }
}