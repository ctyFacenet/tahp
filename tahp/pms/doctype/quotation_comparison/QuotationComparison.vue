<template>
  <div>
    <!-- Header buttons -->
    <div class="tw-flex tw-items-end tw-justify-between tw-mb-3">
      <div class="tw-flex tw-items-center">
        <a-button class="tw-mr-2" v-if="!isSubmitted" @click="openMaterialRequestDialog(props.frm)">Lựa chọn yêu cầu mua hàng</a-button>
        <div class="tw-flex tw-flex-wrap tw-gap-2">
          <button
            v-for="(row, idx) in props.frm.doc.material_request"
            :key="idx"
            class="btn btn-default"
            style="padding: 4px 8px; font-size: 13px;"
            @click="frappe.set_route('Form', 'Material Request', row.material_request)"
          >
            {{ row.material_request }}
          </button>
        </div>
      </div>
      <div>
        <a-button class="tw-mr-2" @click="addSupplier" v-if="!isSubmitted && (props.frm.doc.items.length > 0)">Thêm nhà cung cấp</a-button>
      </div>
    </div>

    <!-- Main table -->
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :bordered="true"
      :pagination="false"
    >
      <!-- Custom header -->
      <template #headerCell="{ column }">
        <template v-if="column.isSupplierGroup">
          <div class="tw-flex tw-items-center tw-justify-between tw-w-full">
            <div class="tw-flex tw-items-center">
              <span
                v-if="!isSubmitted"
                @click="remove(column.supplier)" 
                style="cursor:pointer; margin-right: 8px;line-height: 0;"
              >
                <CloseOutlined />
              </span>
              <span class="tw-font-bold">{{ column.isApproved ? "Đã lựa chọn:" : "" }} {{ column.title }}</span>
            </div>

            <a-button @click="approve(column.supplier)" type="primary" size="small" v-if="!isSubmitted">
              Lựa chọn
            </a-button>

          </div>
        </template>

        <template v-else>
          {{ column.title }}
        </template>
      </template>

      <!-- Body cells -->
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'tax'">
          <div v-if="!isSubmitted">
            <div :data-ref="`cell_tax_${record.key}`"></div>
          </div>
          <div v-else>
            {{ record.tax }}%
          </div>
        </template>
        <template v-else-if="record.isSpec">
          <!-- For spec rows - giữ nguyên -->
          <template v-if="column.key === 'quality'">
            <div class="tw-flex tw-items-center tw-gap-2">
              <span 
                style="cursor:pointer;line-height: 0;" 
                @click.stop="removeSpec(record)"
                v-if="!isSubmitted"
              >
                <CloseOutlined />
              </span>
              <span>{{ record.specName }}</span>
            </div>
          </template>
          <template v-else-if="column.key?.startsWith('origin_')">
            <div :data-ref="`cell_${column.key}_${record.key}`"></div>
          </template>
        </template>
        
        <template v-else-if="record.isTotalRow">
          
          <!-- Row VAT -->
          <template v-if="record.totalType === 'vat'">
            <template v-if="column.key === 'stt'">
              <div style="display: flex; width: 100%;" >
                <!-- Ô trống đầu tiên -->
                <div style="flex: 1;"></div>

                <!-- Ô label VAT -->
                <div style="flex: 1; text-align: center; font-weight: bold;">
                  VAT
                </div>

                <!-- Ô input VAT -->
                <div style="flex: 1; display: flex; justify-content: flex-end;">
                  <input 
                    v-if="!isSubmitted"
                    type="number"
                    style="width: 80px; text-align: right;"
                    v-model.number="record.vatValue"
                    class="input-with-feedback form-control"
                    @input="updateVat(record.vatValue)" />
                  <div v-else style="width: 80px; text-align: right; font-weight: bold;">
                    {{ record.vatValue }}%
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="tw-font-bold">
                {{ typeof record[column.key] === 'object' ? record[column.key].value : record[column.key] }}
              </div>
            </template>
          </template>

          <!-- Nếu row là Delivery, Discount, Payment Note -->
          <template v-else-if="specialTypes.includes(record[column.key]?.totalType)">
            <div :data-ref="`cell_${column.key}_${record.key}`"></div>
          </template>

          <!-- Các row tổng khác -->
          <template v-else>
            <template v-if="record.isNotBold">
              <div style="text-align: start;">
                {{ typeof record[column.key] === 'object' ? record[column.key].value : record[column.key] }} 
              </div>
            </template>
            <template v-else>
              <div class="tw-font-bold" :style="record.isStart ? 'text-align: start;' : ''">
                {{ typeof record[column.key] === 'object' ? record[column.key].value : record[column.key] }} 
              </div>
            </template>
          </template>
        </template>

        <template v-else-if="record.isEmptyRow">
          <div class="tw-font-bold" style="text-align: start;">
            {{ record[column.key] }}
          </div>          
        </template>
        
        <template v-else>
          <template v-if="column.key === 'stt'">
            {{ getItemIndex(record) }}
          </template>

          <template v-else-if="column.key === 'quality'">
            <div @click="addQuality(record)" class="tw-flex tw-items-center tw-gap-2" style="color:blue;cursor: pointer;">
              <template v-if="!isSubmitted">
                <span style="line-height: 0;"><PlusOutlined /></span>
                <span>Thêm thông số</span>
              </template>
              <template v-else>
                <span></span>
              </template>
            </div>
          </template>

          <template v-else-if="column.key?.startsWith('origin_')">
            <div :data-ref="`cell_${column.key}_${record.key}`"></div>
          </template>

          <template v-else-if="column.key?.startsWith('rate_')">
            <div :data-ref="`cell_${column.key}_${record.key}`"></div>
          </template>

          <template v-else-if="column.key?.startsWith('tax_')">
            <div :data-ref="`cell_${column.key}_${record.key}`"></div>
          </template>

          <template v-else-if="column.key?.startsWith('total_')">
            {{ calculateTotal(record, column.key) }}
          </template>
        </template>
      </template>

      <template #customCell="{ column, record }">
        <template v-if="record.isSpec">
          <template v-if="column.key !== 'quality' && !column.key?.startsWith('spec_')">
            {{ { rowSpan: 0 } }}
          </template>
          <template v-else-if="column.key?.startsWith('spec_')">
            {{ { colSpan: 4 } }}
          </template>
        </template>
        <template v-else>
          <template v-if="record.rowSpan > 1 && ['stt', 'item_code', 'item_name', 'stock_uom', 'qty'].includes(column.key)">
            {{ { rowSpan: record.rowSpan } }}
          </template>
          <template v-else-if="column.key?.startsWith('origin_') || column.key?.startsWith('rate_') || column.key?.startsWith('tax_') || column.key?.startsWith('total_')">
            {{ { colSpan: 0 } }}
          </template>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { CheckOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  frm: { type: Object, required: true }
});

