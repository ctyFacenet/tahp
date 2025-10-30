export const customers = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  code: `CUS${String(i + 1).padStart(4, "0")}`,
  name: `CÔNG TY TNHH KHÁCH HÀNG ${i + 1}`,
  phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
  email: `khachhang${i + 1}@example.com`,
  address: `Số ${i + 1} Đường ${["A", "B", "C", "D"][i % 4]} - KCN ${["VSIP", "Yên Phong", "Tràng Duệ", "Bắc Thăng Long"][i % 4]}`,
}));
