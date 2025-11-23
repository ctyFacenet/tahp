frappe.pages["tracking-production"].on_page_load = function (wrapper) {
    const today = frappe.datetime.get_today().split("-");
    const months = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
    this.refreshTimeout = null;
    
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Theo dõi chu trình sản xuất",
        single_column: true
    });

    page.status = page.add_field({
        fieldname: "status",
        label: "Hiển thị",
        fieldtype: "Select",
        options: "Tất cả\nChậm tiến độ",
        default: "Tất cả",
        change: () => this.refresh_dashboard(page)
    });

    page.week_filter = page.add_field({
        fieldname: "week_filter",
        label: "Tuần",
        fieldtype: "Select",
        options: get_weeks(parseInt(today[1]), parseInt(today[0])),
        default: "Cả tháng",
        change: () => {
            this.refresh_dashboard(page);
        }
    });

    page.month = page.add_field({
        fieldname: "month",
        label: "Tháng",
        fieldtype: "Select",
        options: months,
        default: `Tháng ${today[1]}`,
        change: () => {
            update_week_list(page);
            this.refresh_dashboard(page);
        }
    });

    page.year = page.add_field({
        fieldname: "year",
        label: "Năm",
        fieldtype: "Int",
        default: parseInt(today[0]),
        change: () => {
            update_week_list(page);
            this.refresh_dashboard(page);
        }
    });

    this.main_wrapper = $(`<div class="main-content"></div>`).appendTo(page.main)
    const rootDiv = page.wrapper[0].page.wrapper[0];
    $(rootDiv).find('.layout-main-section-wrapper').each(function() {
        this.style.setProperty('padding', '0px', 'important');
    })
    $(rootDiv).find('.page-form').each(function() {
        this.style.setProperty('border-bottom', 'none', 'important');
    });

	this.component = new tahp.ui.TrackingProductionComponent({
        wrapper: this.main_wrapper,
        page: this,
    })

    const me = this;
    page.add_button("Làm mới", () => me.component.vm.loadData());
    
    this.refresh_dashboard = async() => {
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(async () => {
            const { from_date, to_date } = calculate_date_range(page);
            this.custom_filter =  {
                year: page.year.get_value(),
                month: page.month.get_value(),
                week: page.week_filter.get_value(),
                from_date: from_date,
                to_date: to_date,
                status: page.status.get_value()
            }

            this.refreshTimeout = null;
            me.component.vm.loadData()
        }, 150)
    }

    this.render_deadline_dialog = async() => {
        const rules = await frappe.xcall("tahp.tahp.page.tracking_production.tracking_production.get_deadline")

        const fields = [
            {
                label: "Kế hoạch sản xuất phải tạo kế hoạch vào lúc?",
                fieldname: "first_step",
                fieldtype: "Time",
                default: rules.first_step
            },
            {
                label: "PTCN phải điền xong BOM vào lúc?",
                fieldname: "second_step",
                fieldtype: "Time",
                default: rules.second_step
            },
            {
                label: "Kế hoạch sản xuất phải gửi cho Giám đốc vào lúc?",
                fieldname: "third_step",
                fieldtype: "Time",
                default: rules.third_step
            },
            {
                label: "Giám đốc phải duyệt vào lúc?",
                fieldname: "fourth_step",
                fieldtype: "Time",
                default: rules.fourth_step
            },
            {
                label: "Quản đốc phải tạo LSX Ca vào lúc?",
                fieldname: "fifth_step",
                fieldtype: "Time",
                default: rules.fifth_step
            },
            {
                label: "Trưởng ca phải xác nhận các lệnh ca vào lúc?",
                fieldname: "sixth_step",
                fieldtype: "Time",
                default: rules.sixth_step
            },
            {
                label: "Quản đốc phải duyệt lệnh trước khi vào ca bao nhiêu phút?",
                fieldname: "seventh_step",
                fieldtype: "Int",
                default: rules.seventh_step
            },
            {
                label: "Trưởng ca không được bắt đầu ca muộn quá bao nhiêu phút?",
                fieldname: "eighth_step",
                fieldtype: "Int",
                default: rules.eighth_step
            },
            {
                label: "Sau khi ca kết thúc, trưởng ca phải xác nhận sản lượng trong vòng bao nhiêu phút?",
                fieldname: "ninth_step",
                fieldtype: "Int",
                default: rules.ninth_step
            },
            {
                label: "Sau khi ca kết thúc, KCS phải xác nhận lại thành phẩm trong vòng bao nhiêu phút?",
                fieldname: "tenth_step",
                fieldtype: "Int",
                default: rules.tenth_step
            },
        ];
     
        const dialog = new frappe.ui.Dialog({
            size: "small",
            title: "Cài đặt deadline",
            fields: fields,
            primary_action_label: "Lưu",
            primary_action: async function (values) {
                await frappe.xcall("tahp.tahp.page.tracking_production.tracking_production.save_deadline", {values: values})
                dialog.hide();
                me.component.vm.loadData()
            }
        });

        dialog.show();       
    }

    this.render_warning_dialog = async () => {
        const warning_minute = await frappe.xcall("tahp.tahp.page.tracking_production.tracking_production.get_warning");

        const dialog = new frappe.ui.Dialog({
            title: "Cài đặt đánh giá thời gian",
            size: "small",
            fields: [
                {
                    label: "Đánh dấu công việc là `Chậm nghiêm trọng` khi nó bị muộn quá bao nhiêu phút?",
                    fieldname: "warning_minute",
                    fieldtype: "Int",
                    default: warning_minute
                }
            ],
            primary_action_label: "Lưu",
            primary_action: async function(values) {
                await frappe.xcall("tahp.tahp.page.tracking_production.tracking_production.set_warning", {
                    warning_minute: values.warning_minute
                });
                dialog.hide();
                me.component.vm.loadData()
            }
        });

        dialog.show();
    }

    page.add_button("Cài đặt deadline", () => me.render_deadline_dialog());
    page.add_button("Cài đặt đánh giá thời gian", () => me.render_warning_dialog());

};

