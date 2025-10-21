import frappe

def execute(filters=None):
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Ngày tạo phiếu", "fieldname": "posting_date", "fieldtype": "Date", "width": 120},
		{"label": "Mã phiếu", "fieldname": "stock_entry", "fieldtype": "Data", "options": "Stock Entry", "width": 150},
		{"label": "Mã mặt hàng", "fieldname": "item_code", "fieldtype": "Data", "options": "Item", "width": 150},
		{"label": "Tên mặt hàng", "fieldname": "item_name", "fieldtype": "Data", "width": 250},
		{"label": "Mô tả", "fieldname": "description", "fieldtype": "Data", "width": 200},
		{"label": "Đơn vị", "fieldname": "stock_uom", "fieldtype": "Data", "width": 80},
		{"label": "SL nhập", "fieldname": "in_qty", "fieldtype": "Float", "width": 150, "precision": 2},
		{"label": "SL xuất", "fieldname": "out_qty", "fieldtype": "Float", "width": 150, "precision": 2},
		{"label": "SL đã có hóa đơn", "fieldname": "custom_approved_qty", "fieldtype": "Float", "width": 160 ,"precision": 2},
	]


def get_data(filters):
	# 1️⃣ Lấy danh sách nhóm con cần bỏ qua (những nhóm có cha chứa "sản phẩm")
	item_groups_to_exclude = frappe.get_all(
		"Item Group",
		filters={"parent_item_group": ["like", "%sản phẩm%"]},
		pluck="name"
	)

	# 2️⃣ Lấy danh sách item thuộc các nhóm đó
	items_to_exclude = frappe.get_all(
		"Item",
		filters={"item_group": ["in", item_groups_to_exclude]},
		pluck="name"
	)

	# 3️⃣ Điều kiện lọc cơ bản
	base_filters = {
		"docstatus": 1  # chỉ lấy chứng từ đã Submit (tuỳ ý)
	}

	if filters.get("stock_entry"):
		base_filters["name"] = filters["stock_entry"]

	if filters.get("from_date") or filters.get("to_date"):
		date_filter = []
		if filters.get("from_date"):
			date_filter.append([">=", filters["from_date"]])
		if filters.get("to_date"):
			date_filter.append(["<=", filters["to_date"]])
		base_filters["posting_date"] = date_filter

	# 4️⃣ Lấy danh sách phiếu kho (Stock Entry)
	stock_entries = frappe.get_all(
		"Stock Entry",
		filters=base_filters,
		fields=["name", "posting_date"]
	)

	if not stock_entries:
		return []

	stock_entry_names = [se.name for se in stock_entries]

	# 5️⃣ Lọc chi tiết Stock Entry Detail
	sed_filters = {
		"parent": ["in", stock_entry_names],
		"item_code": ["not in", ["RM000000", "TP00001"]]
	}

	if filters.get("item_code"):
		sed_filters["item_code"] = filters["item_code"]

	if items_to_exclude:
		sed_filters["item_code"] = ["not in", items_to_exclude]

	sed_rows = frappe.get_all(
		"Stock Entry Detail",
		filters=sed_filters,
		fields=[
			"parent as stock_entry",
			"item_code",
			"item_name",
			"description",
			"stock_uom",
			"qty",
			"t_warehouse",
			"s_warehouse",
			"custom_approved_qty"
		],
		order_by="creation desc"
	)

	# 6️⃣ Bổ sung ngày chứng từ từ bảng Stock Entry
	se_map = {se.name: se.posting_date for se in stock_entries}
	for row in sed_rows:
		row["posting_date"] = se_map.get(row["stock_entry"])
		row["in_qty"] = row["qty"] if row["t_warehouse"] else 0
		row["out_qty"] = row["qty"] if row["s_warehouse"] else 0
		# 💡 Thêm màu nền (Frappe sẽ tự dùng _background khi render)
		if row.get("custom_approved_qty") == 0:
			row["_background"] = ""
		elif row.get("custom_approved_qty") == row.get("qty"):
			row["_background"] = "#a0ffa0"  # xanh lá nhạt
		elif (row.get("custom_approved_qty") or 0) < (row.get("qty") or 0):
			row["_background"] = "#ffe796"  # vàng nhạt (kiểu warning)

	return sed_rows