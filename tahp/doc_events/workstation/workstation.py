import frappe

@frappe.whitelist()
def get_workstation_details(input=None):
    """
    API trả về danh sách workstation hoặc chi tiết theo tên.
    - input=None hoặc 'workspace-dashboard' => list tất cả.
    - input='<workstation_name>' => trả về chi tiết 1 máy.
    """
    workstations = frappe.db.get_all(
        "Workstation",
        fields=["name", "workstation_name", "status"]
    )

    data_workstation = []
    for ws in workstations:
        data_workstation.append({
            "name": ws.name or "KEODAI1",
            "workstation_name": ws.workstation_name or "Máy kéo đại 1",
            "status": ws.status or "Đang chạy",

            # Thông số kỹ thuật
            "temperature_motor": 47,
            "temperature_oil": 45,
            "temperature_nhu_tuong": 45.5,
            "temperature_ui": 46,

            # Hiệu suất
            "availability": 90,
            "stop_time": "03:39:03",
            "running_time": "04:21:57",
            "planned_time": "08:00:00",

            # Lệnh sản xuất
            "work_order": "WO_EIAIW050_A_25.3",
            "operation": "Kéo đại",
            "item_code": "EIAIW050_A_25",
            "qty_plan": 100,
            "qty_actual": 50,
            "qty_ok": 38,
            "qty_ng": 12,
            "scrap_rate": 11.4,

            # Ngưỡng cảnh báo
            "temperature_oil_standard_min": 40,
            "temperature_oil_standard_max": 60,

            # Nguyên nhân dừng máy
            "reason_stop_men": 140,
            "reason_stop_fan": 120,
            "reason_stop_bobbin": 30,
        })

    # Nếu input là None hoặc 'workspace-dashboard' => trả toàn bộ
    if input is None or input == "workspace-dashboard":
        return data_workstation

    # Nếu input là tên cụ thể => tìm workstation đó
    for d in data_workstation:
        if d["workstation_name"] == input or d["name"] == input:
            return [d]

    # Nếu không tìm thấy
    return []
