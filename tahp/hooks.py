app_name = "tahp"
app_title = "Tahp"
app_publisher = "FaceNet"
app_description = "FaceNet FISM"
app_email = "contact@facenet.vn"
app_license = "mit"

# Apps
# ------------------

fixtures = [
    {"doctype": "Role", "filters": [["is_custom", "=", 1]]},
    {"doctype": "Workflow"},
    {"doctype": "Workflow State"},
    {"doctype": "Workflow Action"},
    {"doctype": "Workspace"},
    {"doctype": "Website Settings"},
    {"doctype": "System Settings"}
]

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "tahp",
# 		"logo": "/assets/tahp/logo.png",
# 		"title": "Tahp",
# 		"route": "/tahp",
# 		"has_permission": "tahp.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = [
    "/assets/tahp/css/desk.css",
    "/assets/tahp/scss/login.bundle.scss",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css",
    "/assets/tahp/css/menu.css",
    "/assets/tahp/css/theme.css",
    "/assets/tahp/css/custom_workspace.css",
    "/assets/tahp/css/bom_custom.css",
    "/assets/tahp/css/custom_confirm.css"


]
# app_include_js = "/assets/tahp/js/tahp.js"
app_include_js = [
    "my_desk.bundle.js",
    "/assets/tahp/js/menu/router.js",
    "/assets/tahp/js/menu/page.js",
    # "/assets/tahp/js/menu/workspace.js",
    "/assets/tahp/js/theme.js",
    "/assets/tahp/js/custom_logout_redirect.js",
    "/assets/tahp/js/custom_confirm.js",
    # "/assets/tahp/js/tahp/form/controls/datepicker_i18n.js",
    # "/assets/tahp/js/tahp/form/controls/date.js",
    "/assets/tahp/js/customize_form/fast_export.js",
    "/assets/tahp/js/item/item.js",
    "/assets/tahp/js/stock_entry/stock_entry.js",
    "/assets/tahp/js/operation/operation.js",
    "/assets/tahp/js/routing/routing.js",
    "/assets/tahp/js/bom/bom.js",
    "/assets/tahp/js/work_order/work_order.js",
    "/assets/tahp/js/custom_utils/primary_action.js",
    "/assets/tahp/js/custom_utils/checkbox_toggle.js",
]

# include js, css files in header of web template
# web_include_css = "/assets/tahp/css/tahp.css"
web_include_css = [
    "/assets/tahp/css/web.css",
]
# web_include_js = "/assets/tahp/js/tahp.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "tahp/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}


# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}
doctype_list_js = {
    "Workstation": ["public/js/workstation/workstation_list.js"],
    "BOM": ["public/js/bom/bom_custom_list.js"]
}

# doctype_js = {
#     "ToDo": [
#         "public/js/to_do.js",
#         "public/js/to_do_2.js"
#     ]
# }

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "tahp/public/images/tahp.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "modern-menu"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "tahp.utils.jinja_methods",
# 	"filters": "tahp.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "tahp.install.before_install"
# after_install = "tahp.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "tahp.uninstall.before_uninstall"
# after_uninstall = "tahp.uninstall.after_uninstall"

after_install = "tahp.setup.setup_website"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "tahp.utils.before_app_install"
# after_app_install = "tahp.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "tahp.utils.before_app_uninstall"
# after_app_uninstall = "tahp.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "tahp.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	 "BOM": "tahp.overrides.bom_list_override.CustomBOM"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

doc_events = {
    "Quality Inspection Template": {
        "before_save": [
            "tahp.doc_events.quality_inspection_template.before_save.before_save"
        ]
    },
    "Stock Entry": {
        "after_insert": [
            "tahp.doc_events.stock_entry.after_insert.after_insert"
        ],
    },
    "Operation": {
        "before_save": [
            "tahp.doc_events.operation.before_save.before_save"
        ]
    }
}

# doc_events = {
#     "ToDo": {
#         "validate": [
#             "tahp.logic_hooks.validate_note",
#             "tahp.logic_hooks_2.validate_note"
#         ]
#     }
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"tahp.tasks.all"
# 	],
# 	"daily": [
# 		"tahp.tasks.daily"
# 	],
# 	"hourly": [
# 		"tahp.tasks.hourly"
# 	],
# 	"weekly": [
# 		"tahp.tasks.weekly"
# 	],
# 	"monthly": [
# 		"tahp.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "tahp.install.before_tests"

# Overriding Methods
# ------------------------------
#
override_whitelisted_methods = {
	 "frappe.core.doctype.user.user.switch_theme": "tahp.overrides.switch_theme.switch_theme",
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "tahp.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["tahp.utils.before_request"]
# after_request = ["tahp.utils.after_request"]

# Job Events
# ----------
# before_job = ["tahp.utils.before_job"]
# after_job = ["tahp.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"tahp.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

