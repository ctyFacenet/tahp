frappe.ui.form.on('Job Card', {
    refresh: async function(frm) {
        frm.events.clean_display(frm);
        frm.events.define_layout(frm);
    },

    clean_display: function(frm) {
        frm.set_intro("")
        frm.remove_custom_button("Pause Job")
        frm.remove_custom_button("Complete Job")
        frm.remove_custom_button("Start Job")
        frm.remove_custom_button("Resume Job")
        frm.toolbar.page.add_inner_message('')
        frm.page.clear_primary_action()
        frm.timeline.wrapper.hide()
        frm.comment_box.comment_wrapper.hide()

        let background = '#f4f7fc';
        const isMobile = window.innerWidth <= 768;

        // Lấy wrapper chỉ cho form này
        let $wrapper = $(frm.$wrapper);

        $wrapper.find('.tab-content').css({'background': background})
        $wrapper.find('.page-container').css({'background': background})
        if (isMobile) {
            $wrapper.find('.form-tabs-list').css({'background': background, 'display': 'none'})
        } else {
            $wrapper.find('.form-tabs-list').css({'background': background})
        }
        $wrapper.find('.form-tabs-list .nav.form-tabs .nav-item').css({'background': background})
        $wrapper.find('.form-tabs-list .nav.form-tabs .nav-item .nav-link').css({'background': background})
        $wrapper.find('.layout-main').css({'margin-inline': '-30px'})
        $wrapper.find('.form-page').css({'border': 'none'})
        $wrapper.find('.layout-main-section-wrapper').attr('style', 'padding-left:5px !important; padding-right:5px !important;')
        $wrapper.find('.form-column').attr('style', 'padding-left:5px !important; padding-right:5px !important;')
    },

    define_layout: async function(frm) {
        let $wrapper = frm.fields_dict["custom_buttons"].$wrapper
        $wrapper.empty()
        $wrapper.addClass("jc-layout d-flex flex-wrap w-100")

        let $row0 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $col0 = $(`<div class="jc-col jc-comment text-center w-100 bold" style="cursor:pointer">Thêm bình luận</div>`)
        $row0.append($col0);

        let $row1 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $row2 = $(`<div class="jc-container d-flex flex-wrap w-100 justify-content-start"></div>`)
        let $row3 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)
        let $row4 = $(`<div class="jc-container d-flex flex-wrap w-100"></div>`)

        // Row 1
        let $col1 = $(`<div class="jc-col col-25"></div>`)
        let $col2 = $(`<div class="jc-col col-45"></div>`)
        let $col3 = $(`<div class="jc-col col-30 d-none d-md-block"></div>`)
        $row1.append($col1, $col2, $col3)
        // $row1.append($col1, $col2)

        // Row 2
        for (let workstation of frm.doc.custom_workstation_table) {
            let $col = $(`<div class="jc-col col-25s"></div>`)
            data = frm.doc.custom_config_table.filter(r => r.workstation === workstation.workstation)
            frm.events.define_table(
                frm, $col, `Cấu hình ${workstation.workstation}`,
                columns = [
                    { label: 'Cấu hình', fieldname: 'config_name', is_primary: true },
                    { label: 'Đơn vị', fieldname: 'unit', is_unit: true},
                    { label: 'Giá trị', fieldname: 'config_value', is_value: true },
                ],
                data = data,
                edittable=true,
                action="update_configs",
                action_param=workstation.workstation
            )
            $row2.append($col)
        }

        // Row 3
        let $col4 = $(`<div class="jc-col col-50"></div>`).append(`<div class="jc-title">Đầu vào phụ gia</div>`)
        let $col5 = $(`<div class="jc-col col-50"></div>`).append(`<div class="jc-title">Đầu vào đo bằng đồng hồ</div>`)
        $row3.append($col4, $col5)

        // Row 4
        let $col6 = $(`<div class="jc-col col-50"></div>`)
        let $col7 = $(`<div class="jc-col col-50"></div>`).append(`<div class="jc-title">Lịch sử dừng máy</div>`)
        $row4.append($col6, $col7)

        if (frm.doc.custom_workstation_table && frm.doc.custom_workstation_table.length > 0) $wrapper.append($row0, $row1, $row2, $row3, $row4)
        else $wrapper.append($row0, $row1, $row3, $row4)

        frm.events.define_controller(frm, $col1)

        frm.events.define_table(
            frm, $col2, 'Điều khiển',
            columns=[
                { label: 'Tên thiết bị', fieldname: 'workstation', is_primary: true },
                { label: 'Đã chạy được', fieldname: 'time' },
                { label: 'Trạng thái', fieldname: 'status', is_value: true, type: "string" },
                {
                    label: 'Hành động',
                    fieldname: 'action',
                    action: [
                        {
                            label: "Bật",
                            class: "btn btn-sm btn-success jc-btn",
                            condition: (row) => row.status === "Dừng",
                            handler: async (row) => await frappe.call({
                                method: "tahp.doc_events.job_card.job_card.update_workstations",
                                args: {
                                    job_card: frm.doc.name,
                                    workstations: [{
                                        ...row,
                                        status: "Chạy",
                                    }]
                                }
                            })
                        },
                        {
                            label: "Dừng",
                            class: "btn btn-sm btn-danger jc-btn",
                            condition: (row) => row.status === "Chạy",
                            handler: async (row) => await frm.events.pause_workstation(frm, row),
                        },
                        {
                            label: "Báo hỏng",
                            class: "btn btn-sm btn-warning jc-btn",
                            condition: (row) => row.status !== "Hỏng" && row.status !== "Sẵn sàng",
                            handler: async (row) => await frm.events.problem_workstation(frm, row),
                        },
                        {
                            label: "Khôi phục",
                            class: "btn btn-sm btn-secondary jc-btn",
                            condition: (row) => row.status === "Hỏng",
                            handler: async (row) => {
                                await frappe.call({
                                    method: "tahp.doc_events.job_card.job_card.update_workstations",
                                    args: {
                                        job_card: frm.doc.name,
                                        workstations: [{
                                            ...row,
                                            status: "Chạy",
                                        }]
                                    }
                                })
                                frappe.show_alert({ message: __('Khôi phục thành công'), indicator: 'green' })
                            }
                        }
                    ]
                }
            ],
            data=(frm.doc.custom_workstation_table || []).map(d => {
                return {
                    workstation: d.workstation,
                    time: '00:00:00',
                    status: d.status,
                };
            }),
            edittable=false,
        )
        if (frm.__workstation_timer) clearInterval(frm.__workstation_timer);
        frm.__workstation_timer = setInterval(() => frm.events.update_workstations_timer_display(frm, $col2), 1000);
        frm.events.update_workstations_timer_display(frm, $col2)

        let has_input = frm.doc.custom_input_table.find(row=>!row.is_meter)
        if (has_input) {
            $col4.empty()
            frm.events.define_table(
                frm, $col4, 'Đầu vào phụ gia',
                columns=[
                    { label: 'Mã mặt hàng', fieldname: 'item_code', is_primary: true },
                    { label: 'Tên mặt hàng', fieldname: 'item_name', is_secondary: true },
                    { label: 'Đã tiêu hao?', fieldname: 'qty', is_value: true },
                    { label: 'Đơn vị', fieldname: 'uom', is_unit: true},
                ],
                data=frm.doc.custom_input_table.filter(d => !d.is_meter).map(d => {
                    return {
                        item_code: d.item_code,
                        item_name: d.item_name,
                        qty: d.qty,
                        uom: d.uom,
                    };
                }),
                edittable=true,
                action="edit_inputs"
            )
        }

        let has_input_meter = frm.doc.custom_input_table.find(row=>row.is_meter)
        if (has_input_meter) {
            $col5.empty()
            frm.events.define_table(
                frm, $col5, 'Đầu vào đo bằng đồng hồ',
                columns=[
                    { label: 'Mã mặt hàng', fieldname: 'item_code', is_primary: true },
                    { label: 'Tên mặt hàng', fieldname: 'item_name', is_secondary: true },
                    { label: 'Đã tiêu hao', fieldname: 'qty' },
                    { label: 'Số đo đầu', fieldname: 'meter', is_value: true, symbolize: '<i class="fas fa-arrow-right jc-i mx-1"></i>', nowrap: true },
                    { label: 'Số đo mới', fieldname: 'meter_out', is_value: true, nowrap: true },
                    { label: 'Đơn vị', fieldname: 'uom', is_unit: true},
                ],
                data=frm.doc.custom_input_table.filter(d => d.is_meter).map(d => {
                    return {
                        item_code: d.item_code,
                        item_name: d.item_name,
                        qty: d.qty,
                        uom: d.uom,
                        meter: d.meter,
                        meter_out: d.meter_out
                    };
                }),
                edittable=true,
                action="edit_inputs_meter"
            )
        }

        frm.events.define_table(
            frm, $col6, 'Đội ngũ làm việc',
            columns=[
                { label: 'Mã nhân viên', fieldname: 'employee', is_value: true, type: "string" },
                { label: 'Tên nhân viên', fieldname: 'employee_name', is_primary: true },
                {
                    label: 'Hành động',
                    fieldname: 'action',
                    action: [
                        {
                            label: "Đổi người",
                            class: "btn btn-sm btn-secondary jc-btn",
                            condition: row => true,
                            handler: async (row, rowIndex) => {
                                await frm.events.change_employee(frm, row)
                            }
                        },
                        {
                            label: "Nghỉ",
                            class: "btn btn-sm btn-warning jc-btn",
                            condition: row => true,
                            handler: async (row, rowIndex) => {
                                await frm.events.pause_employee(frm, row)
                            }
                        }
                    ]
                }
            ],
            data=(frm.doc.custom_team_table || []).map(d => {
                return {
                    employee: d.employee,
                    employee_name: d.employee_name
                };
            }),
            edittable=false,
            action = async () => {await frm.events.update_team_async(frm)},
        )

        if (frm.doc.custom_downtime && frm.doc.custom_downtime.length > 0) {
            $col7.empty()
            frm.events.define_table(
                frm, $col7, 'Lịch sử dừng máy',
                columns=[
                    { label: 'Thời gian', fieldname: 'time', is_primary: true },
                    { label: 'Khoảng dừng', fieldname: 'duration', is_secondary: true },
                    { label: 'Thiết bị', fieldname: 'workstation', is_secondary: true },
                    { label: 'Lý do', fieldname: 'reason', is_value: true, type: "string" },
                    { label: 'Phân loại lý do', fieldname: 'group_name', is_unit: true, type: "string" },
                ],
                data=frm.doc.custom_downtime.map(d => {
                    const from_time = d.from_time ? d.from_time.slice(11, 19) : "";
                    const to_time   = d.to_time   ? d.to_time.slice(11, 19)   : "";
                    const time_str  = `${from_time} → ${to_time}`;

                    // Duration
                    let duration_str = '';
                    if (d.duration) {
                        let duration = d.duration;
                        const hours = Math.floor(duration / 3600);
                        duration %= 3600;
                        const minutes = Math.floor(duration / 60);
                        const seconds = Math.floor(duration % 60);
                        if (hours) duration_str += `${hours} giờ `;
                        if (minutes) duration_str += `${minutes} phút `;
                        if (seconds || (!hours && !minutes)) duration_str += `${seconds} giây`;
                    } else {
                        duration_str = 'Chưa có';
                    }

                    // Workstation
                    const workstation_str = d.workstation || '';

                    // is_danger
                    let reason_str = d.reason;
                    if (d.is_danger) reason_str = `<i class="fas fa-exclamation-triangle" style="color: red;"></i> Hỏng: ${d.reason}`

                    return {
                        time: time_str,
                        duration: duration_str,
                        workstation: workstation_str,
                        reason: reason_str,
                        group_name: d.group_name,
                    };
                }),
            )
        }

        frm.events.create_chart(frm, $col3)
        frm.events.update_feedback(frm, $col0)
    },

    // update_comment: async function (frm, $col0) {
    //     let r = await frappe.call({
    //         method: "tahp.doc_events.job_card.job_card.check_ptcn_role",
    //     });
    //     if (!r.message) $col0.hide();
    //     $col0.on("click", function () {
    //         frappe.prompt(
    //             [
    //                 {
    //                     label: "Điền bình luận",
    //                     fieldname: "comment",
    //                     fieldtype: "Small Text",
    //                     reqd: 1
    //                 }
    //             ],
    //             async function (values) {
    //                 try {
    //                     await frappe.call({
    //                         method: "tahp.doc_events.job_card.job_card.update_comment",
    //                         args: {
    //                             docname: frm.doc.name,
    //                             comment: values.comment
    //                         }
    //                     });
    //                 } catch (err) {
    //                     frappe.msgprint(__("Có lỗi xảy ra khi xử lý"));
    //                     console.error(err);
    //                 }
    //             },
    //             "Thêm bình luận",
    //             "Gửi"
    //         );
    //     });
    // },

    update_feedback: async function(frm, $col0) {
        const tracker = frm.doc.custom_tracker;
        if (!tracker || !tracker.length) {
            $col0.hide();
            return;
        }

        const latest_feedback = tracker[tracker.length - 1]; // lấy dòng cuối cùng

        if (!latest_feedback.to_time) {
            $col0.html(`
                Yêu cầu từ PTCN: ${latest_feedback.feedback} <br>
                <small style="color:#3b82f6; cursor:pointer">Nhấn vào để xác nhận</small>
            `);

            $col0.off("click").on("click", async function () {
                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.update_feedback",
                    args: { docname: frm.doc.name }
                });
                frappe.show_alert("Đã xác nhận yêu cầu từ PTCN");
            });
        } else {
            $col0.hide();
        }
    },

    create_chart(frm, $col3) {
        const inputs = frm.doc.custom_inputs || [];

        const itemNameMap = {};
        (frm.doc.custom_input_table || []).forEach(row => {
            itemNameMap[row.item_code] = row.item_name;
        });

        // Lấy toàn bộ label (chỉ HH:MM:SS, không ngày tháng)
        const labels = [...new Set(
            inputs.map(i => new Date(i.from_time).toLocaleTimeString('en-GB', { hour12: false }))
        )];

        // Màu hiện đại với gradient
        const modernColors = [
            { border: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.1)' }, // Red
            { border: '#4ECDC4', bg: 'rgba(78, 205, 196, 0.1)' }, // Teal
            { border: '#45B7D1', bg: 'rgba(69, 183, 209, 0.1)' }, // Blue
            { border: '#96CEB4', bg: 'rgba(150, 206, 180, 0.1)' }, // Green
            { border: '#FFEAA7', bg: 'rgba(255, 234, 167, 0.1)' }, // Yellow
            { border: '#DDA0DD', bg: 'rgba(221, 160, 221, 0.1)' }, // Purple
            { border: '#98D8C8', bg: 'rgba(152, 216, 200, 0.1)' }, // Mint
            { border: '#F7DC6F', bg: 'rgba(247, 220, 111, 0.1)' }, // Gold
            { border: '#BB8FCE', bg: 'rgba(187, 143, 206, 0.1)' }, // Lavender
            { border: '#85C1E9', bg: 'rgba(133, 193, 233, 0.1)' }  // Light Blue
        ];

        let colorIndex = 0;

        const datasetsMap = {};

        // Tạo datasets với dữ liệu ban đầu
        inputs.forEach(row => {
            const timeLabel = new Date(row.from_time).toLocaleTimeString('en-GB', { hour12: false });

            if (!datasetsMap[row.item_code]) {
                const color = modernColors[colorIndex % modernColors.length];
                colorIndex++;

                datasetsMap[row.item_code] = {
                    // lấy tên từ bảng custom_input_table
                    label: `${row.item_code}: ${itemNameMap[row.item_code] || 'Unknown'}`,
                    data: Array(labels.length).fill(null),
                    borderWidth: 3,
                    borderColor: color.border,
                    backgroundColor: color.bg,
                    fill: true, // Bật fill để có nền gradient
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: color.border,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: color.border,
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3
                };
            }

            const idx = labels.indexOf(timeLabel);
            if (idx !== -1) {
                datasetsMap[row.item_code].data[idx] = row.qty;
            }
        });

        // Fill giá trị thiếu bằng giá trị trước đó gần nhất
        Object.keys(datasetsMap).forEach(itemCode => {
            const data = datasetsMap[itemCode].data;
            let lastValue = null;
            
            for (let i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    lastValue = data[i];
                } else if (lastValue !== null) {
                    // Nếu không có giá trị tại vị trí này và có giá trị trước đó
                    data[i] = lastValue;
                }
            }
        });

        const datasets = Object.values(datasetsMap);

        // Xóa chart cũ nếu có
        if (window.myChart) {
            window.myChart.destroy();
        }

        // Xóa resize observer cũ nếu có
        if (window.chartResizeObserver) {
            window.chartResizeObserver.disconnect();
        }

        // Vẽ chart với Chart.js
        $col3.empty(); 

        // Tạo container div cho chart
        const chartContainer = document.createElement("div");
        chartContainer.style.position = 'relative';
        chartContainer.style.height = '250px';
        chartContainer.style.width = '100%';
        $col3.append(chartContainer);

        // Tạo thẻ canvas mới
        const canvas = document.createElement("canvas");
        chartContainer.appendChild(canvas);

        // Lấy context từ canvas
        const ctx = canvas.getContext("2d");

        // Tạo gradient cho background
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(250, 250, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(240, 248, 255, 0.2)');

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Biểu đồ theo dõi số lượng tiêu hao',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#2c3e50',
                        padding: {
                            bottom: 5
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: { 
                                size: 12,
                                weight: '500'
                            },
                            color: '#2c3e50',
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(45, 52, 73, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#4ECDC4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: true,
                        titleFont: {
                            size: 13,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Thời gian',
                            color: '#2c3e50',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#5a6c7d',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Số lượng',
                            color: '#2c3e50',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#5a6c7d',
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 8
                    }
                }
            }
        });

        // Thêm ResizeObserver để theo dõi thay đổi kích thước container
        if (window.ResizeObserver) {
            window.chartResizeObserver = new ResizeObserver(entries => {
                if (window.myChart) {
                    // Đợi một chút để DOM cập nhật xong
                    setTimeout(() => {
                        window.myChart.resize();
                    }, 100);
                }
            });
            
            window.chartResizeObserver.observe($col3[0]);
        }

        // Fallback: Lắng nghe sự kiện resize của window
        const handleResize = () => {
            if (window.myChart) {
                setTimeout(() => {
                    window.myChart.resize();
                }, 150);
            }
        };

        // Xóa listener cũ nếu có
        if (window.chartResizeHandler) {
            window.removeEventListener('resize', window.chartResizeHandler);
        }

        window.chartResizeHandler = handleResize;
        window.addEventListener('resize', handleResize);
    },

    update_workstations_timer_display(frm, $wrapper) {
        const now = frappe.datetime.now_datetime();
        frm.doc.custom_workstation_table.forEach((row, rowIndex) => {
            if (!row.start_time) return;

            let diffMs = 0;
            if (row.active) {
                diffMs = (row.time || 0) + (new Date(now) - new Date(row.start_time));
            } else {
                diffMs = row.time || 0;
            }

            let diffSec = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSec / 3600);
            diffSec %= 3600;
            const minutes = Math.floor(diffSec / 60);
            const seconds = diffSec % 60;

            const hStr = String(hours).padStart(2, "0");
            const mStr = String(minutes).padStart(2, "0");
            const sStr = String(seconds).padStart(2, "0");

            const $timeField = $wrapper.find(`[data-fieldname="time"][data-rowindex="${rowIndex}"]`);
            $timeField.text(`${hStr}:${mStr}:${sStr}`);
        });
    },

    define_controller: async function(frm, $wrapper) {
        // Định nghĩa khung
        let $status = $(`<div class="flex justify-content-between align-items-center jc-header">
            <div>
                <span class="jc-circle"></span>
                <span class="jc-title">${__(frm.doc.status)}</span>
            </div>
            <div>
                <span class="jc-count">Đầu việc số 1 / 1</span>
                <i class="fas fa-bars jc-icon"></i>
            </div>
        </div>`)
        let $task = $(`<div class="jc-task"></div>`)
        let $button = $('<div class="flex justify-content-between jc-g"></div>')
        // $wrapper.append($status, $task, $button)
        if (frm.doc.docstatus === 0) $wrapper.append($status, $task, $button)
        else $wrapper.append($status)

        // Kiểm tra trạng thái
        let list;
        if (frm.doc.status === "Open") {
            list = ["Bắt đầu", "Chuyển việc", "Hoàn thành"]
            $status.find('.jc-circle').css({'background': '#047f88ff'})
        } else if (frm.doc.status === "Work In Progress") {
            list = ["Tạm dừng", "Chuyển việc", "Hoàn thành"]
            $status.find('.jc-circle').css({'background': '#1cca42ff'})
        } else if (frm.doc.status === "On Hold") {
            list = ["Tiếp tục", "Chuyển việc", "Hoàn thành"]
            $status.find('.jc-circle').css({'background': '#f04848ff'})
        } else {
            list = []
        }

        // Kiểm tra đầu việc
        let subtasks = frm.doc.custom_subtask || [];
        let currentIndex = subtasks.findIndex(row => row.done === "Đang thực hiện");
        if (currentIndex !== -1) {
            $status.find('.jc-count').text(`Đầu việc số ${currentIndex + 1} / ${frm.doc.custom_subtask.length}`);
            $task.text(`Đang thực hiện: ${subtasks[currentIndex].reason}`);
        } else {
            currentIndex = subtasks.findIndex(row => row.done === "Đang mở");
            if (currentIndex !== -1) {
                $status.find('.jc-count').text(`Đầu việc số ${currentIndex + 1} / ${frm.doc.custom_subtask.length}`);
                $task.text(`Đang mở: ${subtasks[currentIndex].reason}`);
            } else {
                const currentDone = subtasks.filter(row => row.done === "Xong").length;
                $status.find('.jc-count').text(`Hoàn thành ${currentDone} / ${frm.doc.custom_subtask.length}`);

            }
        }


        let cOpen = frm.doc.status !== "Open"
        let cTask = false;
        if (frm.doc.custom_subtask && frm.doc.custom_subtask.length > 0) {
            const pending = frm.doc.custom_subtask.filter(t => t.done === "Đang mở").length;
            if (pending > 0) cTask = true;
        }
        let cGood = false;
        if (frm.doc.custom_workstation_table && frm.doc.custom_workstation_table.length > 0) {
            cGood = frm.doc.custom_workstation_table.some(ws => ws.status !== "Hỏng")
        }

        // Định nghĩa nút điều khiển
        const buttons = [
            { icon: "fas fa-play", label: "Bắt đầu", action: () => frm.events.start_job_card(frm), condition: null },
            { icon: "fas fa-pause", label: "Tạm dừng", action: () => frm.events.pause_job_card(frm), condition: cGood },
            { icon: "fas fa-play", label: "Tiếp tục", action: () => frm.events.resume_job_card(frm), condition: cGood },
            { icon: "fas fa-forward", label: "Chuyển việc", action: () => frm.events.transfer_job_card(frm), condition: cOpen && cTask },
            { icon: "fas fa-circle-check", label: "Hoàn thành", action: () => frm.events.complete_job_card(frm), condition: cOpen }
        ]

        list.forEach(label => {
            let btnConfig = buttons.find(b => b.label === label)
                let $btn = $(`<button type="button" class="jc-button btn btn-light"><i class="${btnConfig.icon}"></i></button>`)
                $btn.on("click", btnConfig.action)
                if (btnConfig.condition === false) $btn.addClass("jc-button-disabled")
                $button.append($btn)
        })

        // Toggle hiển thị danh sách
        let expanded = false
        let $originalContent = $('<div class="jc-content"></div>');
        if (frm.doc.docstatus === 0)  $originalContent.append($task, $button);
        $wrapper.append($originalContent);
        
        let $listView = $(`<div class="jc-list" style="display:none"></div>`)
        subtasks.forEach((row, idx) => {
            let $row = $(`<div></div>`);
            $row.append(`${row.reason} — <b>${row.done}</b>`);

            if (row.done === "Đang thực hiện") {
                $row.addClass('jc-undone');
            }
            $listView.append($row);
        });
        $wrapper.append($originalContent)

        $status.find(".jc-icon").on("click", function() {
            if (!expanded) {
                $originalContent.slideUp(200, function() {
                    $originalContent.detach()
                    $wrapper.append($listView)
                    $listView.hide().slideDown(200)
                })
            } else {
                $listView.slideUp(200, function() {
                    $listView.detach()
                    $wrapper.append($originalContent)
                    $originalContent.hide().slideDown(200)
                })
            }
            expanded = !expanded
        })
    },

    define_table: function(frm, $wrapper, title, columns, data, edittable=false, action=null, action_param=null) {

        // Header
        let $header = $(`
            <div class="d-flex flex-wrap justify-content-between jc-title jc-tb-title">
                <div class="flex-grow-1">${title}</div>
            </div>
        `);
        $wrapper.append($header);

        // Nút sửa
        if ((edittable || action) && frm.doc.docstatus === 0) {
            if (data.length > 0) {
                let $editBtn = $('<button class="btn btn-secondary d-none d-md-table jc-edit-btn">Sửa</button>')
                $header.append($editBtn)
            }

            if (!edittable && action && data.length > 0) {
                let $editBtn = $('<button class="btn btn-secondary d-md-none jc-edit-btn">Sửa</button>')       
                $header.append($editBtn)                
            }

            // let $editMobileBtn = $('<button class="btn btn-secondary d-md-none w-100 mt-2 jc-edit-btn jc-mobile-input">Sửa</button>')
            // $wrapper.append($editMobileBtn)
        }


        // Desktop
        let $desktopWrapper = $('<div class="d-none d-md-block overflow-auto"></div>');
        let $desktopTable = $('<table class="table table-sm"></table>')
        let $thead = $('<thead><tr></tr></thead>')
        columns.forEach(col => {
            let th = `<th>${col.label || ""}</th>`
            $thead.find('tr').append(th)
        })
        $desktopWrapper.append($desktopTable);
        $desktopTable.append($thead)
        $wrapper.append($desktopWrapper)

        let $tbody = $('<tbody></tbody>')
        let desktopInputs = [];
        data.forEach((row, rowIndex) => {
            let $tr = $('<tr></tr>')
            if (rowIndex % 2 === 0) {
                $tr.css("background-color", "#f5f5f5ff");
            } else {
                $tr.css("background-color", "#ffffff");
            }
            columns.forEach(col => {
                let $td
                if (col.action && frm.doc.docstatus === 0) {
                    $td = $('<td class="text-nowrap"></td>')
                    col.action.forEach(btn => {
                        if (!btn.condition || btn.condition(row)) {
                            let $b = $(`<button class="${btn.class} btn btn-sm mr-2">${btn.label}</button>`)
                            $b.on("click", () => btn.handler(row, rowIndex))
                            $td.append($b)
                        }
                    })
                } else if (col.is_value) {
                    if (col.type !== 'string') {
                        let value = row[col.fieldname] != null ? row[col.fieldname] : '';
                        if (col.type === 'number' && value !== '') value = parseFloat(value);

                        let $input = $(`<input type="number" class="jc-tb-mobile-value text-left" value="${value}" style="max-width:10ch;">`);
                        $input.attr('data-fieldname', col.fieldname);
                        $input.attr('data-rowindex', rowIndex);
                        $input.css('pointer-events', 'none')
                        $input.css('background', 'transparent')
                        $td = $('<td></td>');
                        desktopInputs.push($input);
                        $td.append($input);
                    } else {
                        $td = $(`<td>${row[col.fieldname] || ''}</td>`);
                    }
                } else {
                    $td = $(`<td>${row[col.fieldname] || ''}</td>`)
                    $td.attr('data-fieldname', col.fieldname)
                    $td.attr('data-rowindex', rowIndex)
                }
                $tr.append($td)
            })
            $tbody.append($tr);
        })
        $desktopTable.append($tbody)

        // Mobile
        let $mobileTable = $('<div class="d-md-none"></div>')
        let primary = columns.find(c => c.is_primary);
        let middle = columns.find(c => !c.is_primary && !c.is_secondary && !c.is_value && !c.is_unit && !c.action);
        let value = columns.find(c => c.is_value);
        let $theadMobile = $(`<div class="d-flex py-1 mb-1 border-bottom"></div>`)
        if (middle) {
            $theadMobile.append(`<div style="flex:1" class="text-left">${primary?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:1" class="text-center">${middle?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:1" class="text-right">${value?.label || ""}</div>`)
        } else {
            $theadMobile.append(`<div style="flex:2" class="text-left">${primary?.label || ""}</div>`)
            $theadMobile.append(`<div style="flex:1" class="text-right">${value?.label || ""}</div>`)
        }
        $mobileTable.append($theadMobile)
        $wrapper.append($mobileTable)

        let mobileInputs = [];
        data.forEach((row, rowIndex) => {
            let $row = $(`<div class="d-flex mb-2 py-1 jc-tb-mobile-row"></div>`)
            let $left, $right, $middle

            if (middle) {
                $left = $(`<div style="flex:1" class="text-left"></div>`)
                $middle = $(`<div style="flex:1" class="text-center"></div>`)
                $right = $(`<div style="flex:1" class="text-right"></div>`)
                $realRight = $('<div class="jc-tb-right"></div>')
                $right.append($realRight)
            } else {
                $left = $(`<div style="flex:2" class="text-left"></div>`)
                $right = $(`<div style="flex:1" class="text-right"></div>`)
                $realRight = $('<div class="jc-tb-right"></div>')
                $right.append($realRight)

            }

            let $buttons = $(`<div></div>`)
            columns.forEach(col => {
                if (col.is_primary && row[col.fieldname]) {$left.append(`<div class="">${row[col.fieldname]}</div>`)}
                else if(col.is_secondary && row[col.fieldname]) $left.append(`<div class="jc-tb-secondary">${row[col.fieldname]}</div>`)
                else if(col.is_value) {
                    if (col.type !== 'string') {
                        let value = row[col.fieldname] != null ? row[col.fieldname] : '';
                        if (col.type === 'number' && value !== '') value = parseFloat(value);
                        let $input = $(`<input type="number" class="jc-tb-mobile-value" value="${value}">`);
                        $input.attr('data-fieldname', col.fieldname);
                        $input.attr('data-rowindex', rowIndex);
                        $input.css('pointer-events', 'none')
                        if (col.nowrap) $input.css({'max-width': '5ch'})
                        else $input.css({'width':'100%'})
                        if (frm.doc.docstatus == 0) $input.addClass('jc-tb-mobile-value-new')
                        $realRight.append($input);
                        if (col.symbolize) $realRight.append(col.symbolize);
                        mobileInputs.push($input);
                    } else {
                        $realRight.append(`<div>${row[col.fieldname] || ''}</div>`);
                    }
                }
                else if(col.is_unit && row[col.fieldname]) $right.append(`<div class="ml-2 jc-tb-secondary">${row[col.fieldname]}</div>`)
                else if (col.action && frm.doc.docstatus === 0) {
                    col.action.forEach(btn => {
                        if (!btn.condition || btn.condition(row)) {
                            let $b = $(`<button class="${btn.class} btn btn-sm mr-2">${btn.label}</button>`)
                            $b.on("click", () => btn.handler(row, rowIndex))
                            $buttons.append($b)
                        }
                    })
                }
                else {
                    if (middle && col.fieldname !== "action") $middle.append(`<div data-fieldname=${col.fieldname} data-rowindex=${rowIndex} class="text-center">${row[col.fieldname]}</div>`)
                }
            })

            if ($middle) $row.append($left, $middle, $right)
            else $row.append($left, $right)
            $mobileTable.append($row)
            if (!$buttons.is(':empty')) {
                let $wrapper = $('<div class="border-bottom mb-2 pb-2"></div>')
                $wrapper.append($row)
                $wrapper.append($buttons)
                $mobileTable.append($wrapper)
            } else {
                $row.addClass("border-bottom mb-2 pb-1")
                $mobileTable.append($row)
            }
        })

        if (edittable === false && action) {
             $wrapper.on("click", ".jc-edit-btn", action)
             return;
        }

        // ----- XỬ LÝ CHẾ ĐỘ EDIT -----
        if (frm.doc.docstatus != 0) return;
        let editing = false;

        function enableEditing(inputs ,$btn=null) {
            if (editing) return;
            editing = true;

            inputs.forEach(($input, index) => {
                $input.css('pointer-events', 'auto').addClass('jc-edit-editing');
                $input.data("original-value", $input.val());
                // Enter để nhảy qua input kế tiếp
                $input.on('keydown.nextFocus', function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        const nextIndex = index + 1;
                        if (nextIndex < inputs.length) {
                            scrollAndFocus(inputs, nextIndex);
                        } else {
                            $input.blur(); // giả lập blur cuối cùng
                        }
                    }
                });
                // Khi blur thì kiểm tra xem có phải input cuối hoặc rời hết không
                $input.on('blur.saveCheck', function() {
                    setTimeout(() => {
                        if (!$(".jc-edit-editing:focus").length) { // không còn input nào focus
                            frappe.confirm(
                                "Lưu thay đổi?",
                                () => {
                                    const result = covertAllData(data, inputs);
                                    if (action) frm.events[action](frm, result, action_param);;
                                    disableEditing(inputs, $btn);
                                },
                                () => { disableEditing(inputs, $btn); }
                            );
                        }
                    }, 150);
                });
            });
            if ($btn) $btn.addClass('jc-edit-btn-save').text('Lưu');
            if (inputs[0]) scrollAndFocus(inputs, 0);
        }

        function disableEditing(inputs, $btn) {
            editing = false;
            inputs.forEach($input => {
                $input.val($input.data("original-value"));
                $input
                    .css('pointer-events', 'none')
                    .removeClass('jc-edit-editing')
                    .off('keydown.nextFocus')
                    .off('blur.saveCheck');
            });
            if ($btn) $btn.removeClass('jc-edit-btn-save').text('Sửa');
        }

        // Desktop: vẫn dùng nút Sửa
        $wrapper.on("click", ".jc-edit-btn", function() {
            const $btn = $(this);
            enableEditing(desktopInputs, $btn);
        });

        // Mobile: click vào bảng để bật edit
        $wrapper.on("click", ".jc-tb-mobile-row", function() {
            if (!editing) enableEditing(mobileInputs);
        });
    },

    start_job_card: async function(frm) {
        if (
            !frm.doc.custom_workstation_table || 
            !frm.doc.custom_workstation_table.length
        ) {
            await frm.events.start_workstations(frm);
        }

        if (
            !frm.doc.custom_team_table ||
            !frm.doc.custom_team_table.length
        ) {
            await frm.events.update_team(frm);
        }

        await frm.events.transfer_job_card(frm);

        const workstations = frm.doc.custom_workstation_table.map(row => ({
            ...row,
            status: "Chạy"
        }));

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.update_workstations",
            args: {
                job_card: frm.doc.name,
                workstations
            }
        });
    },

    pause_job_card: async function(frm) {
        const running_ws = (frm.doc.custom_workstation_table || []).filter(
            row => row.status === "Chạy"
        );
        if (running_ws.length === 0) return;

        const reason_info = await frm.events.select_pause_reason(frm, running_ws.map(ws => ws.workstation));
        if (!reason_info) return;
        const workstations = running_ws.map(ws => ({
            workstation: ws.workstation,
            status: "Dừng",
            reason: reason_info.reason,
            group_name: reason_info.group_name || null
        }));

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.update_workstations",
            args: {
                job_card: frm.doc.name,
                workstations
            }
        });
    },

    resume_job_card: async function(frm) {
        const workstations_ready = (frm.doc.custom_workstation_table || []).filter(
            row => row.status === "Dừng"
        );
        if (workstations_ready.length === 0) return;
        const workstations = workstations_ready.map(row => ({
            ...row,
            status: "Chạy"
        }));

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.update_workstations",
            args: {
                job_card: frm.doc.name,
                workstations
            }
        });
    },

    complete_job_card: async function(frm) {
        if (frm.doc.custom_subtask) {
            let subtask_list = frm.doc.custom_subtask || [];
            let in_progress_count = subtask_list.filter(t => t.done === "Đang mở").length;
            if (in_progress_count > 0) {
                const message = `<div>Bạn chưa hoàn thành toàn bộ đầu việc của Công đoạn.</div>
                                <p>Bạn có chắc chắn muốn tiếp tục kết thúc công đoạn không?</p>`;

                await new Promise((resolve, reject) => {
                    frappe.confirm(message, resolve, () => {
                        reject();
                        return;
                    });
                });
            }
        }

        const message = `Xác nhận hoàn thành LSX Công đoạn?`;
        await new Promise((resolve, reject) => {
            frappe.confirm(message, resolve, () => {
                reject();
                return;
            });
        });

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.submit",
            args: { job_card: frm.doc.name }
        });
    },

    transfer_job_card: async function(frm) {
        return new Promise(async (resolve, reject) => {
            const subtasks = frm.doc.custom_subtask || [];
            if (!subtasks.length) {
                resolve(true)
                return
            }
            if (subtasks[0].reason === frm.doc.operation) {
                resolve(true)
                return
            }
            const selectable = subtasks.filter(t => t.done === "Đang mở");
            if (!selectable.length) {
                resolve(true)
                return
            }

            const d = new frappe.ui.Dialog({
                title: __('Chọn đầu việc sắp thực hiện'),
                fields: [{
                    fieldname: 'subtask',
                    fieldtype: 'Select',
                    label: 'Đầu việc',
                    options: selectable.map(t => t.reason),
                    default: selectable[0].reason,
                    reqd: 1
                }],
                primary_action_label: __('Xác nhận'),
                primary_action: async function() {
                    const values = d.get_values();
                    if (!values || !values.subtask) {
                        frappe.msgprint(__('Bạn phải chọn một đầu việc'));
                        return;
                    }

                    await frappe.call({
                        method: "tahp.doc_events.job_card.job_card.set_subtask",
                        args: {
                            job_card: frm.doc.name,
                            reason: values.subtask
                        }
                    });

                    d.hide();
                    resolve(true);
                },
            });

            d.show();
        });
    },

    start_workstations: async function(frm) {
        return new Promise(async (resolve, reject) => {
            try {
                let workstations = (await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.get_workstations",
                    args: { job_card: frm.doc.name }
                })).message;

                const d = new frappe.ui.Dialog({
                    title: 'Chọn thiết bị',
                    fields: [{ fieldname: "html_table", fieldtype: "HTML" }],
                    primary_action_label: "Tiếp tục",
                    primary_action: async () => {
                        await frappe.call({
                            method: "tahp.doc_events.job_card.job_card.set_workstations",
                            args: { job_card: frm.doc.name, workstations }
                        });
                        d.hide(); resolve();
                    },
                });

                d.show();

                const renderTable = () => {
                    const html = `<table class="table table-bordered">
                        <thead style="background: #eee">
                            <tr>
                                <th>Tên thiết bị</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workstations.map((ws, i) =>
                                `<tr>
                                    <td>${ws.workstation}</td>
                                    <td>
                                        ${workstations.length > 1 
                                            ? `<button class="btn btn-xs btn-danger" data-idx="${i}">Xóa</button>` 
                                            : ""}
                                    </td>
                                </tr>`
                            ).join('')}
                        </tbody>
                    </table>`;

                    d.fields_dict.html_table.$wrapper.html(html);

                    if (workstations.length > 1) {
                        d.fields_dict.html_table.$wrapper.find('button').click(e => {
                            const i = $(e.currentTarget).data('idx');
                            workstations.splice(i, 1);
                            renderTable();
                        });
                    }
                };

                renderTable();
            } catch (err) { reject(err); }
        });
    },

    update_team: async function(frm) {
        return new Promise(async (resolve, reject) => {
            if (frm.doc.custom_team_table && frm.doc.custom_team_table.length > 0) {
                resolve(true);
                return;
            }
            const response =  await frappe.call({method: "tahp.doc_events.job_card.job_card.get_team", args: {job_card: frm.doc.name}})
            const team = response.message

            const d = new frappe.ui.Dialog({
                title: 'Danh sách nhân viên',
                fields: [{
                    fieldname: "items",
                    fieldtype: "Table",
                    data: team,
                    in_place_edit: true,
                    fields: [
                        {
                            fieldname: "employee",
                            label: __("Mã nhân viên"),
                            fieldtype: "Link",
                            in_list_view: 1,
                            options: "Employee",
                            onchange: async function(e) {
                                let emp = await frappe.db.get_value("Employee", this.value, fields=['employee_name']);
                                this.doc.employee_name = emp.message.employee_name
                                d.fields_dict.items.grid.refresh();
                            },
                            get_query: function() {
                                let selected = (d.get_values().items || [])
                                    .map(r => r.employee)
                                    .filter(Boolean);
                                return {
                                        filters: [
                                            ["Employee", "employee", "not in", selected]
                                        ]
                                    };
                            }
                        },
                        {
                            fieldname: "employee_name",
                            label: __("Nhân viên"),
                            fieldtype: "Data",
                            in_list_view: 1,
                            read_only: 1
                        }
                    ]
                }],
                primary_action_label: "Tiếp tục",
                primary_action: async function() {
                    const values = d.get_values();
                    if (!values || !values.items || values.items.length === 0) {
                        frappe.msgprint(__('Trong danh sách phải ít nhất có 1 thành viên'));
                        return;
                    }

                    let has_valid_row = values.items.some(row => row.employee && row.employee.trim() !== "");

                    if (!has_valid_row) {
                        frappe.msgprint(__('Trong danh sách phải có ít nhất 1 thành viên hợp lệ'));
                        return;
                    }

                    if (values && values.items) {
                        await frappe.call({method: "tahp.doc_events.job_card.job_card.set_team", args: {job_card: frm.doc.name, team: values.items}})
                    }
                    d.hide();
                    resolve();
                },
            })
            d.show();
        });
    },

    update_team_async: async function(frm) {
        // Lấy team bằng await
        const response = await frappe.call({
            method: "tahp.doc_events.job_card.job_card.get_team",
            args: { job_card: frm.doc.name }
        });
        const team = response.message || [];

        // Tạo dialog
        const d = new frappe.ui.Dialog({
            title: 'Danh sách nhân viên',
            fields: [{
                fieldname: "items",
                fieldtype: "Table",
                data: team,
                in_place_edit: true,
                fields: [
                    {
                        fieldname: "employee",
                        label: __("Mã nhân viên"),
                        fieldtype: "Link",
                        options: "Employee",
                        in_list_view: 1,
                        onchange: async function() {
                            const emp = await frappe.db.get_value("Employee", this.value, ['employee_name']);
                            this.doc.employee_name = emp.message.employee_name;
                            d.fields_dict.items.grid.refresh();
                        }
                    },
                    {
                        fieldname: "employee_name",
                        label: __("Nhân viên"),
                        fieldtype: "Data",
                        in_list_view: 1,
                        read_only: 1
                    }
                ]
            }],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (!values || !values.items || values.items.length === 0) {
                    frappe.msgprint(__('Trong danh sách phải ít nhất có 1 thành viên'));
                    return;
                }

                // Gọi API set_team bằng await
                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.set_team",
                    args: { job_card: frm.doc.name, team: values.items }
                });

                d.hide();
            }
        });

        d.show();
    },

    change_employee: async function(frm, row) {
        frappe.prompt([
            {
                fieldname: 'new_employee',
                label: __('Mã nhân viên mới'),
                fieldtype: 'Link',
                options: 'Employee',
                reqd: 1,
                get_query: function() {
                    const existing_ids = (frm.doc.custom_team_table || []).map(r => r.employee);
                    return {
                        filters: [
                            ['name', 'not in', existing_ids]
                        ]
                    };
                }
            }
        ],
        async function(values) {
            // values.new_employee là giá trị mà người dùng nhập
            try {
                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.change_member",
                    args: {
                        job_card: frm.doc.name,
                        employee: row.employee,
                        new_employee: values.new_employee
                    }
                });
                frappe.show_alert({ message: __('Đổi nhân viên thành công'), indicator: 'green' });
            } catch (err) {
                frappe.show_alert({ message: __('Đổi nhân viên thất bại'), indicator: 'red' });
            }
        },
        __('Đổi nhân viên'), // title của prompt
        __('OK')            // label nút primary
        );
    },

    pause_employee: async function(frm, row) {
        try {
            await frappe.call({
                method: "tahp.doc_events.job_card.job_card.pause_member",
                args: {
                    job_card: frm.doc.name,
                    employee: row.employee
                }
            });
            frappe.show_alert({ message:__('Đã cập nhật lại danh sách nhân viên'), indicator:'green'});
        } catch (err) {
            frappe.show_alert({ message:__('Cập nhật danh sách nhân viên thất bại'), indicator:'red'});
        }
    },

    update_configs: async function(frm, data, workstation) {
        if (!workstation) return;

        const updatedConfigs = data
            .filter(item => item.workstation === workstation)
            .filter(item => frm.doc.custom_config_table[item.config_key] !== item.config_value);

        if (updatedConfigs.length === 0) return;

        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.set_configs",
            args: {
                job_card: frm.doc.name,
                workstation: workstation,
                configs: updatedConfigs
            }
        });
    },

    edit_inputs: async function(frm, data) {
        if (!Array.isArray(data) || !data.length) return;
        const to_update = data.map(d => ({ ...d, is_meter: 0 }));
        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.set_inputs",
            args: { job_card: frm.doc.name, inputs: to_update }
        });
    },

    edit_inputs_meter: async function(frm, data) {
        if (!Array.isArray(data) || !data.length) return;

        for (let d of data) {
            if (d.meter_out !== undefined && d.meter !== undefined) {
                if (Number(d.meter) >= Number(d.meter_out)) {
                    frappe.msgprint("Số đo ban đầu phải thấp hơn số đo hiện tại");
                    frm.reload_doc();
                    return;
                }
            }
        }

        const to_update = data.map(d => ({ ...d, is_meter: 1 }));
        await frappe.call({
            method: "tahp.doc_events.job_card.job_card.set_inputs",
            args: { job_card: frm.doc.name, inputs: to_update }
        });
    },

    pause_workstation: async function(frm, workstation) {
        const response = await frappe.call({
            method: "tahp.tahp.doctype.downtime_reason.downtime_reason.get"
        });

        const groups = (response.message.group || []).filter(g => g.group_name);
        const items = response.message.items || [];

        const d = new frappe.ui.Dialog({
            title: `Chọn lý do dừng - ${workstation.workstation}`,
            fields: [
                {
                    fieldname: "group_name",
                    label: __("Chọn phân loại"),
                    fieldtype: "Select",
                    options: groups.map(g => g.group_name)
                },
                {
                    fieldname: "reason",
                    label: __("Lý do dừng"),
                    fieldtype: "Select",
                    options: [""],
                    in_place_edit: 1
                },
                {
                    fieldname: "other_reason_toggle",
                    label: __("Điền lý do khác"),
                    fieldtype: "Check",
                    default: 0
                },
                {
                    fieldname: "other_reason",
                    label: __("Nhập lý do khác"),
                    fieldtype: "Data",
                }
            ],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (!values) return;

                const selected_reason = values.other_reason_toggle ? values.other_reason : values.reason;
                if (!selected_reason) {
                    frappe.msgprint("Vui lòng chọn hoặc nhập lý do dừng");
                    return;
                }

                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.update_workstations",
                    args: {
                        job_card: frm.doc.name,
                        workstations: [{
                            workstation: workstation.workstation,
                            status: "Dừng",
                            reason: selected_reason,
                            group_name: values.group_name ? values.group_name : null
                        }]
                    }
                });

                d.hide();
            },
        });

        // === LOGIC CHÍNH ===
        const reason_field = d.get_field("reason");
        const group_field = d.get_field("group_name");
        const toggle_field = d.get_field("other_reason_toggle");
        const other_reason_field = d.get_field("other_reason");

        // Lọc danh sách theo operation
        let filtered = items.filter(i => i.operation === frm.doc.operation);
        if (filtered.length === 0) {
            filtered = items.filter(i => !i.operation || i.operation.trim() === "");
        } else {
            filtered = filtered.concat(items.filter(i => !i.operation || i.operation.trim() === ""));
        }

        if (filtered.length > 0) {
            // Cập nhật danh sách lý do ban đầu
            reason_field.df.options = filtered.map(i => i.reason).join("\n");
            reason_field.refresh();

            // Xác định default
            let default_item = filtered.find(i => i.operation === frm.doc.operation);
            if (!default_item) default_item = filtered[0];

            if (default_item.group_name) {
                group_field.set_value(default_item.group_name);
            }
            if (default_item.reason) {
                reason_field.set_value(default_item.reason);
            }
        } else {
            reason_field.wrapper.style.display = 'none';
            group_field.wrapper.style.display = 'none';
            toggle_field.set_value(1);
            toggle_field.refresh();
        }

        // --- Xử lý đổi group_name ---
        group_field.df.change = function () {
            const selected_group = d.get_value("group_name");
            if (!selected_group) return;

            let group_filtered = filtered.filter(i => i.group_name === selected_group);
            if (group_filtered.length === 0) {
                // Nếu không có reason nào thuộc group này thì ẩn field reason
                reason_field.wrapper.style.display = 'none';
                reason_field.set_value("");
                reason_field.refresh();
                return;
            }

            // Cập nhật danh sách reason cho group đã chọn
            reason_field.df.options = group_filtered.map(i => i.reason).join("\n");
            reason_field.refresh();

            // Gán default = reason đầu tiên
            reason_field.set_value(group_filtered[0].reason);
        };

        // Toggle cơ chế nhập lý do khác
        toggle_field.df.change = function () {
            const use_other = d.get_value("other_reason_toggle");
            if (use_other) {
                reason_field.wrapper.style.display = 'none';
                reason_field.refresh();
                other_reason_field.wrapper.style.display = '';
                other_reason_field.refresh();
            } else {
                if (!filtered.length) return;
                if (reason_field.wrapper.style.display == 'none') {
                    let exists = filtered.some(row => row.group_name == d.get_value("group_name"));
                    if (!exists) {
                        d.set_value("other_reason_toggle", 1)
                        other_reason_field.refresh();
                        return;
                    }
                }
                other_reason_field.wrapper.style.display = 'none';
                other_reason_field.refresh();
                reason_field.wrapper.style.display = '';
                reason_field.refresh();
            }
        };

        other_reason_field.df.change = function () {
            const other = d.get_value("other_reason");
            const reason = d.get_value("reason");
            if (reason && other) {
                reason_field.set_value("");
                reason_field.refresh();
            }
        };

        toggle_field.df.change();
        d.show();
    },

    select_pause_reason: function(frm, ws_list) {
        return new Promise(async (resolve) => {
            const response = await frappe.call({
                method: "tahp.tahp.doctype.downtime_reason.downtime_reason.get"
            });

            const groups = (response.message.group || []).filter(g => g.group_name);
            const items = response.message.items || [];

            const d = new frappe.ui.Dialog({
                title: `Chọn lý do dừng`,
                fields: [
                    {
                        fieldname: "group_name",
                        label: __("Chọn phân loại"),
                        fieldtype: "Select",
                        options: groups.map(g => g.group_name)
                    },
                    {
                        fieldname: "reason",
                        label: __("Lý do dừng"),
                        fieldtype: "Select",
                        options: [""],
                        in_place_edit: 1
                    },
                    {
                        fieldname: "other_reason_toggle",
                        label: __("Điền lý do khác"),
                        fieldtype: "Check",
                        default: 0
                    },
                    {
                        fieldname: "other_reason",
                        label: __("Nhập lý do khác"),
                        fieldtype: "Data",
                    }
                ],
                primary_action_label: "Xác nhận",
                primary_action: function() {
                    const values = d.get_values();
                    if (!values) return;

                    const selected_reason = values.other_reason_toggle ? values.other_reason : values.reason;
                    if (!selected_reason) {
                        frappe.msgprint("Vui lòng chọn hoặc nhập lý do dừng");
                        return;
                    }

                    d.hide();
                    resolve({
                        reason: selected_reason,
                        group_name: values.group_name || null
                    });
                },
            });

            // === LOGIC CHÍNH ===
            const reason_field = d.get_field("reason");
            const group_field = d.get_field("group_name");
            const toggle_field = d.get_field("other_reason_toggle");
            const other_reason_field = d.get_field("other_reason");

            // Lọc danh sách theo operation
            let filtered = items.filter(i => i.operation === frm.doc.operation);
            if (filtered.length === 0) {
                filtered = items.filter(i => !i.operation || i.operation.trim() === "");
            } else {
                filtered = filtered.concat(items.filter(i => !i.operation || i.operation.trim() === ""));
            }

            if (filtered.length > 0) {
                // Cập nhật danh sách lý do ban đầu
                reason_field.df.options = filtered.map(i => i.reason).join("\n");
                reason_field.refresh();

                // Xác định default
                let default_item = filtered.find(i => i.operation === frm.doc.operation);
                if (!default_item) default_item = filtered[0];

                if (default_item.group_name) {
                    group_field.set_value(default_item.group_name);
                }
                if (default_item.reason) {
                    reason_field.set_value(default_item.reason);
                }
            } else {
                reason_field.wrapper.style.display = 'none';
                group_field.wrapper.style.display = 'none';
                toggle_field.set_value(1);
                toggle_field.refresh();
            }

            // --- Xử lý đổi group_name ---
            group_field.df.change = function () {
                const selected_group = d.get_value("group_name");
                if (!selected_group) return;

                let group_filtered = filtered.filter(i => i.group_name === selected_group);
                if (group_filtered.length === 0) {
                    // Nếu không có reason nào thuộc group này thì ẩn field reason
                    reason_field.wrapper.style.display = 'none';
                    reason_field.set_value("");
                    reason_field.refresh();
                    return;
                }

                // Cập nhật danh sách reason cho group đã chọn
                reason_field.df.options = group_filtered.map(i => i.reason).join("\n");
                reason_field.refresh();

                // Gán default = reason đầu tiên
                reason_field.set_value(group_filtered[0].reason);
            };

            // Toggle cơ chế nhập lý do khác
            toggle_field.df.change = function () {
                const use_other = d.get_value("other_reason_toggle");
                if (use_other) {
                    reason_field.wrapper.style.display = 'none';
                    reason_field.refresh();
                    other_reason_field.wrapper.style.display = '';
                    other_reason_field.refresh();
                } else {
                    if (!filtered.length) return;
                    if (reason_field.wrapper.style.display == 'none') {
                        let exists = filtered.some(row => row.group_name == d.get_value("group_name"));
                        if (!exists) {
                            d.set_value("other_reason_toggle", 1)
                            other_reason_field.refresh();
                            return;
                        }
                    }
                    other_reason_field.wrapper.style.display = 'none';
                    other_reason_field.refresh();
                    reason_field.wrapper.style.display = '';
                    reason_field.refresh();
                }
            };

            other_reason_field.df.change = function () {
                const other = d.get_value("other_reason");
                const reason = d.get_value("reason");
                if (reason && other) {
                    reason_field.set_value("");
                    reason_field.refresh();
                }
            };

            toggle_field.df.change();
            d.show();
        });
    },

    problem_workstation: async function(frm, workstation) {
        const response = await frappe.call({
            method: "tahp.tahp.doctype.problem_reason.problem_reason.get"
        });

        const groups = (response.message.items || []).filter(
            g => !g.workstation || g.workstation === frm.doc.workstation
        );

        let default_group = null;
        if (groups.length) {
            const matched = groups.find(g => g.workstation === frm.doc.workstation);
            default_group = matched ? matched.group_name : groups[0].group_name;
        } else {
            default_group = "Hỏng máy";
        }

        const d = new frappe.ui.Dialog({
            title: `Báo cáo hỏng máy - ${workstation.workstation}`,
            fields: [
                {
                    fieldname: "group_name",
                    label: __("Chọn phân loại"),
                    fieldtype: "Select",
                    options: groups.length ? groups.map(g => g.group_name) : ["Hỏng máy"],
                    default: default_group
                },
                {
                    fieldname: "reason",
                    label: __("Mô tả sự cố"),
                    fieldtype: "Small Text",
                }
            ],
            primary_action_label: "Xác nhận",
            primary_action: async function() {
                const values = d.get_values();
                if (!values) return;

                if (!values.reason) {
                    frappe.msgprint("Vui lòng nhập mô tả sự cố");
                    return;
                }

                await frappe.call({
                    method: "tahp.doc_events.job_card.job_card.update_workstations",
                    args: {
                        job_card: frm.doc.name,
                        workstations: [{
                            workstation: workstation.workstation,
                            status: "Hỏng",
                            reason: values.reason,
                            group_name: values.group_name ? values.group_name : null
                        }]
                    }
                });

                d.hide();
            },
        });

        d.show();
    },
});