const isSubmitted = computed(() => {
  return props.frm.doc.recommend_supplier || "";
});
const suppliers = ref([...(props.frm.doc.supplier || [])]);
const controlsMap = ref({});


const base_columns = [
  { title: "STT", key: "stt", dataIndex: "stt", align: "center", width: 10, customCell: (record) => getCustomCell(record, 'stt') },
  { title: "Mã vật tư", key: "item_code", dataIndex: "item_code", width: 80, customCell: (record) => getCustomCell(record, 'item_code') },
  { title: "Tên vật tư", key: "item_name", dataIndex: "item_name", width: 120, customCell: (record) => getCustomCell(record, 'item_name') },
  { title: "ĐVT", key: "stock_uom", dataIndex: "stock_uom", width: 50, align: "center", customCell: (record) => getCustomCell(record, 'stock_uom') },
  { title: "Số lượng YC", key: "qty", dataIndex: "qty", width: 50, align: "center", customCell: (record) => getCustomCell(record, 'qty') },
  { title: "Thuế", key: "tax", dataIndex: "tax", width: 50, align: "center", customCell: (record) => getCustomCell(record, 'tax') },
  { title: "Chất lượng", key: "quality", dataIndex: "quality", width: 150, align: "center", customCell: (record) => getCustomCell(record, 'quality') }
];

const getCustomCell = (record, columnKey) => {
  if (record.isEmptyRow) {
    if (columnKey === 'stt') {
      const totalCols = 6 + (suppliers.value.length * 4);
      return { colSpan: totalCols };
    }
    return { colSpan: 0 };
  }

  if (record.isSpec) {
    return columnKey === 'quality' ? {} : { rowSpan: 0 };
  }

  if (record.isTotalRow) {
    if (columnKey === 'stt') {
      return { colSpan: 6, class: 'total-row' };
    } 
    if (['item_code', 'item_name', 'stock_uom', 'qty', 'quality', 'tax'].includes(columnKey)) {
      return { colSpan: 0 };
    }
  }

  if (record.rowSpan > 1 && ['stt', 'item_code', 'item_name', 'stock_uom', 'qty', 'tax'].includes(columnKey)) {
    return { rowSpan: record.rowSpan };
  }

  return {};
};


const columns = computed(() => {
  const cols = [...base_columns];

  suppliers.value.forEach((sup, index) => {
    const k = sup.supplier.replace(/\s+/g, "_");
    let hitClass = index % 2 === 0 ? "col-header-even" : "col-header-odd";
    let isApproved 
    if (props.frm.doc.recommend_supplier) {
      isApproved = sup.supplier === props.frm.doc.recommend_supplier
      if (isApproved) hitClass = "col-header-approved"
      else hitClass = "col-header-remaining"
    }

    cols.push({
      title: sup.supplier,
      isSupplierGroup: true,
      isApproved: isApproved,
      supplier: sup.supplier,
      className: hitClass,

      children: [
        {
          title: "Xuất xứ",
          key: `origin_${k}`,
          dataIndex: `origin_${k}`,
          width: 120,
          align: "center",
          className: hitClass,
          customCell: (record) => {
            if (record.isSpec || record.isTotalRow) {
              return { colSpan: 4 };
            } else if (record.isEmptyRow) {
              return { colSpan: 0 }
            }
            return {};
          }
        },
        {
          title: "Đơn giá",
          key: `rate_${k}`,
          dataIndex: `rate_${k}`,
          width: 120,
          align: "right",
          className: hitClass,
          customCell: (record) => {
            if (record.isSpec || record.isTotalRow || record.isEmptyRow) {
              return { colSpan: 0 };
            }
            return {};
          }
        },
        {
          title: "Thành tiền",
          key: `total_${k}`,
          dataIndex: `total_${k}`,
          width: 120,
          align: "right",
          className: hitClass,
          customCell: (record) => {
            if (record.isSpec || record.isTotalRow || record.isEmptyRow) {
              return { colSpan: 0 };
            }
            return {};
          }
        }
      ]
    });
  });

  return cols;
});

const specVersion = ref(0);

// Helper function to adjust textarea height
const adjustTextareaHeight = (el) => {
  if (!el) return;
  const minHeight = 30;
  el.style.setProperty('height', `${minHeight}px`, 'important');
  
  requestAnimationFrame(() => {
    const targetHeight = Math.max(el.scrollHeight, minHeight);
    el.style.setProperty('height', `${targetHeight}px`, 'important');
  });
};

// Watch for data changes and recreate controls
watch(() => [suppliers.value.length, specVersion.value], () => {
  nextTick(() => {
    createAllControls();
  });
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    createAllControls();
  });
});

let specialRows = []
let specialTypes = []

