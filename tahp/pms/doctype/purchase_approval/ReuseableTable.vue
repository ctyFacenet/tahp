<template>
  <div class="reusable-child-table">
    <a-table
      :columns="enhancedColumns"
      :data-source="dataSource"
      :bordered="true"
      :pagination="false"
      :loading="loading"
      :scroll="{ x: 'max-content' }"
    >
      <template #bodyCell="{ column, record, index }">

        <!-- CỘT STT -->
        <template v-if="column.key === 'stt'">
          {{ index + 1 }}
        </template>

        <!-- CỘT XÓA -->
        <template v-else-if="column.key === 'actions'">
          <a-button 
            type="text" 
            danger 
            size="small"
            @click="deleteRow(record)"
            title="Xóa dòng"
          >
            <DeleteOutlined />
          </a-button>
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
              :col-span="enhancedColumns.length - totalColumnIndex"
              class="total-value-cell"
            >
              <strong>{{ formattedTotal }}</strong>
            </a-table-summary-cell>
          </a-table-summary-row>
        </a-table-summary>
      </template>
    </a-table>

    <!-- NÚT THÊM DÒNG -->
    <div v-if="!isTableReadOnly" class="add-row-container">
      <a-button 
        type="dashed" 
        @click="addRow"
        class="add-row-button"
      >
        <PlusOutlined /> Thêm dòng
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from "vue";
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';

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

// Kiểm tra xem bảng có read_only không
const isTableReadOnly = computed(() => {
  return props.frm.fields_dict[props.childTableName]?.df?.read_only || false;
});

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
      const width = getColumnWidth(field);
      cols.push({
        title: __(field.label) || __(field.fieldname),
        key: field.fieldname,
        dataIndex: field.fieldname,
        align: getColumnAlign(field.fieldtype),
        width: width,
        fieldtype: field.fieldtype,
        read_only: field.read_only,
        options: field.options,
        fetch_from: field.fetch_from, // Thêm fetch_from
      });
    }
  });

  return cols;
});

