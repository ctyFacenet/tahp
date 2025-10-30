import dayjs from "dayjs";

export const workOrders = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  work_order_code: `WO_EIAIW050_A_25_2510${30 + i}.1`,
  item_code: `EIAIW050_A_25`,
  item_name: `Dây đồng điện tử 1EI/AIW - 0.50mm - A - PT25`,
  qty_production: Math.floor(200 + Math.random() * 400),
  uom: "Kg",
  created_by: ["nambv@kct.vn", "tien@dat.vn", "admin@kct.vn"][i % 3],
  start_date: dayjs("2025-10-30").add(i, "day").format("YYYY-MM-DD"),
  end_date: dayjs("2025-10-30").add(i + 2, "day").format("YYYY-MM-DD"),
  created_date: dayjs("2025-10-30").add(i, "day").format("YYYY-MM-DD"),
}));

export const workProcesses = Array.from({ length: 5 }, (_, i) => {
  const id = i + 1;
  const processCodes = ["MALH", "CHINH", "KEO", "CAT", "DONGGOI"];
  const processNames = ["Mạ Liên hoàn", "Chỉnh dây đầu", "Kéo sợi", "Cắt đoạn", "Đóng gói"];
  const code = processCodes[i % processCodes.length];
  const name = processNames[i % processNames.length];

  return {
    id,
    process_code: code,
    process_name: name,
    machine: `${code}_${(i % 3) + 1}`,
    line: `${code}.LINE${(i % 5) + 1}`,
    bobbin: 10 + (i % 10),
    time_standard: (0.8 + Math.random() * 0.6).toFixed(2),
    time_replace_enamel: 60 + Math.floor(Math.random() * 100),
    time_replace_core: 50 + Math.floor(Math.random() * 80),
    time_production: 200 + Math.floor(Math.random() * 500),
    time_start: dayjs("2025-10-30 08:00:00")
      .add(i * 2, "hour")
      .format("HH:mm:ss DD/MM/YYYY"),
    time_end: dayjs("2025-10-30 08:00:00")
      .add(i * 2 + 2, "hour")
      .format("HH:mm:ss DD/MM/YYYY"),
    qty_output: Math.floor(100 + Math.random() * 400),
  };
});

export const workMaterials = Array.from({ length: 5 }, (_, i) => {
  const id = i + 1;
  const materialList = [
    { code: "EIAIW120_A_25", name: "Dây đồng điện tử 1EI/AIW - 1.2mm - A - PT25", uom: "Kg" },
    { code: "M.E.7340AX", name: "Voltatex 7340AX (EIW)", uom: "Kg" },
    { code: "DB.CR107", name: "Dầu bóng CR - 107", uom: "Kg" },
    { code: "TUIBONGPT25", name: "Túi bóng trùm bobbin PT25", uom: "Cái" },
    { code: "HOPPT25", name: "Hộp carton loại PT25", uom: "Cái" },
  ];
  const m = materialList[i % materialList.length];
  const baseQty = [300, 250, 150, 600, 300][i % 5];

  return {
    id,
    material_code: `${m.code}_${String(id).padStart(2, "0")}`,
    material_name: `${m.name} - Lô ${String(id).padStart(3, "0")}`,
    input_rate: 0.5 + Math.random() * 1.5,
    qty_required: baseQty + Math.floor(Math.random() * 200),
    uom: m.uom,
  };
});
