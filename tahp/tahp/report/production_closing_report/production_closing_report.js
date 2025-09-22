// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Production Closing Report"] = {
    "filters": [
        {
            "fieldname": "from_date",
            "label": __("Từ ngày"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "to_date",
            "label": __("Đến ngày"),
            "fieldtype": "Date"            
        },
        {
            "fieldname": "ca",
            "label": __("Ca"),
            "fieldtype": "Link",
            "options": "Shift",
        }
    ],

    onload: function(report) {
        /**
         * @file This report implements custom refresh logic for its date filters.
         *
         * @description
         * The goal is to prevent the default auto-refresh behavior when a new date is *selected*,
         * as it conflicts with other logic and causes a UI flicker (double refresh).
         * Instead, we only want to trigger a refresh when a date filter is **CLEARED**
         * (i.e., changed from having a value to being empty).
         *
         * @approach
         * 1. An object `previous_values` stores the last known value of each date filter.
         * 2. A 'change' event listener is attached to each date filter's input.
         * 3. When the event fires, the handler compares the input's new value with the stored old value.
         * 4. A manual `report.refresh()` is called ONLY IF the old value existed and the new value is empty.
         * 5. Finally, the stored value is updated to the new value to prepare for the next change.
         */

        // 1. Store the initial/previous values of the filters in an object for easy access.
        let previous_values = {
            from_date: report.get_filter_value("from_date"),
            to_date: report.get_filter_value("to_date")
        };

        // 2. Create a single, reusable handler for date changes.
        const on_date_cleared_handler = (fieldname) => {
            const new_value = report.page.fields_dict[fieldname].get_value();
            const old_value = previous_values[fieldname];

            // 3. Core Logic: Trigger refresh only if the field was cleared.
            if (old_value && !new_value) {
                report.refresh();
            }

            // 4. Update the stored value to the new value for the next event.
            previous_values[fieldname] = new_value;
        };

        // 5. Attach the custom handler to both date filter inputs.
        report.page.fields_dict.from_date.$input.on('change', () => on_date_cleared_handler("from_date"));
        report.page.fields_dict.to_date.$input.on('change', () => on_date_cleared_handler("to_date"));
    }
};
