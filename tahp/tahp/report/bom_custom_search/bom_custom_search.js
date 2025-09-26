frappe.query_reports["BOM Custom Search"] = {
    filters: [
        {"fieldname": "week_work_order", "label": "Week Work Order", "fieldtype": "Data","hidden": 1},
        {"fieldname": "item_code", "label": "Item", "fieldtype": "Data","hidden": 1},
    ],
    onload: async function(report) {
        report.page.set_title("Tìm kiếm BOM");
        injectDatatableCSS(report);

        const res = await frappe.call('tahp.tahp.report.bom_custom_search.bom_custom_search.get_filter_columns');
        if (res?.message) {
            res.message.forEach(f => {
                if (f.fieldname === 'week_work_order') {
                    f.default = report.get_filter_value('week_work_order');
                }
                if (f.fieldname === 'item_code') {
                    f.default = report.get_filter_value('item_code');
                }
            });
            frappe.custom_utils_dynamic_filters(report, res.message, () => waitForDataTableReady(report, () => merge_columns(report)));
        }

        // Override refresh
        const original_refresh = report.refresh;
        report.refresh = function() {
            original_refresh.apply(this, arguments);
            waitForDataTableReady(report, () => {
                merge_columns(report);
                setTimeout(() => {
                    report.page.wrapper.find('.dt-row.vrow').last().find('.dt-cell__content')
                        .css('border-bottom', '1px solid #dcdcdc');
                }, 0);
                selectBOM(report);
            });
        };

        report.page.add_inner_button(__('Tạo BOM mới'), function() {
            frappe.new_doc('BOM', {
                item: report.get_filter_value('item_code')
            })
            
            frappe.ui.form.on('BOM', {
                onload: function(frm) {
                    frm.clear_table('items');
                    frm.refresh_field('items');
                }
            });
        }).addClass('btn-primary');
    },

    formatter: function(value, row, column, data, default_formatter) {
        if (column.fieldname !== "bom_name") return default_formatter(value, row, column, data);

        const base = default_formatter(value, row, column, data);
        return `<div class="d-flex justify-content-between align-items-center w-100 px-2">
                    ${base}
                    <button class="btn btn-light btn-xs select-bom" data-bom="${data.bom_name}" data-item="${data.item_code}" style="font-size: 15px;white-space:nowrap;">Chọn</button>
                </div>`;
    },

    get_datatable_options(options) {
        return { ...options, freezeIndex: 2};
    }
};

function injectDatatableCSS(report) {
    if (report.page.title != "Tìm kiếm BOM") return;
    const wrapper = report.page.wrapper;
    wrapper.find(".dt-row.dt-row-header").css({"pointer-events":"none"});
    if ($('#custom-dt-style').length) return;
    
    const style = document.createElement('style');
    style.id = 'custom-dt-style';
    style.innerHTML = `
        #${wrapper.attr("id")} .dt-scrollable .dt-cell--col-6 .dt-cell__content { align-items: flex-start; }
        #${wrapper.attr("id")} .dt-scrollable .dt-cell--col-3 .dt-cell__content { align-items: flex-start; }
        #${wrapper.attr("id")} .dt-scrollable .dt-cell--col-4 .dt-cell__content { justify-content: flex-start; }
        #${wrapper.attr("id")} .dt-cell.dt-cell--header .dt-cell__content {
            white-space: normal !important;
            word-break: break-word !important;
            overflow: visible !important;
            text-overflow: unset !important;
        }
        #${wrapper.attr("id")} .dt-cell--col-2 .dt-cell__content a {
            flex: 0 0 75%;
            max-width: 75%;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        #${wrapper.attr("id")} .dt-cell--col-2 .dt-cell__content button {
            flex: 0 0 25%;
            max-width: 25%;
            text-align: center;
            white-space: nowrap;
        }
    `;

    // append trực tiếp vào wrapper thay vì head
    wrapper.append(style);
}


function waitForDataTableReady(report, callback) {
    const wrapper = report.page.wrapper[0];
    const observer = new MutationObserver((mutations, obs) => {
        if (report.page.wrapper.find('.dt-header').length && report.page.wrapper.find('.dt-row-header').length) {
            obs.disconnect();
            callback();
        }
    });
    observer.observe(wrapper.querySelector('.report-wrapper') || wrapper, { childList: true, subtree: true });
}

function merge_columns(report) {
    const wrapper = report.page.wrapper;
    const dtHeader = wrapper.find('.dt-header');
    dtHeader.css('width', 'fit-content');
    dtHeader.find('.dt-row-header-clone, .dt-row-filter').remove();
    wrapper.find('.report-footer').hide();

    const dtRowHeader = wrapper.find('.dt-row-header');
    const newRow = dtRowHeader.clone().addClass('dt-row-header-clone');

    const groups = { in: [], out: [] };
    newRow.find('.dt-cell__content').each(function() {
        const $cell = $(this);
        const title = ($cell.attr('title') || '').trim();
        if (title.endsWith('(in)')) groups.in.push($cell);
        else if (title.endsWith('(out)')) groups.out.push($cell);
        else { $cell.empty(); $cell.removeAttr('title'); }
    });

    mergeGroup(groups.in, '#d0f0c0', 'Chỉ số đầu vào');
    mergeGroup(groups.out, '#bde6db', 'Chỉ số đầu ra');

    // Clean up original titles
    dtRowHeader.find('.dt-cell__content').each(function() {
        const $cell = $(this);
        const title = ($cell.attr('title') || '').trim();
        if (title.endsWith('(in)') || title.endsWith('(out)')) {
            const text = title.replace(/\s*\((in|out)\)$/, '');
            $cell.text(text).attr('title', text);
        }
    });

    dtRowHeader.before(newRow);
    dtRowHeader.find('.dt-dropdown, .dt-cell__resize-handle').remove();
}

function mergeGroup(cells, color, label) {
    if (!cells.length) return;
    const totalWidth = cells.reduce((sum, c) => sum + parseInt($(c).css('width')), 0);
    const first = cells[0];
    first.css({ width: totalWidth + 2 + 'px', 'background-color': color, 'text-align': 'center' }).text(label);

    for (let i = 1; i < cells.length; i++) {
        const $cell = cells[i], $parent = $cell.closest('.dt-cell');
        $parent.css({ width: '0px', padding: 0, margin: 0, border: 'none' });
        $cell.remove();
    }
}

function selectBOM(report) {
    report.page.wrapper.off('click', '.select-bom').on('click', '.select-bom', async e => {
        const bomName = e.currentTarget.dataset.bom;
        const itemCode = e.currentTarget.dataset.item;
        try {
            const docname = report.get_filter_value('week_work_order');
            if (!docname) return frappe.show_alert({ message: 'Không xác định được LSX', indicator: 'red' });
            const weekDoc = await frappe.db.get_doc('Week Work Order', docname);
            const row = (weekDoc.items || []).find(r => r.item === itemCode);
            if (!row) return frappe.show_alert({ message: `Không tìm thấy dòng mặt hàng ${itemCode} trong LSX`, indicator: 'orange' });

            await frappe.db.set_value(row.doctype, row.name, 'bom', bomName);
            frappe.set_route('Form', 'Week Work Order', docname);
        } catch (err) {
            frappe.show_alert({ message: 'Không thể tải LSX', indicator: 'red' });
            console.error(err);
        }
    });
}
