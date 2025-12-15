<template>
  <div class="reusable-child-table">
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :bordered="true"
      :pagination="false"
      :loading="loading"
      :scroll="{ x: 'max-content', y: 400 }"
    >
      <template #bodyCell="{ column, record, index }">

        <!-- CỘT STT -->
        <template v-if="column.key === 'stt'">
          {{ index + 1 }}
        </template>

        <!-- CÁC CỘT CÒN LẠI -->
        <template v-else>
          <div :data-ref="`cell_${column.key}_${record.idx}`"></div>
        </template>

      </template>
      
      <!-- SUMMARY ROW - TỔNG CỘNG -->
      <template #summary v-if="totalFieldName">
        <a-table-summary fixed>
          <a-table-summary-row>
            <a-table-summary-cell 
              :col-span="totalColumnIndex" 
              class="total-label-cell"
            >
              <strong>Tổng cộng</strong>
            </a-table-summary-cell>
            <a-table-summary-cell 
              :col-span="columns.length - totalColumnIndex"
              class="total-value-cell"
            >
              <strong>{{ formattedTotal }}</strong>
            </a-table-summary-cell>
          </a-table-summary-row>
        </a-table-summary>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from "vue";
const COLUMN_UNIT_PX = 60;
const props = defineProps({
  frm: { type: Object, required: true },
  childTableName: { type: String, required: true },
  showIndex: { type: Boolean, default: true },
  totalFieldName: { type: String, default: null }, // Tên field cần tính tổng
});

const loading = ref(false);
const meta = ref(null);
const tableData = ref([]);
const controlsMap = ref({});

// Lấy metadata của child table
const loadMeta = () => {
  const childDoctype = props.frm.fields_dict[props.childTableName]?.df?.options;
  if (!childDoctype) return null;
  return frappe.get_meta(childDoctype);
};

// Tạo columns từ metadata
const columns = computed(() => {
  if (!meta.value || !meta.value.fields) return [];

  const cols = [];

  // Cột STT
  if (props.showIndex) {
    cols.push({
      title: "STT",
      key: "stt",
      dataIndex: "stt",
      align: "center",
      width: 60,
    });
  }

  // Cột dữ liệu
  meta.value.fields.forEach((field) => {
    if (field && field.in_list_view) {
      cols.push({
        title: field.label || field.fieldname,
        key: field.fieldname,
        dataIndex: field.fieldname,
        align: getColumnAlign(field.fieldtype),
        width: getColumnWidth(field),
        fieldtype: field.fieldtype,
        read_only: field.read_only,
        options: field.options,
      });
    }
  });

  return cols;
});

// Tính index của cột total (bao gồm cả cột STT nếu có)
const totalColumnIndex = computed(() => {
  if (!props.totalFieldName) return 0;
  
  let index = 0;
  
  // Nếu có cột STT, index bắt đầu từ 1
  if (props.showIndex) {
    index = 1;
  }
  
  // Tìm vị trí của totalFieldName trong columns
  const dataColumns = columns.value.filter(col => col.key !== 'stt');
  const totalFieldIndex = dataColumns.findIndex(col => col.key === props.totalFieldName);
  
  if (totalFieldIndex !== -1) {
    index += totalFieldIndex;
  }
  
  return index;
});

// Tính tổng của totalField
const totalValue = computed(() => {
  if (!props.totalFieldName || !tableData.value.length) return 0;
  
  return tableData.value.reduce((sum, row) => {
    const value = parseFloat(row[props.totalFieldName]) || 0;
    return sum + value;
  }, 0);
});

// Format giá trị tổng
const formattedTotal = computed(() => {
  const totalCol = columns.value.find(col => col.key === props.totalFieldName);
  if (!totalCol) return totalValue.value;
  
  return formatValue(totalValue.value, totalCol.fieldtype);
});

// Load data từ frm
const loadData = () => {
  tableData.value = [...(props.frm.doc[props.childTableName] || [])];
};

