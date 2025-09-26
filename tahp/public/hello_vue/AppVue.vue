<template>
  <div class="tw-min-h-screen tw-bg-white tw-flex tw-flex-col">
    <nav class="tw-bg-white tw-shadow tw-p-4 tw-flex tw-gap-6">
      <router-link
        to="/"
        class="tw-text-black hover:tw-text-blue-600 hover:tw-underline"
        active-class="tw-text-blue-600 tw-underline"
      >
        Trang chủ
      </router-link>

      <router-link
        to="/defect-report"
        class="tw-text-black hover:tw-text-blue-600 hover:tw-underline"
        active-class="tw-text-blue-600 tw-underline"
      >
        Báo cáo tỷ lệ phế
      </router-link>

      <router-link
        to="/detail-order-report"
        class="tw-text-black hover:tw-text-blue-600 hover:tw-underline"
        active-class="tw-text-blue-600 tw-underline"
      >
        Báo cáo tổng quan đơn hàng chi tiết
      </router-link>

      <router-link
        to="/production-report"
        class="tw-text-black hover:tw-text-blue-600 hover:tw-underline"
        active-class="tw-text-blue-600 tw-underline"
      >
        Báo cáo sản xuất
      </router-link>
    </nav>

    <main class="tw-flex-1 tw-p-4">
      <router-view />
    </main>
  </div>
</template>