function scrollAndFocus(mobileInputs, index) {
    const $input = mobileInputs[index];
    const $row = $input.closest('.jc-tb-mobile-row');
    const isMobile = window.innerWidth <= 768;
    if (isMobile && $row.length) {
        $row[0].scrollIntoView({ behavior: 'smooth'});
    }
    $input.focus();

}

function covertAllData(data, inputs) {
    const newData = data.map((row, rowIndex) => {
        const newRow = { ...row };
        inputs.forEach($input => {
            if (Number($input.attr('data-rowindex')) === rowIndex) {
                const field = $input.attr('data-fieldname');
                const type = $input.attr('type');

                let val = $input.val();
                if (type === 'number') {
                    newRow[field] = val !== '' ? parseFloat(val) : 0;
                } else {
                    newRow[field] = val;
                }
            }
        });
        return newRow;
    });
    return newData;
}

function cleanerTable(dialog) {
    const $wrapper = dialog.$wrapper;

    // Header - cột cuối cùng
    const $headerLastCol = $wrapper.find('.grid-heading-row .data-row.row .grid-static-col').last();
    $headerLastCol.removeClass(function(index, className) {
        return (className.match(/col-xs-\d+/g) || []).join(' ');
    });

    // Body - từng row
    $wrapper.find('.grid-body .data-row.row').each(function() {
        const $lastCol = $(this).find('.grid-static-col').last();
        $lastCol.removeClass(function(index, className) {
            return (className.match(/col-xs-\d+/g) || []).join(' ');
        });
    });
}