/* --------------------- Data Source --------------------- */
const dataSource = computed(() => {
  specVersion.value;
  const result = [];
  let itemCounter = 0;

  (props.frm.doc.items || []).forEach((item, idx) => {
    const qualities = props.frm.doc.qa_master.filter(s => s.item_code == item.item_code).map(s => s.specification);
    const rowSpan = qualities.length > 0 ? qualities.length + 1 : 1;

    itemCounter++;

    const row = {
      key: `item_${idx}`,
      item_code: item.item_code,
      item_name: item.item_name,
      stock_uom: item.stock_uom,
      qty: item.qty,
      tax: item.tax || 0,
      quality: qualities,
      rowSpan: rowSpan,
      itemIndex: itemCounter
    };

    suppliers.value.forEach((sup) => {
      const k = sup.supplier.replace(/\s+/g, "_");

      const mapping = (props.frm.doc.mapping || []).find(
        m => m.item_code === item.item_code && m.supplier === sup.supplier
      );

      const supSpecs = (props.frm.doc.specification || []).filter(
        s => s.item_code === item.item_code && s.supplier === sup.supplier
      );

      row[`origin_${k}`] = mapping?.origin || "";
      row[`rate_${k}`] = mapping?.rate || 0;
      
      const statusMap = {};
      supSpecs.forEach(s => {
        statusMap[s.specification] = s.current_status || "";
      });

      row[`status_${k}`] = statusMap;
    });

    result.push(row);

    if (qualities.length > 0) {
      qualities.forEach((spec, specIdx) => {
        const specRow = {
          key: `spec_${idx}_${specIdx}`,
          isSpec: true,
          specName: spec,
          parentItemCode: item.item_code
        };

        suppliers.value.forEach((sup) => {
          const k = sup.supplier.replace(/\s+/g, "_");
          
          const specMapping = (props.frm.doc.specification || []).find(
            s => s.item_code === item.item_code && 
                 s.supplier === sup.supplier && 
                 s.specification === spec
          );
          
          specRow[`origin_${k}`] = specMapping?.current_status || "";
        });

        result.push(specRow);
      });
    }
  });

const tempTotals = {};

suppliers.value.forEach(sup => {
  const k = sup.supplier.replace(/\s+/g, "_");
  const supplierData = props.frm.doc.supplier?.find(s => s.supplier === sup.supplier) || {};
  const supplierMappings = (props.frm.doc.mapping || []).filter(m => m.supplier === sup.supplier);

  const totalBase = supplierMappings.reduce((acc, m) => {
    const item = props.frm.doc.items.find(i => i.item_code === m.item_code);
    const qty = item?.qty || 0;
    const tax = item?.tax || 0;
    const rateWithTax = (m.rate || 0) * (1 + tax / 100);
    return acc + rateWithTax * qty;
  }, 0);
  const vatAmount = supplierData.vat_amount || 0;

  tempTotals[k] = {
    supplier: sup.supplier,
    totalBase,
    deliveryAmount: supplierData.delivery_amount || 0,
    discountAmount: supplierData.discount_amount || 0,
    paymentMethod: supplierData.payment_method || null,
    vatAmount,
    vatValue: totalBase * vatAmount / 100, // chỉ VAT row cần
    result: totalBase * (1 + vatAmount/100) + (supplierData.delivery_amount || 0) - (supplierData.discount_amount || 0),
    paymentNote: supplierData.payment_note || null,
    deliveryNote: supplierData.delivery_note || null,
    deliveryAddress: supplierData.delivery_address || null,
    deliveryAmountNote: supplierData.delivery_amount_note || null,
    discountNote: supplierData.discount_note || null,
    specialOffer: supplierData.special_offer || null,
    warranty: supplierData.warranty || null,
    afterSaleService: supplierData.after_sale_service || null
  };
});

// Định nghĩa các row
const rowsConfig = [
  { key: 'total_row', stt: 'Cộng', type: 'origin' },
  { 
    key: 'delivery_amount', 
    stt: 'Phí vận chuyển', 
    type: 'delivery_amount', 
    fieldname: 'delivery_amount', 
    special: true,
    float: true, 
  },
  { 
    key: 'discount_amount', 
    stt: 'Giảm giá', 
    type: 'discount_amount', 
    fieldname: 'discount_amount', 
    special: true,
    float: true
  },
  { key: 'total_vat', stt: 'VAT', type: 'vat', hasVatValue: true },
  { key: 'total_result', stt: 'Tổng cộng', type: 'result' },
  { key: 'empty_row', stt: 'I. Điều khoản thanh toán', isEmptyRow: true },
  { 
    key: 'payment_method', 
    stt: '1. Phương thức thanh toán', 
    type: 'payment_method', 
    fieldname: 'payment_method', 
    special: true,
    select: true,
    isNotBold: true,  
  },
  { 
    key: 'payment_note', 
    stt: '2. Thời hạn thanh toán', 
    type: 'payment_note', 
    fieldname: 'payment_note', 
    doctype: 'Custom Payment Note', 
    isNotBold: true, 
    special: true 
  },
  { key: 'empty_row', stt: 'II. Điều khoản giao hàng', isEmptyRow: true },
  { 
    key: 'delivery_note', 
    stt: '1. Thời gian giao hàng', 
    type: 'delivery_note', 
    fieldname: 'delivery_note', 
    doctype: 'Custom Delivery Note', 
    isNotBold: true, 
    special: true
  },
  { 
    key: 'delivery_address', 
    stt: '2. Địa điểm giao hàng', 
    type: 'delivery_address', 
    fieldname: 'delivery_address', 
    doctype: 'Custom Address', 
    isNotBold: true, 
    special: true
  },
  { 
    key: 'delivery_amount_note', 
    stt: '3. Chi phí vận chuyển', 
    type: 'delivery_amount_note', 
    fieldname: 'delivery_amount_note', 
    doctype: 'Custom Delivery Cost', 
    isNotBold: true, 
    special: true
  },
  { key: 'empty_row', stt: 'III. Điều khoản chiết khấu thương mại', isEmptyRow: true },
  { 
    key: 'discount_note', 
    stt: '1. Giảm giá', 
    type: 'discount_note', 
    fieldname: 'discount_note', 
    special: true,
    smallText: true,
    isNotBold: true, 
  },
  { 
    key: 'special_offer', 
    stt: '2. Khuyến mại', 
    type: 'special_offer', 
    fieldname: 'special_offer', 
    special: true,
    smallText: true,
    isNotBold: true, 
  },
  { 
    key: 'warranty', 
    stt: 'IV. Điều khoản bảo hành', 
    type: 'warranty', 
    fieldname: 'warranty', 
    doctype: 'Custom Warranty', 
    special: true,
    isStart: true
  },
  { 
    key: 'after_sale_service', 
    stt: 'V. Các dịch vụ sau bán hàng (nếu có)', 
    type: 'after_sale_service', 
    fieldname: 'after_sale_service', 
    doctype: 'Custom After Sale Service', 
    special: true,
    isStart: true
  }
];

specialRows = rowsConfig.filter(r => r.special)
specialTypes = specialRows.map(r => r.type);

// Tạo row từ tempTotals
rowsConfig.forEach(cfg => {
  if (cfg.isEmptyRow) {
    result.push({ key: cfg.key, stt: cfg.stt, isEmptyRow: true });
    return;
  }

  const row = { key: cfg.key, stt: cfg.stt, isTotalRow: true, totalType: cfg.type, isNotBold: cfg.isNotBold, isStart: cfg.isStart };
  if (cfg.hasVatValue) row.vatValue = 0;

  Object.values(tempTotals).forEach(t => {
    const k = t.supplier.replace(/\s+/g, "_");

    switch(cfg.type) {
      case 'origin':
        row[`origin_${k}`] = t.totalBase.toLocaleString("vi-VN"); break;
      case 'payment_method':
        row[`origin_${k}`] = { value: t.paymentMethod, totalType: 'payment_method', supplier: t.supplier }; break;
      case 'delivery_amount':
        row[`origin_${k}`] = { value: t.deliveryAmount, totalType: 'delivery_amount', supplier: t.supplier }; break;
      case 'discount_amount':
        row[`origin_${k}`] = { value: t.discountAmount, totalType: 'discount_amount', supplier: t.supplier }; break;
      case 'vat':
        row[`origin_${k}`] = { value: t.vatValue.toLocaleString("vi-VN"), totalType: 'vat', supplier: t.supplier };
        row.vatValue = t.vatAmount;
        break;
      case 'result':
        row[`origin_${k}`] = { value: t.result.toLocaleString("vi-VN"), totalType: 'result', supplier: t.supplier }; break;
      case 'payment_note':
        row[`origin_${k}`] = { value: t.paymentNote, totalType: 'payment_note', supplier: t.supplier }; break;
      case `delivery_note`:
        row[`origin_${k}`] = { value: t.deliveryNote, totalType: 'delivery_note', supplier: t.supplier }; break;
      case `delivery_address`:
        row[`origin_${k}`] = { value: t.deliveryAddress, totalType: 'delivery_address', supplier: t.supplier }; break;
      case `delivery_amount_note`:
        row[`origin_${k}`] = { value: t.deliveryAmountNote, totalType: 'delivery_amount_note', supplier: t.supplier }; break;
      case `discount_note`:
        row[`origin_${k}`] = { value: t.discountNote, totalType: 'discount_note', supplier: t.supplier }; break;
      case `special_offer`:
        row[`origin_${k}`] = { value: t.specialOffer, totalType: 'special_offer', supplier: t.supplier }; break;
        case `warranty`:
        row[`origin_${k}`] = { value: t.warranty, totalType: 'warranty', supplier: t.supplier }; break;
      case `after_sale_service`:
        row[`origin_${k}`] = { value: t.afterSaleService, totalType: 'after_sale_service', supplier: t.supplier }; break;
      }
  });

  result.push(row);
});

return result;
});

