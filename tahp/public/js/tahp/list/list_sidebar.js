// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt
import ListFilter from "./list_filter";
frappe.provide("frappe.views");

// opts:
// stats = list of fields
// doctype
// parent

frappe.views.ListSidebar = class ListSidebar {
	constructor(opts) {
		$.extend(this, opts);
		this.make();
	}

	async get_pages() {
		let pages = await frappe.xcall("frappe.desk.desktop.get_workspace_sidebar_items")
		let response = await frappe.call("tahp.utils.get_workspace.get_workspace")
		console.log(response)
		return pages;
	}

	async make() {
		var sidebar_content = frappe.render_template("list_sidebar", { doctype: this.doctype });

		this.sidebar = $('<div class="list-sidebar overlay-sidebar hidden-xs hidden-sm"></div>')
			// .html(sidebar_content)
			.appendTo(this.page.sidebar.empty());

		this.sidebar_pages = !this.discard ? await this.get_pages() : this.sidebar_pages;
		this.all_pages = this.sidebar_pages.pages;
		this.all_pages.forEach((page) => {
			page.is_editable = !page.public || this.has_access;
		});
		this.public_pages = this.all_pages.filter((page) => page.public);
		this.private_pages = this.all_pages.filter((page) => !page.public);
		this.sidebar_categories = [
			{ id: "Personal", label: __("Personal", null, "Workspace Category") },
			{ id: "Public", label: __("Public", null, "Workspace Category") },
		];
		this.sidebar_items = {
			public: {},
			private: {},
		};
		this.current_page = {};
		this.indicator_colors = [
			"green",
			"cyan",
			"blue",
			"orange",
			"yellow",
			"gray",
			"grey",
			"red",
			"pink",
			"darkgrey",
			"purple",
			"light-blue",
		];
		if (this.all_pages) {
			frappe.workspaces = {};
			for (let page of this.all_pages) {
				frappe.workspaces[frappe.router.slug(page.name)] = {
					title: page.title,
					public: page.public,
				};
			}
			this.make_sidebar();
		}

		// this.setup_list_filter();
		// this.setup_list_group_by();

		// do not remove
		// used to trigger custom scripts
		$(document).trigger("list_sidebar_setup");

		// if (
		// 	this.list_view.list_view_settings &&
		// 	this.list_view.list_view_settings.disable_sidebar_stats
		// ) {
		// 	this.sidebar.find(".list-tags").remove();
		// } else {
		// 	this.sidebar.find(".list-stats").on("show.bs.dropdown", (e) => {
		// 		this.reload_stats();
		// 	});
		// }

		// if (frappe.user.has_role("System Manager")) {
		// 	this.add_insights_banner();
		// 	this.add_crm_banner();
		// 	this.add_helpdesk_banner();
		// }
	}

	// prepare_sidebar(items, child_container, item_container) {
	// 	items.forEach((item) => this.append_item(item, child_container));
	// 	child_container.appendTo(item_container);
	// }
	remove_sidebar_skeleton() {
		this.sidebar.removeClass("hidden");
		$(".workspace-sidebar-skeleton").remove();
	}

	make_sidebar() {
		if (this.sidebar.find(".standard-sidebar-section")[0]) {
			this.sidebar.find(".standard-sidebar-section").remove();
		}

		this.sidebar_categories.forEach((category) => {
			let root_pages = this.public_pages.filter(
				(page) => page.parent_page == "" || page.parent_page == null
			);
			if (category.id != "Public") {
				root_pages = this.private_pages.filter(
					(page) => page.parent_page == "" || page.parent_page == null
				);
			}
			root_pages = root_pages.uniqBy((d) => d.title);
			this.build_sidebar_section(category, root_pages);
		});

		// Scroll sidebar to selected page if it is not in viewport.
		this.sidebar.find(".selected").length &&
			!frappe.dom.is_element_in_viewport(this.sidebar.find(".selected")) &&
			this.sidebar.find(".selected")[0].scrollIntoView();

		this.remove_sidebar_skeleton();
	}

	build_sidebar_section(category, root_pages) {
		let sidebar_section = $(
			`<div class="standard-sidebar-section nested-container" data-title="${category.id}"></div>`
		);

		let $title = $(`<button class="btn-reset standard-sidebar-label">
			<span>${frappe.utils.icon("es-line-down", "xs")}</span>
			<span class="section-title">${category.label}<span>
		</div>`).appendTo(sidebar_section);
		$title.attr({
			"aria-label": __("Toggle Section: {0}", [category.label]),
			"aria-expanded": "true",
		});
		this.prepare_sidebar(root_pages, sidebar_section, this.sidebar);

		$title.on("click", (e) => {
			const $e = $(e.target);
			const href = $e.find("span use").attr("href");
			const isCollapsed = href === "#es-line-down";
			let icon = isCollapsed ? "#es-line-right-chevron" : "#es-line-down";
			$e.find("span use").attr("href", icon);
			$e.parent().find(".sidebar-item-container").toggleClass("hidden");
			$e.attr("aria-expanded", String(!isCollapsed));
		});

		if (Object.keys(root_pages).length === 0) {
			sidebar_section.addClass("hidden");
		}

		$(".item-anchor").on("click", () => {
			$(".list-sidebar.hidden-xs.hidden-sm").removeClass("opened");
			$(".close-sidebar").css("display", "none");
			$("body").css("overflow", "auto");
		});

		if (
			sidebar_section.find(".sidebar-item-container").length &&
			sidebar_section.find("> [item-is-hidden='0']").length == 0
		) {
			sidebar_section.addClass("hidden show-in-edit-mode");
		}
	}
	
	prepare_sidebar(items, child_container, item_container) {
		items.forEach((item) => this.append_item(item, child_container));
		child_container.appendTo(item_container);
	}

	append_item(item, container) {
		let is_current_page =
			frappe.router.slug(item.title) == frappe.router.slug(this.get_page_to_show().name) &&
			item.public == this.get_page_to_show().public;
		item.selected = is_current_page;
		if (is_current_page) {
			this.current_page = { name: item.title, public: item.public };
		}

		let $item_container = this.sidebar_item_container(item);
		let sidebar_control = $item_container.find(".sidebar-item-control");

		let pages = item.public ? this.public_pages : this.private_pages;

		let child_items = pages.filter((page) => page.parent_page == item.title);
		if (child_items.length > 0) {
			let child_container = $item_container.find(".sidebar-child-item");
			child_container.addClass("hidden");
			this.prepare_sidebar(child_items, child_container, $item_container);
		}

		$item_container.appendTo(container);
		this.sidebar_items[item.public ? "public" : "private"][item.title] = $item_container;

		if ($item_container.parent().hasClass("hidden") && is_current_page) {
			$item_container.parent().toggleClass("hidden");
		}

		this.add_drop_icon(item, sidebar_control, $item_container);

		if (child_items.length > 0) {
			$item_container.find(".drop-icon").first().addClass("show-in-edit-mode");
		}
	}

	sidebar_item_container(item) {
		item.indicator_color =
			item.indicator_color || this.indicator_colors[Math.floor(Math.random() * 12)];

		return $(`
			<div
				class="sidebar-item-container ${item.is_editable ? "is-draggable" : ""}"
				item-parent="${item.parent_page}"
				item-name="${item.title}"
				item-public="${item.public || 0}"
				item-is-hidden="${item.is_hidden || 0}"
			>
				<div class="desk-sidebar-item standard-sidebar-item ${item.selected ? "selected" : ""}">
					<a
						href="/app/${
							item.public
								? frappe.router.slug(item.title)
								: "private/" + frappe.router.slug(item.title)
						}"
						class="item-anchor ${item.is_editable ? "" : "block-click"}" title="${__(item.title)}"
					>
						<span class="sidebar-item-icon" item-icon=${item.icon || "folder-normal"}>
							${
								item.public
									? frappe.utils.icon(item.icon || "folder-normal", "md")
									: `<span class="indicator ${item.indicator_color}"></span>`
							}
						</span>
						<span class="sidebar-item-label">${__(item.title)}<span>
					</a>
					<div class="sidebar-item-control"></div>
				</div>
				<div class="sidebar-child-item nested-container"></div>
			</div>
		`);
	}

	get_page_to_show() {
		let default_page;

		if (frappe.boot.user.default_workspace) {
			default_page = {
				name: frappe.boot.user.default_workspace.title,
				public: frappe.boot.user.default_workspace.public,
			};
		} else if (
			localStorage.current_page &&
			this.all_pages.filter((page) => page.title == localStorage.current_page).length != 0
		) {
			default_page = {
				name: localStorage.current_page,
				public: localStorage.is_current_page_public != "false",
			};
		} else if (Object.keys(this.all_pages).length !== 0) {
			default_page = { name: this.all_pages[0].title, public: this.all_pages[0].public };
		} else {
			default_page = { name: "Build", public: true };
		}

		const route = frappe.get_route();
		const page = (route[1] == "private" ? route[2] : route[1]) || default_page.name;
		const is_public = route[1] ? route[1] != "private" : default_page.public;
		return { name: page, public: is_public };
	}

	add_drop_icon(item, sidebar_control, item_container) {
		let drop_icon = "es-line-down";
		if (item_container.find(`[item-name="${this.current_page.name}"]`).length) {
			drop_icon = "small-up";
		}

		let $child_item_section = item_container.find(".sidebar-child-item");
		let $drop_icon = $(`<button class="btn-reset drop-icon hidden">`)
			.html(frappe.utils.icon(drop_icon, "sm"))
			.appendTo(sidebar_control);
		let pages = item.public ? this.public_pages : this.private_pages;
		if (
			pages.some(
				(e) => e.parent_page == item.title && (e.is_hidden == 0 || !this.is_read_only)
			)
		) {
			$drop_icon.removeClass("hidden");
		}
		$drop_icon.on("click", () => {
			let icon =
				$drop_icon.find("use").attr("href") === "#es-line-down"
					? "#es-line-up"
					: "#es-line-down";
			$drop_icon.find("use").attr("href", icon);
			$child_item_section.toggleClass("hidden");
		});
	}

	setup_views() {
		var show_list_link = false;

		if (frappe.views.calendar[this.doctype]) {
			this.sidebar.find('.list-link[data-view="Calendar"]').removeClass("hide");
			this.sidebar.find('.list-link[data-view="Gantt"]').removeClass("hide");
			show_list_link = true;
		}
		//show link for kanban view
		this.sidebar.find('.list-link[data-view="Kanban"]').removeClass("hide");
		if (this.doctype === "Communication" && frappe.boot.email_accounts.length) {
			this.sidebar.find('.list-link[data-view="Inbox"]').removeClass("hide");
			show_list_link = true;
		}

		if (frappe.treeview_settings[this.doctype] || frappe.get_meta(this.doctype).is_tree) {
			this.sidebar.find(".tree-link").removeClass("hide");
		}

		this.current_view = "List";
		var route = frappe.get_route();
		if (route.length > 2 && frappe.views.view_modes.includes(route[2])) {
			this.current_view = route[2];

			if (this.current_view === "Kanban") {
				this.kanban_board = route[3];
			} else if (this.current_view === "Inbox") {
				this.email_account = route[3];
			}
		}

		// disable link for current view
		this.sidebar
			.find('.list-link[data-view="' + this.current_view + '"] a')
			.attr("disabled", "disabled")
			.addClass("disabled");

		//enable link for Kanban view
		this.sidebar
			.find('.list-link[data-view="Kanban"] a, .list-link[data-view="Inbox"] a')
			.attr("disabled", null)
			.removeClass("disabled");

		// show image link if image_view
		if (this.list_view.meta.image_field) {
			this.sidebar.find('.list-link[data-view="Image"]').removeClass("hide");
			show_list_link = true;
		}

		if (
			this.list_view.settings.get_coords_method ||
			(this.list_view.meta.fields.find((i) => i.fieldname === "latitude") &&
				this.list_view.meta.fields.find((i) => i.fieldname === "longitude")) ||
			this.list_view.meta.fields.find(
				(i) => i.fieldname === "location" && i.fieldtype == "Geolocation"
			)
		) {
			this.sidebar.find('.list-link[data-view="Map"]').removeClass("hide");
			show_list_link = true;
		}

		if (show_list_link) {
			this.sidebar.find('.list-link[data-view="List"]').removeClass("hide");
		}
	}

	setup_reports() {
		// add reports linked to this doctype to the dropdown
		var me = this;
		var added = [];
		var dropdown = this.page.sidebar.find(".reports-dropdown");
		var divider = false;

		var add_reports = function (reports) {
			$.each(reports, function (name, r) {
				if (!r.ref_doctype || r.ref_doctype == me.doctype) {
					var report_type =
						r.report_type === "Report Builder"
							? `List/${r.ref_doctype}/Report`
							: "query-report";

					var route = r.route || report_type + "/" + (r.title || r.name);

					if (added.indexOf(route) === -1) {
						// don't repeat
						added.push(route);

						if (!divider) {
							me.get_divider().appendTo(dropdown);
							divider = true;
						}

						$(
							'<li><a href="#' + route + '">' + __(r.title || r.name) + "</a></li>"
						).appendTo(dropdown);
					}
				}
			});
		};

		// from reference doctype
		if (this.list_view.settings.reports) {
			add_reports(this.list_view.settings.reports);
		}

		// Sort reports alphabetically
		var reports =
			Object.values(frappe.boot.user.all_reports).sort((a, b) =>
				a.title.localeCompare(b.title)
			) || [];

		// from specially tagged reports
		add_reports(reports);
	}

	setup_list_filter() {
		this.list_filter = new ListFilter({
			wrapper: this.page.sidebar.find(".list-filters"),
			doctype: this.doctype,
			list_view: this.list_view,
		});
	}

	setup_kanban_boards() {
		const $dropdown = this.page.sidebar.find(".kanban-dropdown");
		frappe.views.KanbanView.setup_dropdown_in_sidebar(this.doctype, $dropdown);
	}

	setup_keyboard_shortcuts() {
		this.sidebar.find(".list-link > a, .list-link > .btn-group > a").each((i, el) => {
			frappe.ui.keys.get_shortcut_group(this.page).add($(el));
		});
	}

	setup_list_group_by() {
		this.list_group_by = new frappe.views.ListGroupBy({
			doctype: this.doctype,
			sidebar: this,
			list_view: this.list_view,
			page: this.page,
		});
	}

	get_stats() {
		var me = this;

		let dropdown_options = me.sidebar.find(".list-stats-dropdown .stat-result");
		this.set_loading_state(dropdown_options);

		frappe.call({
			method: "frappe.desk.reportview.get_sidebar_stats",
			type: "GET",
			args: {
				stats: me.stats,
				doctype: me.doctype,
				// wait for list filter area to be generated before getting filters, or fallback to default filters
				filters:
					(me.list_view.filter_area
						? me.list_view.get_filters_for_args()
						: me.default_filters) || [],
			},
			callback: function (r) {
				let stats = (r.message.stats || {})["_user_tags"] || [];
				me.render_stat(stats);
				let stats_dropdown = me.sidebar.find(".list-stats-dropdown");
				frappe.utils.setup_search(stats_dropdown, ".stat-link", ".stat-label");
			},
		});
	}

	set_loading_state(dropdown) {
		dropdown.html(`<li>
			<div class="empty-state">
				${__("Loading...")}
			</div>
		</li>`);
	}

	render_stat(stats) {
		let args = {
			stats: stats,
			label: __("Tags"),
		};

		let tag_list = $(frappe.render_template("list_sidebar_stat", args)).on(
			"click",
			".stat-link",
			(e) => {
				let fieldname = $(e.currentTarget).attr("data-field");
				let label = $(e.currentTarget).attr("data-label");
				let condition = "like";
				let existing = this.list_view.filter_area.filter_list.get_filter(fieldname);
				if (existing) {
					existing.remove();
				}
				if (label == "No Tags") {
					label = "%,%";
					condition = "not like";
				}
				this.list_view.filter_area.add(this.doctype, fieldname, condition, label);
			}
		);

		this.sidebar.find(".list-stats-dropdown .stat-result").html(tag_list);
	}

	reload_stats() {
		this.sidebar.find(".stat-link").remove();
		this.sidebar.find(".stat-no-records").remove();
		this.get_stats();
	}

	add_banner(message, link, cta) {
		try {
			this.banner = $(`
				<div class="sidebar-section">
					${message} <a href="${link}" target="_blank" style="color: var(--text-color)">${cta} &rarr; </a>
				</div>
			`).appendTo(this.sidebar);
		} catch (error) {
			console.error(error);
		}
	}

	add_insights_banner() {
		if (this.list_view.view != "Report") {
			return;
		}

		if (localStorage.getItem("show_insights_banner") == "false") {
			return;
		}

		const message = __("Get more insights with");
		const link = "https://frappe.io/s/insights";
		const cta = "Frappe Insights";
		this.add_banner(message, link, cta);
	}

	add_crm_banner() {
		if (this.list_view.meta.module != "CRM" || this.list_view.view != "List") {
			return;
		}

		const message = "";
		const link =
			"https://frappe.io/crm?utm_source=crm-sidebar&utm_medium=sidebar&utm_campaign=frappe-ad";
		const cta = __("Switch to Frappe CRM for smarter sales");
		this.add_banner(message, link, cta);
	}

	add_helpdesk_banner() {
		if (this.list_view.meta.module != "Support" || this.list_view.view != "List") {
			return;
		}

		const message = "";
		const link =
			"https://frappe.io/helpdesk?utm_source=support-sidebar&utm_medium=sidebar&utm_campaign=frappe-ad";
		const cta = __("Upgrade your support experience with Frappe Helpdesk");
		this.add_banner(message, link, cta);
	}
};
