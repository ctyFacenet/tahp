frappe.provide("tahp.pms.utils")

tahp.pms.utils.BudgetWrapper = class {
    constructor(
        frm,
        fieldname,
        purpose_fieldname,
        amount_fieldname,
        update_actual = false,
        update_planned = true
    ) {
        this.frm = frm
        this.fieldname = fieldname
        this.purpose_fieldname = purpose_fieldname
        this.amount_fieldname = amount_fieldname
        this.update_actual = update_actual
        this.update_planned = update_planned
        this.table = null
    }

    async refresh() {
        const field = this.frm.get_field(this.fieldname)
        if (!field || !field.$wrapper) return

        if (!this.table) {
            this.make_table(field.$wrapper)
        }

        setTimeout(async () => {
            this.table.df.data = await this.get_data()
            this.table.refresh()
            this.check_negative()
        }, 100)
    }

    check_negative() {
        if (!this.table || !this.table.grid) return
        const fields_to_check = []
        if (this.update_planned) fields_to_check.push("total_planned_amount")
        if (this.update_actual) fields_to_check.push("total_actual_amount")
        let has_negative = false
        this.table.grid.grid_rows.forEach(grid_row => {
            fields_to_check.forEach(fieldname => {
                const value = Number(grid_row.doc[fieldname] || 0)
                const cell = grid_row.row.find(`[data-fieldname="${fieldname}"]`)
                if (value <= 0) {
                    has_negative = true
                    cell.css({
                        color: "#c53030",
                        "background-color": "#fff5f5",
                    })
                } else {
                    cell.css({
                        color: "",
                        "background-color": "",
                    })
                }
            })
        })
        this.warning_el.css("display", has_negative ? "block" : "none")
    }


    async get_data() {
        const purposes = this.frm.doc.items.map(
            row => row[this.purpose_fieldname]
        )

        let res = await frappe.xcall(
            "tahp.pms.doc_events.utils.get_budget_from_purpose",
            { purposes }
        )

        let budgets = res.map(row => {
            const budget = row.budget

            let item = {
                budget: budget.name,
                cost_center: budget.cost_center,
                account: budget.account,
                purpose: row.purpose,
            }

            if (this.update_planned) {
                item.total_planned_amount =
                    Number(budget.initial_budget || 0)
                    + Number(budget.increased_amount || 0)
                    - Number(budget.planned_amount || 0)
                    - Number(budget.actual_amount || 0)
            }

            if (this.update_actual) {
                item.total_actual_amount =
                    Number(budget.initial_budget || 0)
                    + Number(budget.increased_amount || 0)
                    - Number(budget.actual_amount || 0)
            }

            return item
        })

        // Trừ theo items
        this.frm.doc.items.forEach(row => {
            let adjust_amount = row[this.amount_fieldname]
            budgets.forEach(budget => {
                if (budget.purpose !== row[this.purpose_fieldname]) return

                if (this.update_planned) {
                    budget.total_planned_amount =
                        Number(budget.total_planned_amount || 0)
                        - adjust_amount
                }

                if (this.update_actual) {
                    budget.total_actual_amount =
                        Number(budget.total_actual_amount || 0)
                        - adjust_amount
                }
            })
        })

        return budgets
    }

    make_table(wrapper) {
        wrapper.empty()

        this.warning_el = $(`
            <div class="alert alert-warning" style="display:none; margin-bottom:10px">
                <strong>⚠ Cảnh báo ngân sách:</strong>
                Có ngân sách đã hết hoặc vượt mức cho phép.
            </div>
        `)

        wrapper.append(this.warning_el)

        this.table = new frappe.ui.form.ControlTable({
            parent: wrapper,
            df: {
                fieldname: `${this.fieldname}_budget_preview`,
                label: __("Thông tin ngân sách"),
                read_only: 1,
                fields: this.get_fields(),
                data: [],
                get_data: () => this.table.df.data,
                cannot_add_rows: 1,
                cannot_delete_rows: 1,
                in_place_edit: 0,
            },
        })

        this.table.make()
    }

    get_fields() {
        let fields = [
            {
                fieldtype: "Link",
                fieldname: "budget",
                label: __("Mã ngân sách"),
                options: "Budget",
                in_list_view: 1,
                columns: 2,
                read_only: 1,
            },
            {
                fieldtype: "Link",
                fieldname: "account",
                label: __("Tài khoản chi tiêu"),
                options: "Account",
                in_list_view: 1,
                columns: 2,
                read_only: 1,
            },
            {
                fieldtype: "Link",
                fieldname: "cost_center",
                label: __("Phòng ban quản lý chi tiêu"),
                options: "Cost Center",
                in_list_view: 1,
                columns: 2,
                read_only: 1,
            },
        ]

        if (this.update_planned) {
            fields.push({
                fieldtype: "Currency",
                fieldname: "total_planned_amount",
                label: __("Ngân sách còn lại dự kiến"),
                in_list_view: 1,
                columns: this.update_actual ? 2 : 4,
                read_only: 1,
                bold: 1
            })
        }

        if (this.update_actual) {
            fields.push({
                fieldtype: "Currency",
                fieldname: "total_actual_amount",
                label: __("Ngân sách còn lại thực tế"),
                in_list_view: 1,
                columns: this.update_planned ? 2 : 4,
                read_only: 1,
                bold: 1
            })
        }

        return fields
    }
}
