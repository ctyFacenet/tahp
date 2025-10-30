import dayjs from "dayjs";

export const orderDetails = Array.from({ length: 10 }, (_, i) => {
  const id = i + 1;
  const item_code = `ITEM_${String(id).padStart(5, "0")}`;
  const qty = Math.floor(100 + Math.random() * 900);
  const stock_available = Math.floor(Math.random() * 300);
  const stock_pending = Math.floor(Math.random() * 100);
  const stock_pending_hold = Math.floor(Math.random() * 50);
  const stock_hold_1 = Math.floor(Math.random() * 40);
  const internal_prod_qty = Math.floor(Math.random() * 100);
  const internal_hold_qty = Math.floor(Math.random() * 30);
  const total_hold = stock_hold_1 + internal_hold_qty;

  return {
    id,
    order_detail_code: `ORDER_${String(id).padStart(4, "0")}`,
    item_code,
    item_name: `Sản phẩm thử nghiệm ${id}`,
    status: ["Mới", "Đang xử lý", "Đã tạo lệnh sản xuất", "Hoàn tất"][i % 4],
    qty_required: qty,
    stock_available,
    stock_pending,
    stock_pending_hold,
    stock_hold_1,
    internal_prod_qty,
    internal_hold_qty,
    total_hold,
    uom: ["Kg", "Cuộn", "Thùng", "Cái"][i % 4],
    created_date: dayjs().subtract(i, "day").format("DD/MM/YYYY"),
    delivery_date: dayjs().add(i % 10, "day").format("DD/MM/YYYY"),
  };
});
