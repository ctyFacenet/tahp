import frappe
from frappe import _
from collections import defaultdict
import json
import random
import hashlib
from datetime import datetime

@frappe.whitelist()
def get_multi_price_history(item_code, origins=None, suppliers=None, month=None, year=None):
	"""Get price history for an item for multiple suppliers (multi-line chart) with month/year filter"""
	if isinstance(origins, str):
		origins = json.loads(origins)
	if isinstance(suppliers, str):
		suppliers = json.loads(suppliers)

	filters = {
		"item_code": item_code,
		"is_manual_price": 1
	}
	if origins:
		filters["origin"] = ["in", origins]
	if suppliers:
		filters["supplier"] = ["in", suppliers]

	# Get all data
	history = frappe.get_all(
		"Supplier Item Rate",
		filters=filters,
		fields=["rate", "modified", "supplier", "origin"],
		order_by="modified asc"
	)

	# Filter by month/year if provided
	if month or year:
		filtered_history = []
		for row in history:
			date_obj = row['modified']
			if isinstance(date_obj, str):
				try:
					date_obj = datetime.strptime(date_obj.split()[0], '%Y-%m-%d')
				except:
					date_obj = frappe.utils.get_datetime(date_obj)
			
			if year and str(date_obj.year) != str(year):
				continue
			
			if month and str(date_obj.month) != str(month):
				continue
			
			filtered_history.append(row)
		history = filtered_history

	if not history:
		return {
			"labels": [],
			"datasets": []
		}

	# Group by supplier/origin
	group_map = defaultdict(list)
	all_dates = set()
	
	for row in history:
		date_val = row['modified']
		if isinstance(date_val, str):
			date_str = date_val.split()[0]
		else:
			date_str = date_val.strftime('%Y-%m-%d')
		
		key = f"{row['supplier']} ({row['origin'] or 'Không xác định'})"
		group_map[key].append({
			'date': date_str,
			'rate': row['rate']
		})
		all_dates.add(date_str)

	# Sort dates
	labels = sorted(list(all_dates))
	datasets = []
	
	def color_for_key(key):
		h = int(hashlib.md5(key.encode()).hexdigest(), 16)
		random.seed(h)
		return f"#{random.randint(0, 0xFFFFFF):06x}"

	for key, rows in group_map.items():
		data_map = {}
		for r in rows:
			data_map[r['date']] = r['rate']
		
		data = [data_map.get(date, None) for date in labels]
		
		datasets.append({
			"name": key,
			"values": data,
			"color": color_for_key(key)
		})

	return {
		"labels": labels,
		"datasets": datasets
	}


def format_currency(value):
	"""Format số kiểu tiền tệ (1,000)"""
	if value is None or value == "" or value == 0:
		return ""
	try:
		return f"{float(value):,.0f}"
	except Exception:
		return value


def get_group_color(item_group):
	"""Lấy màu cho nhóm mặt hàng từ bảng màu định sẵn"""
	
	# Bảng màu định nghĩa sẵn cho các nhóm cụ thể
	predefined_colors = {
		"Nguyên vật liệu chính": "#d4edda",  # Xanh lá nhạt
		"Vật tư thay thế": "#fff3cd",  # Vàng nhạt
		"Nguyên liệu chính": "#d4edda",  # Xanh lá nhạt
		"Bảo hộ lao động": "#e7f3ff",  # Xanh dương nhạt
		"Vật tư văn phòng": "#f8d7da",  # Đỏ nhạt
		"Thiết bị điện": "#ffeaa7",  # Vàng kem
		"Hóa chất": "#dfe6e9",  # Xám xanh nhạt
		"Dụng cụ cầm tay": "#c3e6cb",  # Xanh mint nhạt
		"Phụ tùng máy móc": "#d1ecf1",  # Xanh lơ nhạt
		"Vật tư xây dựng": "#f5c6cb",  # Hồng nhạt
		"Thiết bị an toàn": "#e2e3e5",  # Xám nhạt
		"TP - Sản phẩm P2O5": "#e7f3ff",
	}
	
	# Nếu nhóm có trong danh sách định nghĩa sẵn, dùng màu đó
	if item_group in predefined_colors:
		return predefined_colors[item_group]
	
	# Nếu không, dùng danh sách màu dự phòng
	fallback_colors = [
		"#d4edda", "#fff3cd", "#e7f3ff", "#f8d7da", "#e2e3e5",
		"#d1ecf1", "#f5c6cb", "#c3e6cb", "#ffeaa7", "#dfe6e9",
		"#ffd6e7", "#d5f4e6", "#fff9db", "#e8daef", "#fadbd8",
		"#d6eaf8", "#f9e79f", "#d5dbdb", "#aed6f1", "#f8c471",
		"#d7bde2", "#a9dfbf", "#f6ddcc", "#abebc6", "#fadbd8",
		"#e8f8f5", "#fef5e7", "#ebf5fb", "#fdeaea", "#eaeded"
	]
	
	# Hash tên nhóm để chọn màu cố định từ danh sách dự phòng
	hash_value = int(hashlib.md5(item_group.encode()).hexdigest(), 16)
	color_index = hash_value % len(fallback_colors)
	
	return fallback_colors[color_index]