// Thêm cột actions nếu không read_only
const enhancedColumns = computed(() => {
  if (isTableReadOnly.value) {
    return columns.value;
  }

  return [
    ...columns.value,
    {
      title: "",
      key: "actions",
      align: "center",
      width: 60,
      fixed: "right",
    }
  ];
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

// Thêm dòng mới
const addRow = async () => {
  const childTable = props.frm.fields_dict[props.childTableName];
  if (!childTable) return;

  const newRow = frappe.model.add_child(
    props.frm.doc,
    childTable.df.options,
    props.childTableName
  );

  props.frm.refresh_field(props.childTableName);
  loadData();
  
  await nextTick();
  createAllControls();
  
  props.frm.dirty();
};

// Xóa dòng
const deleteRow = async (record) => {
  const childRows = props.frm.doc[props.childTableName];
  const rowToDelete = childRows.find(r => r.idx === record.idx);
  
  if (!rowToDelete) return;

  // Xóa row
  frappe.model.clear_doc(rowToDelete.doctype, rowToDelete.name);
  
  // Cập nhật lại form
  props.frm.refresh_field(props.childTableName);
  loadData();
  
  await nextTick();
  createAllControls();
  
  props.frm.dirty();
};

// Fetch giá trị từ doctype khác (như item_name từ item_code)
const handleFetchFrom = async (row, column, sourceFieldValue) => {
  if (!column.fetch_from || !sourceFieldValue) return;

  // Parse fetch_from: "item_code.item_name"
  const fetchParts = column.fetch_from.split('.');
  if (fetchParts.length !== 2) return;

  const [sourceField, targetField] = fetchParts;

  try {
    // Tìm field source trong meta để lấy options (doctype)
    const sourceFieldMeta = meta.value.fields.find(f => f.fieldname === sourceField);
    if (!sourceFieldMeta || !sourceFieldMeta.options) return;

    const sourceDoctype = sourceFieldMeta.options;

    // Fetch giá trị từ doctype
    const result = await frappe.db.get_value(
      sourceDoctype,
      sourceFieldValue,
      targetField
    );

    if (result && result.message && result.message[targetField]) {
      const fetchedValue = result.message[targetField];
      await updateChildRow(row, column.key, fetchedValue);
      
      // Cập nhật giá trị hiển thị
      const cellRef = `cell_${column.key}_${row.idx}`;
      const control = controlsMap.value[cellRef];
      if (control) {
        control.$input.val(fetchedValue);
      }
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
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

    const isReadOnly = 
      column.read_only ||
      props.frm.fields_dict[props.childTableName]?.df?.read_only

    // Nếu read_only -> chỉ hiển thị text
    if (isReadOnly) {
      container.textContent = formatValue(row[column.key], column.fieldtype);
      container.style.textAlign = getColumnAlign(column.fieldtype);
      return;
    }

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
        fetch_from: column.fetch_from,
      },
      parent: container,
      only_input: true,
      frm: props.frm,
    });

    control.refresh();
    const rawValue = row[column.key];

    if (["Link", "Select", "Time"].includes(column.fieldtype)) {
      const safeValue = rawValue || null;
      control.$input.val(safeValue);
    } else {
      let displayValue = rawValue || "";

      if (column.fieldtype === "Date" && rawValue) {
        displayValue = frappe.datetime.str_to_user(rawValue);
      }

      if (column.fieldtype === "Datetime" && rawValue) {
        displayValue = frappe.datetime.str_to_user(rawValue);
      }

      if (column.fieldtype === "Float" && rawValue != null && rawValue !== "") {
        displayValue = formatFloatInput(rawValue);
      }

      control.$input.val(displayValue);
    }

    // Style
    styleControl(control, column.fieldtype);

    // Style cho Small Text với !important và auto-resize
    if (column.fieldtype === "Small Text") {
      const currentStyle = control.$input.attr('style') || '';
      control.$input.attr('style', currentStyle + 
        'min-height: 40px !important; resize: none !important; overflow: hidden !important;'
      );
      
      // Hàm auto-resize textarea
      const autoResize = (textarea) => {
        textarea.style.setProperty('height', '40px', 'important');
        const newHeight = Math.max(40, textarea.scrollHeight);
        textarea.style.setProperty('height', newHeight + 'px', 'important');
      };
      
      // Auto-resize khi load
      autoResize(control.$input[0]);
      
      // Auto-resize khi input
      control.$input.on('input', function() {
        autoResize(this);
      });
    }

    // update child row khi thay đổi
    const eventType = ["Link", "Select"].includes(column.fieldtype)
      ? "awesomplete-selectcomplete"
      : "change";

    control.$input.on(eventType, async () => {
      let value = control.get_value();
      
      // Parse float value từ format
      if (column.fieldtype === "Float" && value) {
        value = parseFloatInput(value);
      }
      
      await updateChildRow(row, column.key, value);
      
      // Trigger Frappe field change event để chạy các script tính toán
      const childRow = props.frm.doc[props.childTableName].find((r) => r.idx === row.idx);
      if (childRow) {
        props.frm.script_manager.trigger(
          column.key,
          childRow.doctype,
          childRow.name
        );
      }
      
      // Kiểm tra xem có trường nào fetch từ field này không
      const dependentFields = columns.value.filter(col => 
        col.fetch_from && col.fetch_from.startsWith(column.key + '.')
      );
      
      if (dependentFields.length > 0) {
        for (const depField of dependentFields) {
          await handleFetchFrom(row, depField, value);
        }
      }
      
      // Refresh lại toàn bộ controls sau khi có thay đổi
      await nextTick();
      loadData();
      await nextTick();
      createAllControls();
    });

    // Thêm xử lý format cho Float khi blur
    if (column.fieldtype === "Float") {
      control.$input.on("blur", function() {
        const currentValue = $(this).val();
        if (currentValue) {
          const parsed = parseFloatInput(currentValue);
          const formatted = formatFloatInput(parsed);
          $(this).val(formatted);
        }
      });

      control.$input.on("focus", function() {
        const currentValue = $(this).val();
        if (currentValue) {
          const parsed = parseFloatInput(currentValue);
          $(this).val(parsed);
        }
      });
    }

    controlsMap.value[cellRef] = control;
  });
};

