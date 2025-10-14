frappe.provide("tahp.ui");

frappe.ui.form.ControlVueCounter = class ControlVueCounter extends frappe.ui.form.ControlInput {
  make_input() {
    if (super.make_input) super.make_input();
    this.$input?.hide?.();

    this.$wrapper.css({
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60px",
      width: "100%",
      background: "#fff",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      marginTop: "8px",
      marginBottom: "8px",
      padding: "4px 0",
      overflow: "visible",
      position: "relative",
      zIndex: "10",
    });

    if (this.component?.app) {
      try {
        this.component.app.unmount();
        this.component.el.innerHTML = "";
      } catch (e) {
        console.warn("⚠️ Unmount failed:", e);
      }
      this.component = null;
    }

    if (this._mounting) return;
    this._mounting = true;

    this.component = new tahp.ui.CounterComponent({
      wrapper: this.$wrapper[0],
      value: this.value || 0,
      onUpdateValue: (val) => {
        this.set_value(val);
        frappe.show_alert({
          message: `🎯 Counter: ${val}`,
          indicator: "green",
        });
      },
    });

    setTimeout(() => (this._mounting = false), 100);
  }

  set_input(value) {
    this.value = value;
    if (this.component?.mounted?.vm) {
      this.component.mounted.vm.value = value;
    }
  }

  validate(value) {
    return isNaN(value) ? 0 : value;
  }

  destroy() {
    if (this.component?.app) {
      console.log("🧹 Destroying VueCounter component");
      this.component.app.unmount();
      this.component.el.innerHTML = "";
    }
    super.destroy?.();
  }
};