// Tạo control cho mọi cell
const createAllControls = () => {
  if (!tableData.value.length || !columns.value.length) return;

  tableData.value.forEach((row) => {
    columns.value.forEach((col) => {
      if (col.key === "stt") return; // bỏ STT
      createControl(row, col);
    });
  });
};

const createControl = (row, column) => {
  nextTick(() => {
    const cellRef = `cell_${column.key}_${row.idx}`;
    const container = document.querySelector(`[data-ref="${cellRef}"]`);
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = "true";
    container.innerHTML = "";

    // Nếu read_only -> chỉ hiển thị text
    if (column.read_only) {
      container.textContent = formatValue(row[column.key], column.fieldtype);
      container.style.textAlign = getColumnAlign(column.fieldtype);
      return;
    }

    // Tạo control
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: column.fieldtype,
        fieldname: column.key,
        options: column.options,
      },
      parent: container,
      only_input: true,
      frm: props.frm,
    });

    control.refresh();
    const rawValue = row[column.key];

    if (["Link", "Select", "Time"].includes(column.fieldtype)) {
      const safeValue = rawValue || null;
      control.set_value(safeValue);
    } else {
      let displayValue = rawValue || "";

      if (column.fieldtype === "Date" && rawValue) {
        displayValue = frappe.datetime.str_to_user(rawValue); // YYYY-MM-DD → dd-mm-yyyy
      }

      if (column.fieldtype === "Datetime" && rawValue) {
        displayValue = frappe.datetime.str_to_user(rawValue); // YYYY-MM-DD hh:mm:ss → dd-mm-yyyy hh:mm:ss
      }

      control.$input.val(displayValue);
    }


    // Style
    styleControl(control, column.fieldtype);

    // update child row khi thay đổi
    const eventType = ["Link", "Select"].includes(column.fieldtype)
      ? "awesomplete-selectcomplete"
      : "change";

    control.$input.on(eventType, async () => {
      await updateChildRow(row, column.key, control.get_value());
    });

    controlsMap.value[cellRef] = control;
  });
};

// Update child table
const updateChildRow = async (row, fieldname, value) => {
  const childRow = props.frm.doc[props.childTableName].find((r) => r.idx === row.idx);
  if (childRow) {
    await frappe.model.set_value(childRow.doctype, childRow.name, fieldname, value);
    props.frm.refresh_field(props.childTableName);
    props.frm.dirty();
  }
};

// Format
const formatValue = (value, type) => {
  if (value == null) return "";
  switch (type) {
    case "Float":
    case "Currency":
      return Number(value).toLocaleString("vi-VN");
    case "Int":
      return parseInt(value).toLocaleString("vi-VN");
    default:
      return value;
  }
};

// Style input
const styleControl = (control, fieldtype) => {
  if (["Float", "Int", "Currency"].includes(fieldtype)) {
    control.$input.css({ "text-align": "center" });
  }
};

// Align
const getColumnAlign = (type) => {
  if (["Float", "Int", "Currency", "Check"].includes(type)) return "center";
  return "left";
};

// Width
const getColumnWidth = (field) => {
  const columns = field.columns || 1;
  return Math.max(columns * COLUMN_UNIT_PX, 60);
};

// Init
onMounted(() => {
  meta.value = loadMeta();
  loadData();
  nextTick(() => createAllControls());
});

watch(() => props.frm.doc[props.childTableName], () => {
  loadData();
  nextTick(() => createAllControls());
}, { deep: true });

const dataSource = tableData;
</script>

<style scoped>
.reusable-child-table {
  width: 100%;
}
:deep(.ant-table-cell) {
  padding: 8px !important;
}
:deep(.total-label-cell) {
  background-color: #f5f5f5;
  font-weight: bold;
}
:deep(.total-value-cell) {
  background-color: #fafafa;
  font-weight: bold;
  font-size: 14px;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #e8e8e8 !important;
  font-weight: 600;
  color: #000;
  text-align: center;
}
</style>