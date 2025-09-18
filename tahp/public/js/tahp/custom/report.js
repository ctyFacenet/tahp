import DataTable from "frappe-datatable";

export default class CustomDataTable extends DataTable {
    // render() {
    //     super.render();
    // }
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

        this.applyStickyColumns(4);
    }

    // freezeRightColumn() {
    //     // Xóa event listener cũ nếu có
    //     if (this.scrollSyncHandler) {
    //         this.bodyScrollable.removeEventListener('scroll', this.scrollSyncHandler);
    //     }
    //     if (this.stickyObserver) {
    //         this.stickyObserver.disconnect();
    //     }

    //     const colIndex = this.datamanager.columns.length - 1;

    //     // Cache DOM header và body cells
    //     const headerCell = this.wrapper.querySelector(`.dt-header .dt-cell--col-${colIndex}`);
    //     const filterCell = this.wrapper.querySelector(`.dt-row-filter .dt-cell--col-${colIndex}`);
    //     const bodyCells = this.wrapper.querySelectorAll(`.dt-row .dt-cell--col-${colIndex}`);

    //     const applySticky = (el, zIndex = 5) => {
    //         if (!el) return;
    //         el.style.position = 'sticky';
    //         el.style.right = '0px';
    //         el.style.zIndex = zIndex;
    //         el.style.background = '#fff';
    //     };

    //     // Header, filter, body
    //     applySticky(headerCell, 20);
    //     applySticky(filterCell, 15);
    //     bodyCells.forEach(cell => applySticky(cell, 5));

    //     // Function để sync transform
    //     const syncTransform = (scrollLeft = null) => {
    //         const currentScrollLeft = scrollLeft !== null ? scrollLeft : (this.bodyScrollable.scrollLeft || 0);
    //         const currentHeaderCell = this.wrapper.querySelector(`.dt-header .dt-cell--col-${this.datamanager.columns.length - 1}`);
    //         const currentFilterCell = this.wrapper.querySelector(`.dt-row-filter .dt-cell--col-${this.datamanager.columns.length - 1}`);
            
    //         [currentHeaderCell, currentFilterCell].forEach(el => {
    //             if (el) {
    //                 // Force reset transform để tránh accumulate
    //                 el.style.transform = '';
    //                 el.style.transform = `translateX(${currentScrollLeft}px)`;
    //             }
    //         });
    //     };

    //     // Đồng bộ scroll position ban đầu
    //     syncTransform();

    //     // Tạo scroll handler
    //     this.scrollSyncHandler = (e) => {
    //         const scrollLeft = e.target.scrollLeft;
    //         syncTransform(scrollLeft);
    //     };

    //     // MutationObserver để theo dõi thay đổi DOM
    //     this.stickyObserver = new MutationObserver((mutations) => {
    //         let shouldSync = false;
            
    //         mutations.forEach((mutation) => {
    //             // Kiểm tra nếu có thay đổi về attributes hoặc childList
    //             if (mutation.type === 'attributes' || mutation.type === 'childList') {
    //                 // Kiểm tra nếu có liên quan đến sticky column
    //                 const target = mutation.target;
    //                 if (target.classList && target.classList.contains(`dt-cell--col-${this.datamanager.columns.length - 1}`)) {
    //                     shouldSync = true;
    //                 }
    //                 // Hoặc nếu có thay đổi trong header/filter
    //                 if (target.closest('.dt-header') || target.closest('.dt-row-filter')) {
    //                     shouldSync = true;
    //                 }
    //             }
    //         });

    //         if (shouldSync) {
    //             // Delay nhỏ để đảm bảo DOM đã stable
    //             requestAnimationFrame(() => {
    //                 syncTransform();
    //             });
    //         }
    //     });

    //     // Observe changes trên wrapper
    //     this.stickyObserver.observe(this.wrapper, {
    //         childList: true,
    //         subtree: true,
    //         attributes: true,
    //         attributeFilter: ['style', 'class']
    //     });

    //     // Gắn event listener mới
    //     this.bodyScrollable.addEventListener('scroll', this.scrollSyncHandler);
    // }

    // Thêm method để cleanup khi cần
    cleanupStickyColumn() {
        if (this.scrollSyncHandler) {
            this.bodyScrollable.removeEventListener('scroll', this.scrollSyncHandler);
            this.scrollSyncHandler = null;
        }
        if (this.stickyObserver) {
            this.stickyObserver.disconnect();
            this.stickyObserver = null;
        }
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