const getItemIndex = (record) => {
  return record.itemIndex || '';
};

const calculateTotal = (record, columnKey) => {
  if (record.isSpec) return '';
  const k = columnKey.replace("total_", "");
  const rate = record[`rate_${k}`] || 0;
  const tax = record.tax || 0;
  return (rate * (1 + tax / 100)).toLocaleString("vi-VN");
};

const remove = (supplierName) => {
  const frm = props.frm;

  frm.doc.supplier = (frm.doc.supplier || []).filter(s => s.supplier !== supplierName);
  frm.doc.mapping = (frm.doc.mapping || []).filter(m => m.supplier !== supplierName);
  frm.doc.specification = (frm.doc.specification || []).filter(s => s.supplier !== supplierName);

  frm.refresh_field("supplier");
  frm.refresh_field("mapping");
  frm.refresh_field("specification");
  frm.dirty()

  suppliers.value = frm.doc.supplier;
};

const approve = async (supplierName) => {
  const approvedSupplier = props.frm.doc.supplier.find(sup => sup.supplier = supplierName)
  const requiredFields = {
    payment_method: "Phương thức thanh toán",
    payment_note: "Thời hạn thanh toán",
    delivery_note: "Thời gian giao hàng",
    delivery_address: "Địa điểm giao hàng",
    delivery_amount_note: "Chi phí vận chuyển",
    discount_note: "Giảm giá",
    special_offer: "Khuyến mại",
    warranty: "Điều khoản bảo hành",
  };

  // Kiểm tra thiếu dữ liệu
  const missingFields = Object.keys(requiredFields).filter(
    key =>
      approvedSupplier[key] === undefined ||
      approvedSupplier[key] === null ||
      approvedSupplier[key] === ""
  );

  if (missingFields.length > 0) {
    frappe.msgprint({
      title: "Thiếu thông tin nhà cung cấp",
      message: `
        <div style="font-size: 14px; line-height: 1.6;">
          <p>Vui lòng kiểm tra và bổ sung các trường sau:</p>
          <ul style="margin-left: 15px; padding-left: 10px;">
            ${missingFields
              .map(
                key => `
                  <li style="margin-bottom: 4px;">
                    <strong>${requiredFields[key]}</strong>
                  </li>
                `
              )
              .join("")}
          </ul>
        </div>
      `,
      indicator: "red"
    });
    return;
  }
  const dialog = new frappe.ui.Dialog({
    title: `Duyệt nhà cung cấp: ${supplierName}`,
    fields: [
      {
        fieldtype: "Small Text",
        fieldname: "reason",
        label: "Lý do lựa chọn",
        reqd: 1
      }
    ],
    primary_action_label: "Xác nhận",
    primary_action: async function (values) {
      dialog.hide();
      const reason = values.reason;
      if (props.frm.is_dirty()) props.frm.save()
      const current_user = frappe.session.user;

      const employee_list = await frappe.db.get_list("Employee", {
        filters: { user_id: current_user },
        fields: ["name", "employee_name", "employee_number"]
      });

      let employee_number = null;
      let employee_name = null;
      if (employee_list.length) {
        employee_number = employee_list[0].employee_number;
        employee_name = employee_list[0].employee_name;
      }

      const supplierMappings = (props.frm.doc.mapping || []).filter(m => m.supplier === supplierName)
      const totalBase = supplierMappings.reduce((acc, m) => {
        const item = props.frm.doc.items.find(i => i.item_code === m.item_code);
        const qty = item?.qty || 0;
        const rateWithTax = (m.rate || 0) * (1 + (item.tax || 0) / 100);
        return acc + rateWithTax * qty;
      }, 0);
      const vatAmount = approvedSupplier.vat_amount || 0;

      const doc = frappe.model.get_new_doc("Purchase Approval");
      doc.quotation_comparison = props.frm.doc.name;
      doc.supplier = supplierName;
      doc.recommend_reason = reason;
      doc.employee = employee_number;
      doc.employee_name = employee_name;
      doc.posting_date = frappe.datetime.now_datetime();
      doc.material_request = props.frm.doc.material_request
      doc.payment_method = approvedSupplier.payment_method
      doc.payment_note = approvedSupplier.payment_note
      doc.delivery_address = approvedSupplier.delivery_address
      doc.delivery_note = approvedSupplier.delivery_note
      doc.delivery_amount_note = approvedSupplier.delivery_amount_note
      doc.discount_note = approvedSupplier.discount_note || "Không"
      doc.special_offer = approvedSupplier.special_offer || "Không"
      doc.warranty = approvedSupplier.warranty
      doc.after_sale_service = approvedSupplier.after_sale_service
      doc.total_row = totalBase
      doc.discount_amount = approvedSupplier.discount_amount
      doc.delivery_amount = approvedSupplier.delivery_amount
      doc.vat = vatAmount
      doc.vat_amount = totalBase * vatAmount / 100
      doc.total_amount = totalBase * (1 + vatAmount/100) + (approvedSupplier.delivery_amount || 0) - (approvedSupplier.discount_amount || 0)
      for (const row of supplierMappings) {
          const child = frappe.model.add_child(doc, "Purchase Approval Item", "items");
          const approvedItem = props.frm.doc.items.find(i => i.item_code === row.item_code);
          const qty = approvedItem?.qty || 0;

          child.item_code = row.item_code;
          child.item_name = approvedItem?.item_name;
          child.stock_uom = approvedItem?.stock_uom;
          child.rate = row.rate || 0;
          child.tax = approvedItem?.tax || 0;
          child.origin = row.origin;
          child.qty = qty;
          child.actual_qty = qty;
          child.total = qty * row.rate * (1 + (approvedItem?.tax || 0) / 100)
          let res = await frappe.xcall("erpnext.stock.utils.get_latest_stock_qty", {item_code: row.item_code})
          if (res) child.available_qty = res

          if (approvedItem.delivery_date) child.delivery_date = approvedItem.delivery_date

          const averageRate = await frappe.call({
              method: "tahp.pms.doctype.quotation_comparison.quotation_comparison.get_average_rate",
              args: {
                  supplier: row.supplier,
                  item_code: row.item_code,
                  origin: row.origin
              }
          });

          child.average_rate = averageRate.message || 0;
      }


      frappe.set_route("Form", "Purchase Approval", doc.name);
    }
  });

  dialog.show();
};

