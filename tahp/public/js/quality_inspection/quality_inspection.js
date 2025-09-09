frappe.ui.form.on("Quality Inspection", {
    // Trạng thái của phiếu QC sẽ được tính toán và gán ngay trước khi form được lưu.
    before_save: function(frm) {
        set_qc_status(frm);
    }
});

function set_qc_status(frm) {
    if (!frm.doc.custom_conditions) {
        console.log("conditions field is empty. Cannot set status.");
        return;
    }

    console.log("Checking conditions:", frm.doc.custom_conditions);

    // Chỉ tích chọn manual_inspection khi điều kiện là "Chỉ cần một thông số đạt"
    if (frm.doc.custom_conditions === "Chỉ cần một thông số đạt") {
        frm.set_value("manual_inspection", true);
    } else {
        // Tùy chọn: Đặt lại giá trị nếu không phải điều kiện mong muốn
        frm.set_value("manual_inspection", false);
    }

    let all_readings_pass = true;
    let any_reading_pass = false;
    let has_readings = false;

    for (let row of frm.doc.readings) {
        has_readings = true;
        
        console.log("Child Row ID:", row.name, "Status:", row.status);

        if (row.status === "Rejected") {
            all_readings_pass = false;
        }
        if (row.status === "Accepted") {
            any_reading_pass = true;
        }
    }

    if (!has_readings) {
        frm.set_value("status", "Pending");
        console.log("No readings found. Status set to Pending.");
        return;
    }

    if (frm.doc.custom_conditions === "Toàn bộ thông số đạt") {
        if (all_readings_pass) {
            frm.set_value("status", "Accepted");
            console.log("All readings passed. Status set to Accepted.");
        } else {
            frm.set_value("status", "Rejected");
            console.log("Not all readings passed. Status set to Rejected.");
        }
    } else if (frm.doc.custom_conditions === "Chỉ cần một thông số đạt") {
        if (any_reading_pass) {
            frm.set_value("status", "Accepted");
            console.log("At least one reading passed. Status set to Accepted.");
        } else {
            frm.set_value("status", "Rejected");
            console.log("No reading passed. Status set to Rejected.");
        }
    }
}