function get_weeks(month, year) {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);

    let weeks = ["Cả tháng"];
    let w = 1;

    let cur = new Date(first);
    const dow = cur.getDay();

    if (dow !== 1) {
        const shift = dow === 0 ? 1 : 8 - dow;
        cur.setDate(cur.getDate() + shift);
    }

    if (cur > first) {
        const partialEnd = new Date(cur);
        partialEnd.setDate(partialEnd.getDate() - 1);

        weeks.push(`Tuần ${w} (Ngày ${first.getDate()} - Ngày ${partialEnd.getDate()})`);
        w++;
    }

    while (cur <= last) {
        let end = new Date(cur);
        end.setDate(cur.getDate() + 6);

        if (end > last) end = last;

        weeks.push(`Tuần ${w} (Ngày ${cur.getDate()} - Ngày ${end.getDate()})`);
        w++;

        cur.setDate(cur.getDate() + 7);
    }

    return weeks.join("\n");
}

function update_week_list(page) {
    const monthNum = parseInt(page.month.get_value().replace("Tháng ", ""));
    const year = page.year.get_value();

    page.week_filter.df.options = get_weeks(monthNum, year);
    page.week_filter.refresh();
    page.week_filter.set_value("Cả tháng");
}

function calculate_date_range(page) {
    const monthNum = parseInt(page.month.get_value().replace("Tháng ", ""));
    const year = page.year.get_value();
    const value = page.week_filter.get_value();

    let from_date, to_date;

    if (!value || value === "Cả tháng") {
        const start = new Date(year, monthNum - 1, 1);
        const end = new Date(year, monthNum, 0);

        from_date = frappe.datetime.obj_to_str(start);
        to_date = frappe.datetime.obj_to_str(end);
    } else {
        const match = value.match(/Ngày (\d+) - Ngày (\d+)/);
        if (match) {
            const start = new Date(year, monthNum - 1, parseInt(match[1]));
            const end = new Date(year, monthNum - 1, parseInt(match[2]));

            from_date = frappe.datetime.obj_to_str(start);
            to_date = frappe.datetime.obj_to_str(end);
        } else {
            // Fallback nếu không match được pattern
            const start = new Date(year, monthNum - 1, 1);
            const end = new Date(year, monthNum, 0);

            from_date = frappe.datetime.obj_to_str(start);
            to_date = frappe.datetime.obj_to_str(end);
        }
    }

    return { from_date, to_date };
}