const openMaterialRequestDialog = async (frm) => {
  if (frm.is_new()) frm.save()
  const groups = await frappe.xcall(
    "tahp.pms.doctype.quotation_comparison.quotation_comparison.get_material_request"
  );

  // 1. Chuẩn bị CSS + mở đầu bảng
  let html = `
    <style>
      .mr-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .mr-table th, .mr-table td { 
        border: 1px solid #ddd; 
        padding: 8px; 
      }
      .mr-table th { background: #f5f5f5; }
      .group-cell {
        font-weight: bold;
        background: #fafafa;
        text-align: center;
        vertical-align: middle;
      }
      .checkbox-cell {
        text-align: center;
      }
      .big-checkbox {
        width: 20px; height: 20px;
      }
    </style>

    <table class="mr-table">
      <tr>
        <th>Loại yêu cầu</th>
        <th>Mã yêu cầu</th>
        <th>Chọn</th>
      </tr>
  `;

  // 2. Duyệt từng nhóm và tạo table với rowspan
  groups.forEach(group => {
    const rows = group.items.length;

    group.items.forEach((item, index) => {
      const fieldname = `mr_${item.name.replace(/[-\s]/g, "_")}`;

      html += `<tr>`;

      // Cột 1 — chỉ render 1 lần cho cả group (rowspan)
      if (index === 0) {
        html += `
          <td class="group-cell" rowspan="${rows}">
            ${group.request_type}
          </td>
        `;
      }

      // Cột 2 — tên request
      html += `
        <td>${item.name}</td>
      `;

      // Cột 3 — checkbox
      html += `
        <td class="checkbox-cell">
          <input type="checkbox" class="big-checkbox" data-fieldname="${fieldname}"/>
        </td>
      `;

      html += `</tr>`;
    });
  });

  html += `</table>`;

  // 3. Tạo dialog
  const dialog = new frappe.ui.Dialog({
    title: "Chọn yêu cầu mua hàng",
    fields: [
      {
        fieldtype: "HTML",
        fieldname: "mr_html",
        options: html
      }
    ],
    primary_action_label: "Xác nhận",
    primary_action: async () => {
      const selected = [];

      dialog.$wrapper.find("input[type='checkbox']").each(function () {
        if (this.checked) {
          const mr_name = this.dataset.fieldname.replace("mr_", "").replace(/_/g, "-");
          selected.push(mr_name);
        }
      });

      if (!selected.length) {
        frappe.msgprint("Vui lòng chọn ít nhất một yêu cầu mua hàng.");
        return;
      }

      dialog.hide();

      await frappe.xcall(
        "tahp.pms.doctype.quotation_comparison.quotation_comparison.add_request",
        {
          names: selected,
          comparison: frm.doc.name
        }
      );
    }
  });

  dialog.show();
};

const addSupplier = () => {
  const current = suppliers.value.map(s => s.supplier);

  frappe.prompt(
    [{
      fieldtype: "Link",
      fieldname: "supplier",
      label: "Nhà cung cấp",
      options: "Supplier",
      reqd: 1,
      get_query: () => ({
        filters: { name: ["not in", current] }
      })
    }],
    (values) => processAddSupplier(values.supplier)
  );
};

const processAddSupplier = async (supplierName) => {
  const frm = props.frm;

  const row = frm.add_child("supplier");
  row.supplier = supplierName;

  const items = frm.doc.items || [];
  const qa_master = frm.doc.qa_master || [];

  const latest = await frappe.xcall(
    "tahp.pms.doctype.quotation_comparison.quotation_comparison.get_latest_rate",
    { supplier: supplierName }
  );

  items.forEach(item => {
    const r = frm.add_child("mapping");
    r.item_code = item.item_code;
    r.supplier = supplierName;
    const lt = latest[item.item_code];
    r.rate = lt?.rate || 0;
    r.origin = lt?.origin || "";
  });

  qa_master.forEach(item => {
    const r = frm.add_child("specification")
    r.item_code = item.item_code
    r.supplier = supplierName
    r.specification = item.specification
  })

  frm.refresh_field("supplier");
  frm.refresh_field("mapping");
  frm.refresh_field("specification");

  suppliers.value = [...frm.doc.supplier];
};

const addQuality = (record) => {
  const frm = props.frm;

  const item_code = record.item_code;

  // Lấy các specification của item trong qa_master
  const availableSpecs = frm.doc.qa_master
    .filter(q => q.item_code === item_code)
    .map(q => q.specification);

  frappe.prompt(
    [
      {
        fieldtype: "Link",
        fieldname: "spec",
        label: "Thông số kỹ thuật",
        options: "Quality Inspection Parameter",
        get_query: () => ({
          filters: { name: ["not in", availableSpecs] }
        })
      }
    ],
    async (values) => {
      let spec = values.spec;

      const existsInMaster = frm.doc.qa_master.some(
        x => x.item_code === item_code && x.specification === spec
      );

      if (!existsInMaster) {
        const row = frm.add_child("qa_master");
        row.item_code = item_code;
        row.specification = spec;
      }

      suppliers.value.forEach(sup => {
        const existsInSpec = frm.doc.specification.some(
          x => x.item_code === item_code &&
               x.supplier === sup.supplier &&
               x.specification === spec
        );
        if (!existsInSpec) {
          const row2 = frm.add_child("specification");
          row2.item_code = item_code;
          row2.supplier = sup.supplier;
          row2.specification = spec;
          row2.current_status = "";
        }
      });

      frm.refresh_field("qa_master");
      frm.refresh_field("specification");
      frm.refresh_field("items");
      frm.dirty();

      if (!existsInMaster) {
        await frappe.xcall(
          "tahp.pms.doctype.quotation_comparison.quotation_comparison.save_qa_group",
          { item_code, specification: spec }
        );
      }

      specVersion.value++;
    }
  );
};

const removeSpec = (record) => {
  const frm = props.frm;

  const item_code = record.parentItemCode;
  const spec = record.specName;

  frm.doc.qa_master = frm.doc.qa_master.filter(
    x => !(x.item_code === item_code && x.specification === spec)
  );

  frm.doc.specification = frm.doc.specification.filter(
    x => !(x.item_code === item_code && x.specification === spec)
  );

  frm.refresh_field("qa_master");
  frm.refresh_field("specification");
  frm.refresh_field("items");
  frm.dirty();

  specVersion.value++;
};

