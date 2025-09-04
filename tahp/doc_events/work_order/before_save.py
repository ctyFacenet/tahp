import frappe

def before_save(doc, method):
    flag = False
    for row in doc.operations:
        if not row.workstation or row.workstation == None:
            flag = True
            break

    print(flag)

    if flag:
        frappe.throw("Vui lòng điền đủ cụm thiết bị/ thiết bị cho công đoạn")