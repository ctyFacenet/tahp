import DataTable from "frappe-datatable";

class CustomDataTable extends DataTable {
    render() {
        super.render();
        this.bodyScrollable.addEventListener("scroll", (e) => {
            if (this._settingHeaderPosition) return;

            this._settingHeaderPosition = true;

            requestAnimationFrame(() => {
                const left = -e.target.scrollLeft;

                // xử lý header = translateX
                for (let i = 0; i < 4; i++) {
                    const headers = this.getColumnHeaderElement(i);
                    headers.each(function (index, elm) {
                        elm.style.transform = `translateX(${-left}px)`;
                        elm.style.zIndex = "20";
                        elm.style.background = "#fff";
                    });
                }

                this._settingHeaderPosition = false;
            });
        });

        // xử lý body = sticky
        this.applyStickyColumns(4);
    }

    applyStickyColumns(count) {
        let offset = 0;

        for (let i = 0; i < count; i++) {
            const cells = this.get_body_scroll_fixed(i);

            cells.each((_, elm) => {
                elm.style.position = "sticky";
                elm.style.left = `${offset}px`;
                elm.style.zIndex = "10";
                elm.style.background = "#fff";

                // nếu là cột cuối trong nhóm freeze thì thêm border-right
                if (i === count - 1) {
                    elm.style.borderRight = "1px solid #ccc";
                }
            });

            const sample = cells[0];
            const colWidth = sample?.offsetWidth || 100;
            offset += colWidth;
        }
    }

    getColumnHeaderElement(colIndex) {
        colIndex = +colIndex;
        if (colIndex < 0) return null;
        return $(`.dt-cell--col-${colIndex}`, this.header);
    }

    get_body_scroll_fixed(colIndex) {
        colIndex = +colIndex;
        if (colIndex < 0) return null;
        return $(`.dt-cell--col-${colIndex}`, this.bodyScrollable);
    }
}



frappe.provide("frappe.widget.utils");
frappe.provide("frappe.views");
frappe.provide("frappe.query_reports");
frappe.provide("frappe.views.QueryReport");
const orignal_quert_report = frappe.views.QueryReport.prototype;


frappe.views.QueryReport = class QueryReport extends frappe.views.QueryReport {
    render_datatable() {
        let data = this.data;
        let columns = this.columns.filter((col) => !col.hidden);

        if (this.raw_data.add_total_row && !this.report_settings.tree) {
            data = data.slice();
            data.splice(-1, 1);
        }

        this.$report.show();
        if (
            this.datatable &&
            this.datatable.options &&
            this.datatable.options.showTotalRow === this.raw_data.add_total_row
        ) {
            this.datatable.options.treeView = this.tree_report;
            this.datatable.refresh(data, columns);
        } else {
            let datatable_options = {
                columns: columns,
                data: data,
                inlineFilters: true,
                language: frappe.boot.lang,
                translations: frappe.utils.datatable.get_translations(),
                treeView: this.tree_report,
                layout: "fixed",
                cellHeight: 33,
                showTotalRow: this.raw_data.add_total_row && !this.report_settings.tree,
                direction: frappe.utils.is_rtl() ? "rtl" : "ltr",
                hooks: {
                    columnTotal: frappe.utils.report_column_total,
                },
                freezeColumns: 4
            };

            if (this.report_settings.get_datatable_options) {
                datatable_options = this.report_settings.get_datatable_options(datatable_options);
            }

            if (this.page_name == "query-report/BOM Custom Search") {
                const isDesktop = window.innerWidth >= 768; // ngưỡng tùy chỉnh

                if (isDesktop) {
                    this.datatable = new CustomDataTable(this.$report[0], datatable_options);
                } else {
                    this.datatable = new DataTable(this.$report[0], datatable_options);
                }
            } else {
                this.datatable = new DataTable(this.$report[0], datatable_options);
            }
        }

        if (typeof this.report_settings.initial_depth == "number") {
            this.datatable.rowmanager.setTreeDepth(this.report_settings.initial_depth);
        }
        if (this.report_settings.after_datatable_render) {
            this.report_settings.after_datatable_render(this.datatable);
        }
    }
}