const createAllControls = () => {
  const data = dataSource.value;

  data.forEach((record) => {
    if (record.isSpec) {
      suppliers.value.forEach((sup) => {
        const k = sup.supplier.replace(/\s+/g, "_");
        const cellKey = `origin_${k}_${record.key}`;
        createSpecStatusControl(record, k, cellKey);
      });
    } 
    else if (record.isTotalRow) {
      suppliers.value.forEach((sup) => {
        const k = sup.supplier.replace(/\s+/g, "_");
        const cellKey = `origin_${k}_${record.key}`;
        if (['total_delivery', 'total_discount'].includes(record.key)) createTotalFloatControl(record, k, cellKey);
        for (let row of specialRows) {
          if (record.key === row.key) {
            if (row.smallText === true) {
              createSmallTextControl({
                record,
                supplierKey: k,
                cellKey: cellKey,
                fieldname: row.fieldname,
              });
            } else if (row.float === true) {
              createFloatControl({
                record,
                supplierKey: k,
                cellKey: cellKey,
                fieldname: row.fieldname,
              }); 
            } else if (row.select === true) {
              createSelectControl({
                record,
                supplierKey: k,
                cellKey: cellKey,
                fieldname: row.fieldname,
              });              
            }else {
              createLinkControl({
                record,
                supplierKey: k,
                cellKey: cellKey,
                doctype: row.doctype,
                fieldname: row.fieldname,
                label: row.stt
              });
            }
          }
        }
      });
    }
    else {
      createItemTaxControl(record, `tax_${record.key}`);
      suppliers.value.forEach((sup) => {
        const k = sup.supplier.replace(/\s+/g, "_");
        createOriginControl(record, k, `origin_${k}_${record.key}`);
        createRateControl(record, k, `rate_${k}_${record.key}`);
        createTaxControl(record, k, `tax_${k}_${record.key}`);
      });
    }
  });
};

const createItemTaxControl = (record, cellKey) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_${cellKey}"]`);
    if (!container || container.dataset.controlInitialized) return;
    
    container.innerHTML = '';
    container.dataset.controlInitialized = 'true';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 4px;';
    
    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'flex: 1;';
    
    const percentSpan = document.createElement('span');
    percentSpan.textContent = '%';
    percentSpan.style.cssText = 'font-weight: 500;';
    
    wrapper.appendChild(inputDiv);
    wrapper.appendChild(percentSpan);
    container.appendChild(wrapper);
    
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Float',
        fieldname: 'tax'
      },
      parent: inputDiv,
      only_input: true,
      frm: props.frm
    });
    
    control.refresh();
    control.$input.val(record.tax || 0);
    control.$input.addClass('text-center');
    
    control.$input.on('input', async () => {
      const value = control.get_value();
      await updateItemTax(record.item_code, value);
    });
    
    controlsMap.value[cellKey] = control;
  });
};

// Thêm hàm update
const updateItemTax = async (item_code, value) => {
  const frm = props.frm;
  const item = frm.doc.items.find(i => i.item_code === item_code);
  
  if (item) {
    await frappe.model.set_value(item.doctype, item.name, 'tax', value);
    frm.refresh_field('items');
    frm.dirty();
    specVersion.value++;
  }
};

const createLinkControl = ({
  record,
  supplierKey,
  cellKey, // dùng trực tiếp cellKey
  doctype,
  fieldname,
  label,
  frm = props.frm,
  childTable = 'supplier',
  only_select = true
}) => {
  nextTick(() => {
    // Lấy container dựa trên cellKey, giống createTotalFloatControl
    const container = document.querySelector(`[data-ref="cell_${cellKey}"]`);
    if (!container || container.dataset.controlInitialized) return;

    container.innerHTML = '';

    if (isSubmitted.value) {
      const value = record[`origin_${supplierKey}`]?.value ?? "";
      container.textContent = value;
      return;
    }

    container.dataset.controlInitialized = 'true';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 4px;';

    const linkDiv = document.createElement('div');
    linkDiv.style.cssText = 'flex: 1;';

    const plusDiv = document.createElement('div');
    plusDiv.style.cssText = 'cursor: pointer; color: #1890ff; line-height: 0;';
    plusDiv.innerHTML = '<span style="font-size: 16px;padding-inline:5px"> + </span>';

    wrapper.appendChild(linkDiv);
    wrapper.appendChild(plusDiv);
    container.appendChild(wrapper);

    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Link',
        options: doctype,
        fieldname,
        only_select
      },
      parent: linkDiv,
      only_input: true,
      frm
    });

    control.refresh();
    const val = record[`origin_${supplierKey}`]?.value ?? "";
    control.$input.val(val);
    control.$input.css({"text-align": "center"})

    // Khi chọn giá trị
    control.$input.on('awesomplete-selectcomplete', async () => {
      const value = control.get_value();
      const supplierRow = frm.doc[childTable].find(r => r.supplier.replace(/\s+/g, "_") === supplierKey);
      if (!supplierRow) {
        frappe.msgprint(`Không tìm thấy row supplier cho ${supplierKey}`);
        return;
      }

      supplierRow[fieldname] = value;
      frm.dirty()
      frm.refresh_field(childTable);
    });

    // Khi nhấn dấu +
    plusDiv.onclick = () => {
      frappe.prompt(
        [
          {
            fieldtype: 'Data',
            fieldname: `${fieldname}`,
            label,
            reqd: 1
          }
        ],
        async (values) => {
          try {
            const newDoc = await frappe.xcall('frappe.client.insert', {
              doc: {
                doctype,
                [`${fieldname}`]: values[`${fieldname}`]
              }
            });

            control.$input.val(newDoc.name);
            control.set_value(newDoc.name);

            // Cập nhật vào supplier
            const supplierRow = frm.doc[childTable].find(r => r.supplier.replace(/\s+/g, "_") === supplierKey);
            if (supplierRow) {
              supplierRow[fieldname] = newDoc.name;
              frm.refresh_field(childTable);
            }
            frm.dirty()
            frappe.show_alert({ message: `${label} mới đã tạo`, indicator: 'green' });
          } catch (err) {
            frappe.msgprint({ title: 'Lỗi', message: err.message, indicator: 'red' });
          }
        },
        `Tạo ${label} mới`
      );
    };

    controlsMap.value[cellKey] = control;
  });
};