// Parse float input (loại bỏ dấu phân cách)
const parseFloatInput = (value) => {
  if (!value) return 0;
  // Loại bỏ dấu phân cách hàng nghìn (dấu phẩy hoặc dấu chấm)
  const cleaned = String(value).replace(/[,.]/g, (match, offset, str) => {
    // Giữ dấu chấm cuối cùng làm dấu thập phân
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    const lastSeparator = Math.max(lastDot, lastComma);
    
    if (offset === lastSeparator) {
      return '.';
    }
    return '';
  });
  
  return parseFloat(cleaned) || 0;
};

// Format float input cho hiển thị
const formatFloatInput = (value) => {
  if (value == null || value === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  
  // Format với dấu phẩy phân cách hàng nghìn
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
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
  if (value == null || value === "") return "";
  switch (type) {
    case "Float":
      return formatFloatInput(value);
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
  let columns = field.columns || 1;
  if (field.fieldname === "item_name") columns = 2;
  const calculatedWidth = Math.max(columns * COLUMN_UNIT_PX, 60);
  return calculatedWidth;
};

// Lắng nghe changes từ Frappe form
const setupFormListeners = () => {
  const gridField = props.frm.fields_dict[props.childTableName];
  if (!gridField || !gridField.grid) return;
  
  // Override grid's refresh method để bắt mọi thay đổi
  const originalRefresh = gridField.grid.refresh.bind(gridField.grid);
  gridField.grid.refresh = function() {
    originalRefresh();
    loadData();
    nextTick(() => createAllControls());
  };
  
  // Lắng nghe thay đổi trên từng row
  const setupRowListeners = () => {
    if (gridField.grid.grid_rows) {
      gridField.grid.grid_rows.forEach(grid_row => {
        // Lắng nghe thay đổi trên các field của row
        if (grid_row.doc) {
          const docname = grid_row.doc.name;
          
          // Listen cho tất cả fields trong meta
          if (meta.value && meta.value.fields) {
            meta.value.fields.forEach(field => {
              $(grid_row.wrapper).off(`change:${field.fieldname}`);
              $(grid_row.wrapper).on(`change:${field.fieldname}`, () => {
                loadData();
                nextTick(() => createAllControls());
              });
            });
          }
        }
      });
    }
  };
  
  // Setup listeners ban đầu
  setupRowListeners();
  
  // Re-setup listeners khi grid render lại
  gridField.grid.wrapper.off('grid-row-render').on('grid-row-render', () => {
    setupRowListeners();
    loadData();
    nextTick(() => createAllControls());
  });
  
  // Lắng nghe thay đổi từ frappe.model.set_value
  const childDoctype = gridField.df.options;
  frappe.ui.form.on(childDoctype, {
    onload: function(frm, cdt, cdn) {
      // Lắng nghe mọi field trong child doctype
      if (meta.value && meta.value.fields) {
        meta.value.fields.forEach(field => {
          frappe.ui.form.on(childDoctype, field.fieldname, function(frm, cdt, cdn) {
            const row = locals[cdt][cdn];
            if (row && row.parent === props.frm.doc.name && row.parentfield === props.childTableName) {
              loadData();
              nextTick(() => createAllControls());
            }
          });
        });
      }
    }
  });
};

// Init
onMounted(() => {
  meta.value = loadMeta();
  loadData();
  nextTick(() => createAllControls());
  setupFormListeners();
});

watch(() => props.frm.doc[props.childTableName], () => {
  loadData();
  nextTick(() => createAllControls());
}, { deep: true });

// Watch thêm để bắt thay đổi từ bên ngoài
watch(() => JSON.stringify(props.frm.doc[props.childTableName]), () => {
  loadData();
  nextTick(() => createAllControls());
});

const dataSource = tableData;
</script>

<style scoped>
.reusable-child-table {
  width: 100%;
  overflow: visible !important;
}

:deep(.ant-table) {
  overflow: visible !important;
}

:deep(.ant-table-container) {
  overflow: visible !important;
}

:deep(.ant-table-content) {
  overflow: visible !important;
}

:deep(.ant-table-body) {
  overflow: visible !important;
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

.add-row-container {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
  position: relative;
  z-index: 0;
}

.add-row-button {
  display: flex;
  align-items: center;
  gap: 8px;
}


</style>