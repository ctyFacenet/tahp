frappe.query_reports["BOM Custom Search"] = {
    filters: [
        {"fieldname": "week_work_order", "label": "Week Work Order", "fieldtype": "Data","hidden": 1},
        {"fieldname": "item_code", "label": "Item", "fieldtype": "Data","hidden": 1},
    ],
    onload: async function(report) {
        injectDatatableCSS();
        report.page.set_title("Tìm kiếm BOM");
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
            frappe.custom_utils_dynamic_filters(report, res.message, () => waitForDataTableReady(() => merge_columns()));
        }

        // Override refresh
        const original_refresh = report.refresh;
        report.refresh = function() {
            original_refresh.apply(this, arguments);
            waitForDataTableReady(() => {
                merge_columns();
                setTimeout(() => {
                    $('.dt-row.vrow').last().find('.dt-cell__content')
                        .css('border-bottom', '1px solid #dcdcdc');
                }, 0);
                selectBOM(report)
            });
        };

        // Load filter columns  


        report.page.add_inner_button(__('Tạo BOM mới'), function() {
            frappe.new_doc('BOM', {
                item: report.get_filter_value('item')
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
                    <button class="btn btn-light btn-xs select-bom" data-bom="${data.bom_name}" data-item="${data.item_code}" style="font-size: 17px">Chọn</button>
                </div>`;
    },

    get_datatable_options(options) {
        return { ...options, cellHeight: 50 };
    }
};

// ----------------------- Utility Functions -----------------------

function injectDatatableCSS() {
    $(".dt-row.dt-row-header").css({"pointer-events":"none"})
    if ($('#custom-dt-style').length) return;
    const style = document.createElement('style');
    style.id = 'custom-dt-style';
    style.innerHTML = `
        .dt-row-header .dt-cell__content { padding-inline: 0 !important; }
        .dt-scrollable .dt-cell__content { display: flex !important; align-items: center; justify-content: center; word-break: break-word; white-space: normal; text-overflow: ellipsis; overflow: hidden;padding-block:0px;}
        .dt-scrollable .dt-cell--col-6 .dt-cell__content {
            align-items: flex-start;
        }
        .dt-scrollable .dt-cell--col-4 .dt-cell__content {
            justify-content: flex-start;
        }
    `;
    document.head.appendChild(style);
}

function waitForDataTableReady(callback) {
    const observer = new MutationObserver((mutations, obs) => {
        if ($('.dt-header').length && $('.dt-row-header').length) {
            obs.disconnect();
            callback();
        }
    });
    observer.observe(document.querySelector('.report-wrapper') || document.body, { childList: true, subtree: true });
}

function merge_columns() {
    const dtHeader = $('.dt-header');
    dtHeader.css('width', 'fit-content');
    dtHeader.find('.dt-row-header-clone, .dt-row-filter').remove();
    $('.report-footer').hide();

    const dtRowHeader = $('.dt-row-header');
    dtRowHeader.find('.dt-cell__content').addClass('text-center font-weight-bold');

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