const createSmallTextControl = ({
  record,
  supplierKey,
  cellKey, // dùng trực tiếp cellKey
  fieldname = 'current_status',
  frm = props.frm,
  childTable = 'supplier'
}) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_${cellKey}"]`);
    if (!container || container.dataset.controlInitialized) return;

    container.innerHTML = '';

    if (isSubmitted.value) {
      const valObj = record[`origin_${supplierKey}`];
      const val = typeof valObj === 'object' && valObj !== null ? valObj.value || '' : valObj || '';
      container.textContent = val;
      return;
    }

    container.dataset.controlInitialized = 'true';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 4px;';

    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'flex: 1;';

    wrapper.appendChild(inputDiv);
    container.appendChild(wrapper);

    // Tạo control Small Text
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Small Text',
        fieldname
      },
      parent: inputDiv,
      only_input: true,
      frm
    });

    control.refresh();
    const formGroupDiv = inputDiv.querySelector('.form-group.frappe-control');
    if (formGroupDiv) {
      formGroupDiv.style.marginRight = '23px';
    }

    // Gán giá trị từ record
    const valObj = record[`origin_${supplierKey}`];
    const val = typeof valObj === 'object' && valObj !== null ? valObj.value || '' : valObj || '';
    control.$input.val(val);

    // Style textarea
    control.$input.attr('style', `
      overflow: hidden !important;
      resize: none !important;
      box-sizing: border-box !important;
      line-height: 1.2 !important;
      min-height: 30px !important;
      height: 30px !important;
      text-align: center;
    `);

    // Auto adjust height khi nhập
    control.$input.on('input', function() {
      adjustTextareaHeight(this);
    });

    // Khi value thay đổi, update vào supplier
    control.$input.on('change', async () => {
      const value = control.get_value();
      const supplierRow = frm.doc[childTable].find(r => r.supplier.replace(/\s+/g, "_") === supplierKey);
      if (!supplierRow) return;
      supplierRow[fieldname] = value;
      frm.dirty();
      frm.refresh_field(childTable);
    });

    adjustTextareaHeight(control.$input[0]);

    controlsMap.value[cellKey] = control;
  });
};

const createFloatControl = ({
  record,
  supplierKey,
  cellKey,
  fieldname = "value",
  frm = props.frm,
  childTable = "supplier"
}) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_${cellKey}"]`);
    if (!container || container.dataset.controlInitialized) return;

    container.innerHTML = '';

    // Mode xem
    if (isSubmitted.value) {
      const valObj = record[`origin_${supplierKey}`];
      const val = typeof valObj === "object" && valObj !== null ? valObj.value ?? 0 : valObj ?? 0;
      container.textContent = Number(val).toLocaleString("vi-VN");
      container.style.fontWeight = "bold";
      container.style.textAlign = "center";
      return;
    }

    container.dataset.controlInitialized = "true";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; justify-content: center; align-items: center;";
    container.appendChild(wrapper);

    const inputDiv = document.createElement("div");
    inputDiv.style.cssText = "flex: 1;";
    wrapper.appendChild(inputDiv);

    // Tạo Float control
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: "Float",
        fieldname
      },
      parent: inputDiv,
      only_input: true,
      frm
    });

    control.refresh();

    // Set value ban đầu
    const valObj = record[`origin_${supplierKey}`];
    const val = typeof valObj === "object" && valObj !== null ? valObj.value ?? 0 : valObj ?? 0;
    control.$input.val(val);
    control.$input.css({ "text-align": "center", "font-weight": "bold" });

    // Khi thay đổi
    control.$input.on("input", async () => {
      const newValue = Number(control.get_value() || 0);

      // Ghi vào record local
      if (typeof record[`origin_${supplierKey}`] === "object") {
        record[`origin_${supplierKey}`].value = newValue;
      } else {
        record[`origin_${supplierKey}`] = { value: newValue };
      }

      // Ghi vào child table
      const supplierRow = frm.doc[childTable].find(
        r => r.supplier.replace(/\s+/g, "_") === supplierKey
      );
      if (supplierRow) {
        supplierRow[fieldname] = newValue;
      }

      frm.dirty();
      frm.refresh_field(childTable);
      specVersion.value++;
    });
    controlsMap.value[cellKey] = control;
  });
};

const createSelectControl = ({
  record,
  supplierKey,
  cellKey,
  fieldname,
  frm = props.frm,
  childTable = "supplier"
}) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_${cellKey}"]`);
    if (!container || container.dataset.controlInitialized) return;

    container.innerHTML = "";
    container.dataset.controlInitialized = "true";

    // --- LẤY OPTIONS TỪ META ---
    let fieldMeta;

    // Trường trong child table
    if (childTable) {
      const childDoctype = frm.fields_dict[childTable].df.options;
      fieldMeta = frappe.get_meta(childDoctype).fields.find(f => f.fieldname === fieldname);
    }

    // Trường trong parent form
    if (!fieldMeta) {
      fieldMeta = frm.fields_dict[fieldname]?.df;
    }

    if (!fieldMeta) {
      console.warn("Không tìm thấy meta cho field:", fieldname);
      return;
    }

    // Chuyển options thành array
    let optionsList = [];
    if (typeof fieldMeta.options === "string") {
      optionsList = fieldMeta.options.split("\n").filter(o => o.trim() !== "");
    } else if (Array.isArray(fieldMeta.options)) {
      optionsList = fieldMeta.options;
    }

    // --- Tạo control Select ---
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: "Select",
        fieldname,
        options: optionsList.join("\n"),
        placeholder: fieldMeta.placeholder || "",
      },
      parent: container,
      only_input: true,
      frm,
    });

    control.refresh();

    const valObj = record[`origin_${supplierKey}`];
    const val = typeof valObj === "object" && valObj !== null ? valObj.value ?? '' : valObj ?? '';
    control.$input.val(val);
    control.$input.css({ "text-align": "center"});

    control.$input.on("input", () => {
      const newValue = control.get_value();

      if (typeof record[`origin_${supplierKey}`] === "object") {
        record[`origin_${supplierKey}`].value = newValue;
      } else {
        record[`origin_${supplierKey}`] = { value: newValue };
      }

      if (childTable) {
        const row = frm.doc[childTable].find(
          r => r.supplier.replace(/\s+/g, "_") === supplierKey
        );
        if (row) row[fieldname] = newValue;
      }

      frm.dirty();
      if (childTable) frm.refresh_field(childTable);
    });
  });
};

const createOriginControl = (record, supplierKey, cellKey) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_origin_${supplierKey}_${record.key}"]`);
    if (!container || container.dataset.controlInitialized) return;
    
    container.innerHTML = '';
    if (isSubmitted.value) {
      container.textContent = record[`origin_${supplierKey}`] || '';
      return;
    }
    container.dataset.controlInitialized = 'true';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 4px;';
    
    const linkDiv = document.createElement('div');
    linkDiv.style.cssText = 'flex: 1;';
    
    const plusDiv = document.createElement('div');
    plusDiv.style.cssText = 'cursor: pointer; color: #1890ff; line-height: 0;';
    plusDiv.innerHTML = '<span style="font-size: 16px;padding-inline:5px"> + </span>';
    
    wrapper.appendChild(linkDiv);
    wrapper.appendChild(plusDiv);
    container.appendChild(wrapper);
    
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Link',
        options: 'Custom Origin',
        fieldname: 'origin',
        only_select: true
      },
      parent: linkDiv,
      only_input: true,
      frm: props.frm
    });
    
    control.refresh();
    control.$input.val(record[`origin_${supplierKey}`] || '');
    
    control.$input.on('awesomplete-selectcomplete', async () => {
      const value = control.get_value();
      await updateMapping(record.item_code, supplierKey, 'origin', value);
    });
    
    plusDiv.onclick = () => {
      frappe.prompt(
        [
          {
            fieldtype: 'Data',
            fieldname: 'origin_name',
            label: 'Tên xuất xứ',
            reqd: 1
          }
        ],
        async (values) => {
          try {
            const newOrigin = await frappe.xcall(
              'frappe.client.insert',
              {
                doc: {
                  doctype: 'Custom Origin',
                  origin_name: values.origin_name
                }
              }
            );
            
            control.$input.val(newOrigin.name);
            control.set_value(newOrigin.name);
            await updateMapping(record.item_code, supplierKey, 'origin', newOrigin.name);
            frappe.show_alert({ message: 'Đã tạo xuất xứ mới', indicator: 'green' });
          } catch (err) {
            frappe.msgprint({ title: 'Lỗi', message: err.message, indicator: 'red' });
          }
        },
        'Tạo xuất xứ mới'
      );
    };
    
    controlsMap.value[cellKey] = control;
  });
};