@frappe.whitelist()
def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{ 
			"label": _("Mã mặt hàng"),
			"fieldname": "item_code",
			"fieldtype": "Link",
			"options": "Item",
			"width": 250,
			"show_title": 0,
		},
		{
			"label": _("Tên mặt hàng"),
			"fieldname": "item_name",
			"fieldtype": "Data",
			"width": 250,
			"hidden": 1
		},
		{
			"label": _("Nhóm mặt hàng"),
			"fieldname": "item_group",
			"fieldtype": "Data",  # Đổi sang Data để hiển thị HTML
			"width": 250
		},
		{
			"label": _("Nhà cung cấp"),
			"fieldname": "supplier",
			"fieldtype": "Link",
			"options": "Supplier",
			"width": 150
		},
		{
			"label": _("Xuất xứ"),
			"fieldname": "origin",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Đơn giá bình quân"),
			"fieldname": "avg_rate",
			"fieldtype": "Data",
			"align": "right",
			"width": 160
		},
		{
			"label": _("Ngày cập nhật"),
			"fieldname": "avg_date",
			"fieldtype": "Date",
			"width": 140
		},
		{
			"label": _("Đơn giá cũ"),
			"fieldname": "old_rate",
			"fieldtype": "Data",
			"width": 170
		},
		{
			"label": _("Đơn giá gần đây"),
			"fieldname": "recent_rate_display",
			"fieldtype": "Data",
			"width": 200
		},
		{
			"label": _("Ngày cập nhật"),
			"fieldname": "recent_date",
			"fieldtype": "Date",
			"width": 140
		},
		{
			"label": _("Đơn giá đơn hàng gần nhất"),
			"fieldname": "last_order_rate",
			"fieldtype": "Data",
			"width": 200
		},
		{
			"label": _("Ngày đơn hàng"),
			"fieldname": "last_order_date",
			"fieldtype": "Date",
			"width": 140
		},
		{
			"label": "",
			"fieldname": "ui",
			"fieldtype": "Data",
			"width": 100,
			"align": "center",
		}
	]


