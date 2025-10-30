import os
import shutil
from frappe.utils.backups import backup
from frappe.utils import now_datetime
import frappe

@frappe.whitelist()
def cron_backup():
    result = backup(with_files=True)

    db_backup_path = result.get("backup_path_db")
    if not db_backup_path or not os.path.exists(db_backup_path):
        frappe.throw("Không tìm thấy file database backup.")

    backup_dir = os.path.dirname(os.path.abspath(db_backup_path))
    timestamp = os.path.basename(db_backup_path).split('-')[0]

    for f in os.listdir(backup_dir):
        if f.startswith(timestamp) and f.endswith("-site_config_backup.json"):
            result["backup_path_site_config"] = os.path.join(backup_dir, f)
            break

    folder_name = now_datetime().strftime("%d.%m.%y_%H.%M.%S")

    base_dir = frappe.get_site_path("private", "daily_backups")
    target_dir = os.path.join(base_dir, folder_name)
    os.makedirs(target_dir, exist_ok=True)

    moved_files = []

    for key, path in result.items():
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            dest_path = os.path.join(target_dir, os.path.basename(path))
            shutil.move(abs_path, dest_path)
            moved_files.append(dest_path)