const createRateControl = (record, supplierKey, cellKey) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_rate_${supplierKey}_${record.key}"]`);
    if (!container || container.dataset.controlInitialized) return;
    
    container.innerHTML = '';
    if (isSubmitted.value) {
      const value = record[`rate_${supplierKey}`] || 0;
      container.textContent = value.toLocaleString("vi-VN");
      return;
    }
    container.dataset.controlInitialized = 'true';
    
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Float',
        fieldname: 'rate'
      },
      parent: container,
      only_input: true,
      frm: props.frm
    });
    
    control.refresh();
    control.$input.val(record[`rate_${supplierKey}`] || 0);
    control.$input.addClass('text-center');
    
    control.$input.on('input', async () => {
      const value = control.get_value();
      await updateMapping(record.item_code, supplierKey, 'rate', value);
    });
    
    controlsMap.value[cellKey] = control;
  });
};

const createTaxControl = (record, supplierKey, cellKey) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_tax_${supplierKey}_${record.key}"]`);
    if (!container || container.dataset.controlInitialized) return;
    
    container.innerHTML = '';
    if (isSubmitted.value) {
      const value = record[`tax_${supplierKey}`] || 0;
      container.textContent = `${value}%`;
      return;
    }
    container.dataset.controlInitialized = 'true';
    
    // Create wrapper with input and % suffix
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 4px;';
    
    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'flex: 1;';
    
    const percentSpan = document.createElement('span');
    percentSpan.textContent = '%';
    percentSpan.style.cssText = 'font-weight: 500;';
    
    wrapper.appendChild(inputDiv);
    wrapper.appendChild(percentSpan);
    container.appendChild(wrapper);
    
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Float',
        fieldname: 'tax'
      },
      parent: inputDiv,
      only_input: true,
      frm: props.frm
    });
    
    control.refresh();
    control.$input.val(record[`tax_${supplierKey}`] || 0);
    control.$input.addClass('text-center');
    
    control.$input.on('input', async () => {
      const value = control.get_value();
      await updateMapping(record.item_code, supplierKey, 'tax', value);
    });
    
    controlsMap.value[cellKey] = control;
  });
};

const createSpecStatusControl = (record, supplierKey, cellKey) => {
  nextTick(() => {
    const container = document.querySelector(`[data-ref="cell_origin_${supplierKey}_${record.key}"]`);
    if (!container || container.dataset.controlInitialized) return;
    
    container.innerHTML = '';
    if (isSubmitted.value) {
      container.textContent = record[`origin_${supplierKey}`] || '';
      return;
    }
    container.dataset.controlInitialized = 'true';
    
    const control = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Small Text',
        fieldname: 'current_status'
      },
      parent: container,
      only_input: true,
      frm: props.frm
    });
    
    control.refresh();
    control.$input.val(record[`origin_${supplierKey}`] || '');
    control.$input.attr('style', `
      overflow: hidden !important;
      resize: none !important;
      box-sizing: border-box !important;
      line-height: 1.2 !important;
      min-height: 30px !important;
      height: 30px !important;
    `);
    
    control.$input.on('input', function() {
      adjustTextareaHeight(this);
    });
    
    control.$input.on('change', async () => {
      const value = control.get_value();
      await updateSpecification(record.parentItemCode, supplierKey, record.specName, value);
    });
    
    adjustTextareaHeight(control.$input[0]);
    controlsMap.value[cellKey] = control;
  });
};

const updateMapping = async (item_code, supplierKey, field, value) => {
  const frm = props.frm;
  const supplierName = suppliers.value.find(s => s.supplier.replace(/\s+/g, "_") === supplierKey)?.supplier;
  
  if (!supplierName) return;
  
  const mapping = frm.doc.mapping.find(
    m => m.item_code === item_code && m.supplier === supplierName
  );
  
  if (mapping) {
    specVersion.value++;
    await frappe.model.set_value(mapping.doctype, mapping.name, field, value);
    frm.refresh_field('mapping');
    frm.dirty();
  }
};

const updateSpecification = async (item_code, supplierKey, specification, value) => {
  const frm = props.frm;
  const supplierName = suppliers.value.find(s => s.supplier.replace(/\s+/g, "_") === supplierKey)?.supplier;
  
  if (!supplierName) return;
  
  const spec = frm.doc.specification.find(
    s => s.item_code === item_code && s.supplier === supplierName && s.specification === specification
  );
  
  if (spec) {
    specVersion.value++;
    await frappe.model.set_value(spec.doctype, spec.name, 'current_status', value);
    frm.refresh_field('specification');
    frm.dirty();
  }
};

const updateVat = (value) => {
  props.frm.doc.supplier.forEach(s => {
    s.vat_amount = value
  });
  props.frm.refresh_field("supplier")
  props.frm.dirty()

  suppliers.value.forEach((sup) => {
    const k = sup.supplier.replace(/\s+/g, "_");
    const totalRow = dataSource.value.find(r => r.key === 'total_row');
    if (totalRow) {
      const baseTotal = totalRow[`origin_${k}`]?.value || 0;
      const vatAmount = baseTotal * value / 100;
      const vatRow = dataSource.value.find(r => r.key === 'total_vat');
      if (vatRow) {
        vatRow[`origin_${k}`].value = vatAmount;
      }
    }
  })

  specVersion.value++;
};

</script>

<style scoped>
:deep(.ant-table-thead > tr > th.col-header-even) {
  background: #E0F8D8 !important;
}

:deep(.ant-table-thead > tr > th.col-header-odd) {
  background: #D7ECFF !important;
}

:deep(.ant-table-thead > tr > th.col-header-approved) {
  background: #78ffc0 !important;
}

:deep(.ant-table-thead > tr > th.col-header-remaining) {
  background: #dadada !important;
}

:deep(.ant-table-cell) {
  padding: 10px !important;
}
</style>