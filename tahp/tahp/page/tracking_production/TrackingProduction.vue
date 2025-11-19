<template>
  <a-spin
    v-if="loading"
    size="large"
    class="full-screen-spin"
    tip=" Đang tải dữ liệu..."
  />
  <div v-else-if="error">{{ error }}</div>
  <div v-else>
    <!-- Desktop Table -->
    <div class="d-none d-md-block">
      <a-table
        :columns="columns"
        :data-source="flattenedData"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        class="lsx-table"
        :row-class-name="getRowClassName"
        :show-expand-column="false"
      >
        <template #bodyCell="{ column, record }">
          <!-- Cột Icon Expand -->
          <template v-if="column.key === 'expand'">
            <div class="tw-flex tw-items-center tw-justify-center">
              <button 
                v-if="record.isParent && record.hasChildren"
                @click="toggleExpand(record.key)"
                class="tw-border-none tw-bg-gray-200 tw-cursor-pointer tw-p-1 hover:tw-bg-gray-200 tw-rounded"
                style="border: none !important; display: flex; justify-content: center;align-items: center;width: 25px; height: 25px;"
              >
                <CaretDownOutlined v-if="record.expanded" class="tw-text-gray-600" />
                <CaretRightOutlined v-else class="tw-text-gray-600" />
              </button>
            </div>
          </template>

          <!-- Cột Mã LSX/LSX Ca -->
          <template v-else-if="column.key === 'lsx_name'">
          <div 
            class="tw-flex tw-items-start tw-gap-2"
            :class="record.isWO ? 'tree-connector' : ''"
            style="padding-block: 20px; padding-left: 10px;"
          >
            <div class="tw-space-y-1">
              <a-tag v-if="record.isParent" color="cyan">Kế hoạch</a-tag>
              <a-tag v-if="record.isWO" color="purple">LSX Ca</a-tag>
              <div class="tw-font-medium">{{ record.lsx_name }}</div>
            </div>
          </div>
        </template>

          <!-- Cột Sản phẩm -->
          <template v-else-if="column.key === 'items'">
            <div class="tw-space-y-3 tw-text-sm">
              <template v-if="record.isParent">
                <div v-for="(pa, idx) in record.posts" :key="idx" class="tw-leading-5">
                  <div class="tw-font-medium">Phương án {{ idx + 1 }}:</div>
                  <div v-for="(item, itemIdx) in pa" :key="itemIdx">
                    • {{ item.qty }} {{ item.stock_uom }} {{ item.item_name }}
                  </div>
                </div>
              </template>

              <template v-else-if="record.isWO">
                <div v-for="(item, idx) in record.items" :key="idx" class="tw-leading-5">
                  <div class="tw-font-medium">Sản phẩm: {{ item.item_name }} </div>
                  <div>Số lượng: {{ item.qty }} {{ item.stock_uom }}</div>
                  <div>Ca làm: {{ item.shift }}</div>
                </div>
              </template>
            </div>
          </template>

          <!-- Cột Quy trình -->
          <template v-else-if="column.key === 'steps'">
            <div class="tw-py-4 tw-w-full">
              <div class="tw-relative tw-w-full tw-overflow-x-auto">
                <div class="tw-flex tw-items-start tw-relative" style="min-height: 100px;">
                  <template v-for="(step, idx) in record.steps" :key="idx">
                    <div 
                      class="tw-flex tw-flex-col tw-items-start tw-relative" 
                      :style="{ width: idx < record.steps.length - 1 ? '180px' : '160px' }"
                    >
                      <!-- Dot và Line -->
                      <div class="tw-flex tw-items-center tw-w-full">
                        <div 
                          @click="handleStepClick(step)"
                          :class="['tw-cursor-pointer tw-w-10 tw-h-10 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow tw-flex-shrink-0 tw-text-xl', getStepDotColor(step.state)]"
                        >
                          <CheckCircleFilled 
                            v-if="step.state === 'completed'" 
                            class="tw-text-white" 
                          />
                          <CheckCircleFilled 
                            v-else-if="step.state === 'warning'" 
                            class="tw-text-white" 
                          />
                          <CheckCircleFilled 
                            v-else-if="step.state === 'danger'" 
                            class="tw-text-white" 
                          />
                          <SyncOutlined 
                            v-else-if="step.state === 'processing' || step.state.includes('late')"
                            :spin="true" 
                            class="tw-text-white"
                          />
                          <div 
                            v-else 
                            class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-white"
                          ></div>
                        </div>

                        <!-- Line nối -->
                        <div v-if="idx < record.steps.length - 1" :class="['tw-h-0.5 tw-flex-1', getStepLineColor(step.state)]"></div>
                      </div>

                      <!-- Nội dung -->
                      <div class="tw-mt-3 tw-text-left tw-pr-4">
                        <div :class="['tw-font-semibold tw-text-sm tw-mb-1', getStateTextColor(step.state)]">
                          {{ step.label }}
                        </div>
                        <div class="tw-space-y-1">
                          <div v-if="step.updated" class="tw-text-xs tw-text-gray-400">{{ step.updated }}</div>
                          <a-tag v-if="step.status" :color="getTagColor(step.state)" class="tw-text-xs">
                            {{ step.status }}
                          </a-tag>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Tổng thời gian và Đánh giá -->
              <div v-if="record.total_time" class="tw-mt-4 tw-pt-3 tw-border-t tw-border-gray-200">
                <div class="tw-flex tw-items-center tw-gap-2 tw-text-sm">
                  <span class="tw-text-gray-600">Tổng thời gian: </span>
                  <span :class="['tw-font-bold', getStateTextColor(record.total_time.state)]">
                      {{ record.total_time.time_count }}
                  </span>
                  <span class="tw-text-gray-600">Đánh giá:</span>
                  <a-tag :color="getTagColor(record.total_time.state)">
                    {{ getTimeStateText(record.total_time.state) }}
                  </a-tag>
                </div>
              </div>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Mobile Card -->
    <div class="d-block d-md-none">
      <template v-for="record in tableData" :key="record.key">
        <div class="tw-border tw-rounded-lg tw-bg-white" style="border: 1px solid #eee; padding: 10px;margin-top: 35px;">
          <!-- Header -->
          <div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
            <div class="tw-flex tw-items-center tw-gap-2">
              <a-tag v-if="record.isParent" color="cyan" class="tw-m-0">Kế hoạch</a-tag>
              <span class="tw-font-medium">{{ record.lsx_name }}</span>
            </div>
            <div class="tw-flex tw-items-center tw-justify-center tw-gap-1">
              <template v-for="(step, idx) in record.steps.filter(s => s.label !== 'LSX bị dừng')" :key="idx">
                <div
                  :class="[
                    'tw-w-4 tw-h-4 tw-rounded tw-flex tw-items-center tw-justify-center tw-cursor-pointer',
                    getStepDotColor(step.state)
                  ]"
                >
                  <CheckOutlined 
                    v-if="['completed','warning','danger'].includes(step.state)" 
                    class="tw-text-white tw-text-[12px]" 
                  />
                  <SyncOutlined 
                    v-else-if="['processing','late_danger','late_warning'].includes(step.state)"
                    :spin="true" 
                    class="tw-text-white tw-text-[12px]" 
                  />
                </div>
              </template>
            </div>
          </div>

          <!-- Body -->
          <div class="tw-flex tw-flex-col tw-gap-2">
            <div class="tw-flex tw-justify-between tw-items-start tw-gap-2">
              <!-- Phương án / Items -->
              <div class="tw-flex-1 tw-space-y-1 tw-text-xs">
                <div v-for="(pa, idx) in record.posts" :key="idx" class="tw-leading-5">
                  <div class="tw-font-medium">Phương án {{ idx + 1 }}:</div>
                  <div v-for="(item, itemIdx) in pa" :key="itemIdx">
                    • {{ item.qty }} {{ item.stock_uom }} {{ item.item_name }}
                  </div>
                </div>
              </div>

              <!-- Thời gian / Đánh giá -->
              <div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-text-xs">
                <div :class="['tw-font-bold', getStateTextColor(record.total_time?.state)]">
                  {{ record.total_time?.time_count }}
                </div>
                <a-tag v-if="record.stopped" color="orange" class="tw-m-0">Bị dừng</a-tag>
                <a-tag 
                  v-if="record.total_time" 
                  :color="getTagColor(record.total_time.state)" 
                  class="tw-block tw-text-right tw-m-0"
                >
                  {{ getTimeStateText(record.total_time.state) }}
                </a-tag>
              </div>
            </div>

            <!-- Timeline: chỉ hiển thị khi expanded -->
            <div v-if="record.expanded" class="tw-w-full">
              <!-- Timeline của parent -->
              <div class="tw-py-4 tw-w-full mobile-card-tracking">
                <div class="tw-relative tw-w-full tw-overflow-x-auto">
                  <div class="tw-flex tw-items-start tw-relative tw-items-stretch">
                    <template v-for="(step, idx) in record.steps" :key="idx">
                      <div class="tw-flex tw-flex-col tw-items-start tw-relative tw-flex-shrink-0" :style="{ width: '100px' }">
                        <!-- Dot & Line -->
                        <div class="tw-flex tw-items-center tw-w-full">
                          <div 
                            @click="handleStepClick(step)"
                            :class="['tw-cursor-pointer tw-w-6 tw-h-6 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow tw-flex-shrink-0', getStepDotColor(step.state)]"
                          >
                            <CheckCircleFilled 
                              v-if="step.state === 'completed'" 
                              class="tw-text-white" 
                            />
                            <CheckCircleFilled 
                              v-else-if="step.state === 'warning'" 
                              class="tw-text-white" 
                            />
                            <CheckCircleFilled 
                              v-else-if="step.state === 'danger'" 
                              class="tw-text-white" 
                            />
                            <SyncOutlined 
                              v-else-if="step.state === 'processing' || step.state.includes('late')"
                              :spin="true" 
                              class="tw-text-white"
                            />
                            <div 
                              v-else 
                              class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-white"
                            ></div>
                          </div>
                          <div v-if="idx < record.steps.length - 1" :class="['tw-h-0.5 tw-flex-1', getStepLineColor(step.state)]"></div>
                        </div>
                        <!-- Label + Status -->
                        <div class="tw-flex tw-flex-col tw-justify-between tw-flex-grow tw-mt-3 tw-w-full">
                          <div class="tw-font-semibold tw-text-xs tw-mr-2">{{ step.label }}</div>
                          <div class="tw-space-x-1 tw-text-xs tw-my-2">
                            <div v-if="step.updated" class="tw-text-gray-400 tw-mb-1">{{ step.updated }}</div>
                            <a-tag v-if="step.status" :color="getTagColor(step.state)" class="tw-text-xs"  style="margin-left: 0 !important; margin-right: 20px !important; white-space: normal;">
                              {{ step.status }}
                            </a-tag>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Children Cards bên trong -->
              <template v-if="record.children && record.children.length > 0">
                <div class="tw-mt-3 tw-space-y-2">
                  <div 
                    v-for="child in record.children" 
                    :key="child.key"
                    class="tw-border tw-rounded-lg tw-bg-gray-50" 
                    style="border: 1px solid #e0e0e0; padding: 10px;"
                  >
                    <!-- Header -->
                    <div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
                      <div class="tw-flex tw-items-center tw-gap-2">
                        <a-tag color="purple" class="tw-m-0">Ca</a-tag>
                        <span class="tw-font-medium tw-text-sm">{{ child.lsx_name }}</span>
                      </div>
                      <div class="tw-flex tw-items-center tw-justify-center tw-gap-1">
                        <template v-for="(step, idx) in child.steps" :key="idx">
                          <div
                            :class="[
                              'tw-w-4 tw-h-4 tw-rounded tw-flex tw-items-center tw-justify-center',
                              getStepDotColor(step.state)
                            ]"
                          >
                            <CheckOutlined 
                              v-if="step.state === 'completed' || step.state === 'warning'" 
                              class="tw-text-white tw-text-[12px]" 
                            />
                            <CheckOutlined 
                              v-else-if="step.state === 'danger'"
                              class="tw-text-white tw-text-[12px]"
                            />
                            <SyncOutlined 
                              v-else-if="step.state === 'processing' || step.state.includes('late')"
                              :spin="true" 
                              class="tw-text-white tw-text-[12px]" 
                            />
                          </div>
                        </template>
                      </div>
                    </div>

                    <!-- Body -->
                    <div class="tw-flex tw-justify-between tw-items-start tw-gap-2">
                      <div class="tw-flex-1 tw-space-y-1 tw-text-xs">
                        <div v-for="(item, idx) in child.items" :key="idx" class="tw-leading-5">
                          <div class="tw-font-medium">Sản phẩm: {{ item.item_name }} </div>
                          <div>Số lượng: {{ item.qty }} {{ item.stock_uom }}</div>
                          <div>Ca làm: {{ item.shift }}</div>
                        </div>
                      </div>
                      <div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-text-xs">
                        <div :class="['tw-font-bold', getStateTextColor(child.total_time?.state)]">
                          {{ child.total_time?.time_count }}
                        </div>
                        <a-tag v-if="child.stopped" color="orange" class="tw-m-0">Bị dừng</a-tag>
                        <a-tag 
                          v-if="child.total_time" 
                          :color="getTagColor(child.total_time.state)" 
                          class="tw-block tw-text-right tw-m-0"
                        >
                          {{ getTimeStateText(child.total_time.state) }}
                        </a-tag>
                      </div>
                    </div>

                    <!-- Timeline chi tiết của child -->
                    <div v-if="child.expandedDetail" class="tw-py-4 tw-w-full mobile-card-tracking tw-mt-2">
                      <div class="tw-relative tw-w-full tw-overflow-x-auto">
                        <div class="tw-flex tw-items-start tw-relative tw-items-stretch">
                          <template v-for="(step, idx) in child.steps" :key="idx">
                            <div class="tw-flex tw-flex-col tw-items-start tw-relative tw-flex-shrink-0" :style="{ width: '100px' }">
                              <div class="tw-flex tw-items-center tw-w-full">
                                <div
                                  @click="handleStepClick(step)"
                                  :class="['tw-cursor-pointer tw-w-6 tw-h-6 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shadow tw-flex-shrink-0', getStepDotColor(step.state)]"
                                >
                                  <CheckCircleFilled 
                                    v-if="step.state === 'completed'" 
                                    class="tw-text-white" 
                                  />
                                  <CheckCircleFilled 
                                    v-else-if="step.state === 'warning'" 
                                    class="tw-text-white" 
                                  />
                                  <CheckCircleFilled 
                                    v-else-if="step.state === 'danger'" 
                                    class="tw-text-white" 
                                  />
                                  <SyncOutlined 
                                    v-else-if="step.state === 'processing' || step.state.includes('late')"
                                    :spin="true" 
                                    class="tw-text-white"
                                  />
                                  <div 
                                    v-else 
                                    class="tw-w-2 tw-h-2 tw-rounded-full tw-bg-white"
                                  ></div>
                                </div>
                                <div v-if="idx < child.steps.length - 1" :class="['tw-h-0.5 tw-flex-1', getStepLineColor(step.state)]"></div>
                              </div>
                              <div class="tw-flex tw-flex-col tw-justify-between tw-flex-grow tw-mt-3 tw-w-full">
                                <div class="tw-font-semibold tw-text-xs tw-mr-2">{{ step.label }}</div>
                                <div class="tw-space-x-1 tw-text-xs tw-my-2">
                                  <div v-if="step.updated" class="tw-text-gray-400 tw-mb-1">{{ step.updated }}</div>
                                  <a-tag
                                    v-if="step.status"
                                    :color="getTagColor(step.state)"
                                    class="tw-text-xs"
                                    style="margin-left: 0 !important; margin-right: 20px !important; white-space: normal;"
                                  >
                                    {{ step.status }}
                                  </a-tag>
                                </div>
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>

                    <!-- Nút xem chi tiết của child -->
                    <button 
                      class="tw-w-full tw-mt-2 tw-px-1 tw-py-0.5"
                      :style="{
                        color: '#1890ff',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.75rem',
                      }"
                      @click="toggleChildDetail(child.key)"
                    >
                      {{ child.expandedDetail ? 'Thu gọn' : 'Xem chi tiết' }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Nút xem chi tiết của parent - đặt ở ngoài card body, dưới cùng -->
          <button 
            class="tw-w-full tw-mt-2 tw-px-1 tw-py-1 tw-border-t"
            :style="{
              color: '#1890ff',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid #eee',
              fontSize: '0.75rem',
            }"
            @click="toggleMobileExpand(record.key)"
          >
            {{ record.expanded ? 'Thu gọn' : 'Xem chi tiết' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { 
  CheckCircleFilled, 
  ExclamationCircleFilled, 
  ExclamationOutlined, 
  SyncOutlined, 
  CheckOutlined,
  CaretRightOutlined,
  CaretDownOutlined
} from '@ant-design/icons-vue';

const loading = ref(true);
const response = ref([]);

const props = defineProps({
  page: Object
})

const loadData = async () => {
  loading.value = true;
  try {
    response.value = await frappe.xcall(
      "tahp.tahp.page.tracking_production.tracking_production.get_response",
      {filters: props.page.custom_filter}
    );
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

defineExpose({ loadData });


const columns = [
  { title: '', key: 'expand', width: 50, fixed: 'left' },
  { title: 'Mã LSX/LSX Ca', dataIndex: 'lsx_name', key: 'lsx_name', width: 180, fixed: 'left'  },
  { title: 'Sản phẩm', dataIndex: 'items', key: 'items', width: 280, fixed: 'left'  },
  { title: 'Quy trình', dataIndex: 'steps', key: 'steps' },
];

const tableData = ref([]);

// Tạo flattened data để render trong table
const flattenedData = computed(() => {
  const result = [];
  tableData.value.forEach(parent => {
    result.push(parent);
    if (parent.expanded && parent.children) {
      parent.children.forEach(child => {
        result.push(child);
      });
    }
  });
  return result;
});

// Toggle expand cho desktop
const toggleExpand = (key) => {
  const record = tableData.value.find(r => r.key === key);
  if (record) {
    record.expanded = !record.expanded;
  }
};

// Toggle expand cho mobile parent
const toggleMobileExpand = (key) => {
  const record = tableData.value.find(r => r.key === key);
  if (record) {
    record.expanded = !record.expanded;
  }
};

// Toggle expand cho mobile child detail
const toggleChildDetail = (childKey) => {
  tableData.value.forEach(parent => {
    if (parent.children) {
      const child = parent.children.find(c => c.key === childKey);
      if (child) {
        child.expandedDetail = !child.expandedDetail;
      }
    }
  });
};

const handleStepClick = (step) => {
  console.log(step.doctype, step.name)
  if (!step || !step.doctype || !step.name) return;
  const doctypeUrl = step.doctype.toLowerCase().replace(/\s+/g, '-');

  if (typeof step.name === 'string') {
    const url = `/app/${doctypeUrl}/${step.name}`;
    window.open(url, '_blank');
    return;
  }

  if (Array.isArray(step.name) && step.name.length > 0) {
    const filter = `?name=["in",${JSON.stringify(step.name)}]`;
    const url = `/app/${doctypeUrl}${filter}`;
    window.open(url, '_blank');
    return;
  }
};

// Get row class name để styling
const getRowClassName = (record) => {
  if (record.isWO) {
    return 'child-row';
  }
  return '';
};

watch(response, () => {
  tableData.value = response.value.map((lsx) => {
    const parentNeedsExpand = lsx.steps?.some(p => 
      ["processing", "pending", "late_danger", "late_warning"].includes(p.state)
    );
        
    const childrenNeedsExpand = lsx.wos?.some(wo => 
      wo.steps?.some(s => ["processing", "pending", "late_danger", "late_warning"].includes(s.state))
    );

    const shouldExpand = parentNeedsExpand || childrenNeedsExpand;

    return ({
    key: lsx.name,
    lsx_name: lsx.name,
    posts: lsx.posts,
    steps: lsx.steps,
    total_time: lsx.total_time,
    isParent: true,
    expanded: shouldExpand,
    hasChildren: lsx.wos && lsx.wos.length > 0,
    stopped: lsx.steps?.some(s => s.label === "LSX bị dừng" || s.label === "LSX Ca bị dừng"),
    children: lsx.wos?.map((wo) => ({
      key: wo.name,
      lsx_name: wo.name,
      items: [{ item_name: wo.item_name, qty: wo.qty, stock_uom: wo.stock_uom, shift: wo.shift, item_code: wo.item_code }],
      steps: wo.steps,
      total_time: wo.total_time,
      isWO: true,
      expandedDetail: false,
      stopped: wo.steps?.some(s => s.label === "LSX bị dừng" || s.label === "LSX Ca bị dừng")
    }))
  })});
}, { immediate: true });

// Color helpers
const colorMap = {
  tag: { completed: 'green', processing: 'blue', warning: 'orange', danger: 'red', late_warning: 'orange', late_danger: 'red' },
  dot: { completed: 'tw-bg-green-500', warning: 'tw-bg-orange-500', danger: 'tw-bg-red-500', processing: 'tw-bg-blue-500', pending: 'tw-bg-gray-400',  late_warning: 'tw-bg-orange-500', late_danger: 'tw-bg-red-500', },
  line: { completed: 'tw-bg-green-400', warning: 'tw-bg-orange-400', danger: 'tw-bg-red-400', processing: 'tw-bg-blue-400', pending: 'tw-bg-gray-300', late_warning: 'tw-bg-orange-400', late_danger: 'tw-bg-red-400', },
  text: { completed: 'tw-text-green-700', warning: 'tw-text-orange-700', danger: 'tw-text-red-700', processing: 'tw-text-blue-700', pending: 'tw-text-gray-600', late_warning: 'tw-text-orange-700', late_danger: 'tw-text-red-700', },
};

const stateText = {
  completed: 'Hoàn thành',
  warning: 'Chậm',
  danger: 'Chậm nghiêm trọng',
  processing: 'Đang tiến hành',
  pending: 'Chưa bắt đầu'
};

const getTagColor = (state) => colorMap.tag[state] || 'default';
const getStepDotColor = (state) => colorMap.dot[state] || 'tw-bg-gray-300';
const getStepLineColor = (state) => colorMap.line[state] || 'tw-bg-gray-200';
const getStateTextColor = (state) => colorMap.text[state] || 'tw-text-gray-700';
const getTimeStateText = (state) => stateText[state] || '';
</script>

<style scoped>
.full-screen-spin {
  position: fixed;         /* cố định so với viewport */
  top: 50%;                /* đặt tâm theo chiều dọc */
  left: 50%;               /* đặt tâm theo chiều ngang */
  transform: translate(-50%, -50%); /* căn giữa chính xác */
  z-index: 9999;           /* hiển thị trên cùng */
  background-color: rgba(255, 255, 255, 0); /* trong suốt */
}

.tree-connector {
  position: relative;
  margin-left: 16px; /* tạo khoảng lệch cho icon + line */
}

.tree-connector::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 0;
  width: 12px;
  height: 50%;
  border-left: 1px solid #aeb0b3; /* gray-300 */
  border-bottom: 1px solid #aeb0b3;
}

</style>