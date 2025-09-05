frappe.provide("frappe.listviews");

frappe.listviews['Week Work Order'] = class CustomWWOListView extends frappe.views.ListView {
    render() {
        // Fetch all rows as usual
        super.render();

        // Group rows by "customer"
        let grouped = {};
        this.data.forEach(row => {
            if (!grouped[row.plan]) {
                grouped[row.plan] = [];
            }
            grouped[row.plan].push(row);
        });

        // Clear original list
        this.$result.empty();

        // Render grouped rows
        for (let plan in grouped) {
            this.$result.append(`<h4 style="margin-top:20px;">${plan}</h4>`);
            grouped[plan].forEach(row => {
                let row_html = this.row_renderer(row);
                this.$result.append(row_html);
            });
        }
    }
};