def get_data(filters):
	# Lấy dữ liệu từ Supplier Item Rate (giá tự khai)
	manual_prices = frappe.get_all(
		"Supplier Item Rate",
		filters={"is_manual_price": 1},
		fields=[
			"supplier",
			"item_code",
			"item_name",
			"item_group",
			"origin",
			"rate",
			"modified"
		],
		order_by="item_code, supplier, origin, modified desc"
	)

	# Lấy dữ liệu từ Purchase Order custom_detail child table
	purchase_orders = []
	try:
		po_meta = frappe.get_meta("Purchase Order")
		child_table_name = None
		
		for field in po_meta.fields:
			if field.fieldname == "custom_detail" and field.fieldtype == "Table":
				child_table_name = field.options
				break
		
		if child_table_name:
			table_exists = frappe.db.sql(f"""
				SELECT COUNT(*) as count 
				FROM information_schema.tables 
				WHERE table_schema = DATABASE() 
				AND table_name = 'tab{child_table_name}'
			""", as_dict=1)
			
			if table_exists and table_exists[0].get('count', 0) > 0:
				purchase_orders = frappe.db.sql(f"""
					SELECT 
						cd.item_code,
						cd.item_name,
						cd.origin,
						cd.rate,
						cd.qty,
						CASE 
							WHEN cd.qty > 0 THEN cd.rate / cd.qty
							ELSE cd.rate
						END as unit_rate,
						po.supplier,
						po.transaction_date,
						po.docstatus
					FROM `tab{child_table_name}` cd
					INNER JOIN `tabPurchase Order` po ON cd.parent = po.name
					INNER JOIN (
						SELECT 
							cd2.item_code,
							po2.supplier,
							COALESCE(cd2.origin, 'Không xác định') as origin,
							MAX(po2.transaction_date) as max_date
						FROM `tab{child_table_name}` cd2
						INNER JOIN `tabPurchase Order` po2 ON cd2.parent = po2.name
						WHERE po2.docstatus = 1
						GROUP BY cd2.item_code, po2.supplier, COALESCE(cd2.origin, 'Không xác định')
					) latest ON 
						cd.item_code = latest.item_code 
						AND po.supplier = latest.supplier 
						AND COALESCE(cd.origin, 'Không xác định') = latest.origin
						AND po.transaction_date = latest.max_date
					WHERE po.docstatus = 1
					ORDER BY po.transaction_date DESC
				""", as_dict=1)
	except Exception as e:
		frappe.log_error(f"Error getting purchase orders: {str(e)}", "Price Update Report")

	# Tạo cấu trúc dữ liệu
	structured_data = build_structured_data(manual_prices)
	purchase_order_map = build_purchase_order_map(purchase_orders)

	# Chuyển đổi sang dữ liệu report
	data = []
	
	for item_code in sorted(structured_data.keys()):
		item_data = structured_data[item_code]
		first_item_row = True
		
		for supplier in sorted(item_data.keys()):
			supplier_data = item_data[supplier]
			first_supplier_row = True
			
			for origin in sorted(supplier_data.keys()):
				prices = supplier_data[origin]
				
				# Tính toán các giá trị
				avg_rate = calculate_average_rate(prices)
				recent_rate, recent_date = get_most_recent_price(prices)
				old_rate, old_date = get_second_most_recent_price(prices)
				old_rate_display = format_currency(old_rate)
				avg_rate_display = format_currency(avg_rate)
				
				# Lấy giá đơn hàng gần nhất
				last_order_rate, last_order_date = get_last_purchase_order_price(
					purchase_order_map, item_code, supplier, origin
				)
				
				# Tạo HTML cho đơn giá gần đây với % thay đổi và nút sửa
				recent_rate_html = format_recent_rate_with_change(
					recent_rate, old_rate, item_code, supplier, origin
				)
				
				# Chỉ tạo nút UI cho hàng đầu tiên của mỗi item_code
				ui_buttons = format_ui_buttons(item_code) if first_item_row else ""
				
				# Tạo HTML cho nhóm mặt hàng với màu nền
				item_group = prices[0][3]
				if first_item_row:
					bg_color = get_group_color(item_group)
					# Tạo link có thể click với màu nền
					item_group_html = f'''<a href="/app/item-group/{item_group}" 
						style="background-color: {bg_color}; padding: 6px 12px; border-radius: 4px; 
						display: block; font-weight: 500; text-decoration: none; color: inherit; 
						width: 100%; box-sizing: border-box;">{item_group}</a>'''
				else:
					item_group_html = ""
				
				row = {
					"item_code": item_code if first_item_row else "",
					"item_name": prices[0][2] if first_item_row else "",
					"item_group": item_group_html,
					"supplier": supplier if first_supplier_row else "",
					"origin": origin,
					"avg_rate": avg_rate_display,
					"avg_date": recent_date,
					"old_rate": old_rate_display,
					"recent_rate_display": recent_rate_html,
					"recent_date": recent_date,
					"last_order_rate": last_order_rate,
					"last_order_date": last_order_date,
					"ui": ui_buttons,
					"indent": 0 if first_item_row else 1
				}
				
				data.append(row)
				first_item_row = False
				first_supplier_row = False
	
	return data


def build_structured_data(manual_prices):
	"""Build data structure by item_code -> supplier -> origin"""
	structured_data = {}
	
	for entry in manual_prices:
		item_code = entry["item_code"]
		supplier = entry["supplier"]
		origin = entry["origin"] or "Không xác định"
		
		if item_code not in structured_data:
			structured_data[item_code] = {}
		
		if supplier not in structured_data[item_code]:
			structured_data[item_code][supplier] = {}
		
		if origin not in structured_data[item_code][supplier]:
			structured_data[item_code][supplier][origin] = []
		
		structured_data[item_code][supplier][origin].append((
			entry["rate"],
			entry["modified"],
			entry["item_name"],
			entry["item_group"]
		))
	
	return structured_data


def build_purchase_order_map(purchase_orders):
	"""Xây dựng map cho đơn hàng gần nhất theo item_code, supplier và origin"""
	po_map = {}
	
	for po in purchase_orders:
		origin = po.get("origin") or "Không xác định"
		key = (po["item_code"], po["supplier"], origin)
		
		unit_rate = po.get("unit_rate", po.get("rate", 0))
		transaction_date = po["transaction_date"]
		
		if key not in po_map:
			po_map[key] = (unit_rate, transaction_date)
	
	return po_map


def calculate_average_rate(prices):
	"""Calculate average price"""
	if not prices:
		return 0
	total = sum(price[0] for price in prices)
	return total / len(prices)


def get_most_recent_price(prices):
	"""Get most recent price"""
	if not prices:
		return 0, None
	return prices[0][0], prices[0][1]


def get_second_most_recent_price(prices):
	"""Get second most recent price"""
	if len(prices) < 2:
		return 0, None
	return prices[1][0], prices[1][1]


