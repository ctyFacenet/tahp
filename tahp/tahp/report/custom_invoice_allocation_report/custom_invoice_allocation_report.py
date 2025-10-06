import frappe

def execute(filters=None):
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Ngày tạo phiếu", "fieldname": "posting_date", "fieldtype": "Date", "width": 120},
		{"label": "Mã phiếu", "fieldname": "stock_entry", "fieldtype": "Link", "options": "Stock Entry", "width": 150},
		{"label": "Mã mặt hàng", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 300},
		{"label": "Mô tả", "fieldname": "description", "fieldtype": "Data", "width": 200},
		{"label": "Đơn vị", "fieldname": "stock_uom", "fieldtype": "Data", "width": 80},
		{"label": "SL nhập", "fieldname": "in_qty", "fieldtype": "Float", "width": 100, "precision": 2},
		{"label": "SL xuất", "fieldname": "out_qty", "fieldtype": "Float", "width": 100, "precision": 2},
		{"label": "SL đã gửi kế toán", "fieldname": "custom_approved_qty", "fieldtype": "Float", "width": 100 ,"precision": 2},
	]


def get_data(filters):
	conditions = []
	params = {}

	conditions.append("sed.item_code != 'RM000000'")

	if filters.get("from_date"):
		conditions.append("se.posting_date >= %(from_date)s")
		params["from_date"] = filters["from_date"]

	if filters.get("to_date"):
		conditions.append("se.posting_date <= %(to_date)s")
		params["to_date"] = filters["to_date"]

	if filters.get("item_code"):
		conditions.append("sed.item_code = %(item_code)s")
		params["item_code"] = filters["item_code"]

	if filters.get("stock_entry"):
		conditions.append("sed.parent = %(stock_entry)s")
		params["stock_entry"] = filters["stock_entry"]

	where_clause = " AND ".join(conditions)
	if where_clause:
		where_clause = "WHERE " + where_clause

	query = f"""
		SELECT
			se.posting_date,
			sed.parent AS stock_entry,
			sed.item_code,
			sed.item_name,
			sed.description,
			sed.stock_uom,
			CASE WHEN sed.t_warehouse IS NOT NULL THEN sed.qty ELSE 0 END AS in_qty,
			CASE WHEN sed.s_warehouse IS NOT NULL THEN sed.qty ELSE 0 END AS out_qty,
			sed.custom_approved_qty
		FROM
			`tabStock Entry Detail` sed
		JOIN
			`tabStock Entry` se ON se.name = sed.parent
		{where_clause}
		ORDER BY se.posting_date DESC, sed.parent DESC
	"""

	return frappe.db.sql(query, params, as_dict=True)