def format_recent_rate_with_change(recent_rate, old_rate, item_code, supplier, origin):
	"""Format recent price with % change and edit button"""
	if not recent_rate:
		return ""
	
	item_code_safe = str(item_code).replace("'", "\\'")
	supplier_safe = str(supplier).replace("'", "\\'")
	origin_safe = str(origin).replace("'", "\\'")
	
	change_html = ""
	if old_rate and old_rate > 0:
		change_percent = ((recent_rate - old_rate) / old_rate) * 100
		if change_percent > 0:
			change_html = f'<span style="color: green; margin-left: 8px; font-weight: 600;">↑ {change_percent:.1f}%</span>'
		elif change_percent < 0:
			change_html = f'<span style="color: red; margin-left: 8px; font-weight: 600;">↓ {abs(change_percent):.1f}%</span>'
	
	edit_button = f'''
		<button class="btn btn-xs btn-default" 
			onclick="window.edit_price('{item_code_safe}', '{supplier_safe}', '{origin_safe}', {recent_rate})"
			style="margin-left: auto; padding: 2px 8px; float: right;"
			title="Sửa giá">
			<i class="fa fa-pencil"></i>
		</button>
	'''
	
	formatted_rate = f"{recent_rate:,.0f}"

	return (
		f'<div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">'
		f'<div style="display: flex; align-items: center;">{formatted_rate}{change_html}</div>'
		f'{edit_button}'
		f'</div>'
	)


def format_ui_buttons(item_code):
	"""Format add and chart buttons (only for item_code)"""
	item_code_safe = str(item_code).replace("'", "\\'")
	
	add_button = f'''
		<button class="btn btn-xs btn-success" 
			onclick="window.add_new_price('{item_code_safe}')"
			style="margin-right: 8px; padding: 4px 10px;"
			title="Thêm giá mới">
			<i class="fa fa-plus"></i>
		</button>
	'''
	
	chart_button = f'''
		<button class="btn btn-xs btn-info" 
			onclick="window.show_price_chart('{item_code_safe}')"
			style="padding: 4px 10px;"
			title="Xem biểu đồ">
			<i class="fa fa-line-chart"></i>
		</button>
	'''
	
	return f'<div style="display: flex; align-items: center; gap: 4px;">{add_button}{chart_button}</div>'


def get_last_purchase_order_price(po_map, item_code, supplier, origin):
	"""Get latest purchase order price (match origin)"""
	origin_normalized = origin if origin != "Không xác định" else None
	origin_key = origin_normalized or "Không xác định"
	
	key = (item_code, supplier, origin_key)
	if key in po_map:
		rate, date = po_map[key]
		return format_currency(rate), date
	return None, None


@frappe.whitelist()
def create_supplier_item_rate(supplier, item_code, rate, origin=None):
	"""Create new price record for supplier"""
	item = frappe.get_doc("Item", item_code)
	
	doc = frappe.new_doc("Supplier Item Rate")
	doc.supplier = supplier
	doc.item_code = item_code
	doc.item_name = item.item_name
	doc.item_group = item.item_group
	doc.origin = origin
	doc.rate = rate
	doc.is_manual_price = 1
	doc.save()
	frappe.db.commit()
	
	return doc.name


@frappe.whitelist()
def update_supplier_item_rate(item_code, supplier, origin, rate):
	"""Update new price for supplier (create new record)"""
	return create_supplier_item_rate(supplier, item_code, rate, origin)


@frappe.whitelist()
def get_price_history(item_code, supplier, origin=None):
	"""Get price history for an item from supplier"""
	filters = {
		"item_code": item_code,
		"supplier": supplier,
		"is_manual_price": 1
	}
	
	if origin:
		filters["origin"] = origin
	
	history = frappe.get_all(
		"Supplier Item Rate",
		filters=filters,
		fields=["rate", "modified as date"],
		order_by="modified asc"
	)
	
	return history


@frappe.whitelist()
def get_all_item_groups():
	"""Lấy tất cả nhóm mặt hàng đang dùng để config màu"""
	groups = frappe.db.sql("""
		SELECT DISTINCT item_group 
		FROM `tabSupplier Item Rate` 
		WHERE is_manual_price = 1 
		AND item_group IS NOT NULL
		ORDER BY item_group
	""", as_dict=1)
	
	# Danh sách màu đẹp
	colors = [
		"#d4edda", "#fff3cd", "#e7f3ff", "#f8d7da", "#e2e3e5",
		"#d1ecf1", "#f5c6cb", "#c3e6cb", "#ffeaa7", "#dfe6e9",
		"#ffd6e7", "#d5f4e6", "#fff9db", "#e8daef", "#fadbd8",
		"#d6eaf8", "#f9e79f", "#d5dbdb", "#aed6f1", "#f8c471",
	]
	
	result = {}
	for i, group in enumerate(groups):
		group_name = group['item_group']
		color = colors[i % len(colors)]
		result[group_name] = color
		print(f'"{group_name}": "{color}",')
	
	return result