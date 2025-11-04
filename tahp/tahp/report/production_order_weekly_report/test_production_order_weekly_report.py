# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import unittest
import json


# PURE LOGIC FUNCTIONS (Tách ra để test) 
def calculate_report_data(wwo_items, work_orders_by_item):
    """
    run: cd /workspace/development/frappe-bench/apps/tahp/tahp/tahp/report/production_order_weekly_report && python3 test_production_order_weekly_report.py
    Pure function: Tính toán dữ liệu báo cáo từ WWO items và Work Orders
    
    Args:
        wwo_items: List[dict] - Danh sách items từ WWO
            [{"item": "Item A", "qty": 100, "uom": "Tấn"}, ...]
        work_orders_by_item: Dict[str, List[dict]] - Work orders nhóm theo item
            {"Item A": [{"produced_qty": 95}, ...]}
    
    Returns:
        List[dict] - Dữ liệu báo cáo
    """
    data = []
    
    for wwo_item in wwo_items:
        item = wwo_item["item"]
        unit = wwo_item["uom"]
        planned = wwo_item["qty"]
        
        # Tính actual từ work orders
        actual = 0
        if item in work_orders_by_item:
            for wo in work_orders_by_item[item]:
                actual += wo.get("produced_qty", 0)
        
        # Calculate metrics
        variance = planned - actual
        percent_actual = (actual / planned * 100) if planned else 0
        
        # Cumulative (simplified - trong code thật giống actual/planned)
        cumulative_actual = actual
        cumulative_planned = planned
        percent_cumulative = (cumulative_actual / cumulative_planned * 100) if cumulative_planned else 0
        
        data.append({
            "item": item,
            "unit": unit,
            "actual": actual,
            "planned": planned,
            "variance": variance,
            "percent_actual": percent_actual,
            "cumulative_actual": cumulative_actual,
            "cumulative_planned": cumulative_planned,
            "percent_cumulative": percent_cumulative,
        })
    
    return data


def get_report_columns():
    """Trả về columns definition """
    return [
        {"label": "Mặt hàng", "fieldname": "item", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 200},
        {"label": "ĐVT", "fieldname": "unit", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 80},
        {"label": "Thực tế", "fieldname": "actual", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "Kế hoạch", "fieldname": "planned", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "Chênh lệch", "fieldname": "variance", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "%Thực tế/Kế hoạch", "fieldname": "percent_actual", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Lũy kế thực tế", "fieldname": "cumulative_actual", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "kế hoạch tuần", "fieldname": "cumulative_planned", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "%Hoàn thành", "fieldname": "percent_cumulative", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 180},
    ]


# TEST FIXTURES - JSON IN/OUT 
TEST_CASES = [
    {
        "name": "Case 1: Normal - 2 items completed",
        "input_json": {
            "wwo_items": [
                {"item": "Item A", "qty": 100, "uom": "Tấn"},
                {"item": "Item B", "qty": 200, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Item A": [
                    {"name": "WO-001", "produced_qty": 95}
                ],
                "Item B": [
                    {"name": "WO-002", "produced_qty": 180}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item A",
                "unit": "Tấn",
                "actual": 95,
                "planned": 100,
                "variance": 5,
                "percent_actual": 95.0,
                "cumulative_actual": 95,
                "cumulative_planned": 100,
                "percent_cumulative": 95.0
            },
            {
                "item": "Item B",
                "unit": "Tấn",
                "actual": 180,
                "planned": 200,
                "variance": 20,
                "percent_actual": 90.0,
                "cumulative_actual": 180,
                "cumulative_planned": 200,
                "percent_cumulative": 90.0
            }
        ]
    },
    
    {
        "name": "Case 2: Multiple WOs for same item",
        "input_json": {
            "wwo_items": [
                {"item": "Item A", "qty": 100, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Item A": [
                    {"name": "WO-001", "produced_qty": 45},
                    {"name": "WO-002", "produced_qty": 50}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item A",
                "unit": "Tấn",
                "actual": 95,
                "planned": 100,
                "variance": 5,
                "percent_actual": 95.0,
                "cumulative_actual": 95,
                "cumulative_planned": 100,
                "percent_cumulative": 95.0
            }
        ]
    },
    
    {
        "name": "Case 3: Over-production (actual > planned)",
        "input_json": {
            "wwo_items": [
                {"item": "Item C", "qty": 100, "uom": "Kg"}
            ],
            "work_orders_by_item": {
                "Item C": [
                    {"name": "WO-003", "produced_qty": 120}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item C",
                "unit": "Kg",
                "actual": 120,
                "planned": 100,
                "variance": -20,
                "percent_actual": 120.0,
                "cumulative_actual": 120,
                "cumulative_planned": 100,
                "percent_cumulative": 120.0
            }
        ]
    },
    
    {
        "name": "Case 4: Empty work orders",
        "input_json": {
            "wwo_items": [
                {"item": "Item D", "qty": 50, "uom": "Unit"}
            ],
            "work_orders_by_item": {}
        },
        "expected_json": [
            {
                "item": "Item D",
                "unit": "Unit",
                "actual": 0,
                "planned": 50,
                "variance": 50,
                "percent_actual": 0.0,
                "cumulative_actual": 0,
                "cumulative_planned": 50,
                "percent_cumulative": 0.0
            }
        ]
    },
    
    {
        "name": "Case 5: Zero planned quantity",
        "input_json": {
            "wwo_items": [
                {"item": "Item E", "qty": 0, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Item E": [
                    {"name": "WO-005", "produced_qty": 10}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item E",
                "unit": "Tấn",
                "actual": 10,
                "planned": 0,
                "variance": -10,
                "percent_actual": 0.0,
                "cumulative_actual": 10,
                "cumulative_planned": 0,
                "percent_cumulative": 0.0
            }
        ]
    },
    
    {
        "name": "Case 6: Exact match (actual == planned)",
        "input_json": {
            "wwo_items": [
                {"item": "Item F", "qty": 150, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Item F": [
                    {"name": "WO-006", "produced_qty": 150}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item F",
                "unit": "Tấn",
                "actual": 150,
                "planned": 150,
                "variance": 0,
                "percent_actual": 100.0,
                "cumulative_actual": 150,
                "cumulative_planned": 150,
                "percent_cumulative": 100.0
            }
        ]
    },
    
    {
        "name": "Case 7: Three items with different completion rates",
        "input_json": {
            "wwo_items": [
                {"item": "Item A", "qty": 100, "uom": "Tấn"},
                {"item": "Item B", "qty": 200, "uom": "Tấn"},
                {"item": "Item C", "qty": 50, "uom": "Kg"}
            ],
            "work_orders_by_item": {
                "Item A": [{"name": "WO-001", "produced_qty": 100}],  # 100%
                "Item B": [{"name": "WO-002", "produced_qty": 150}]   # 75%
                # Item C không có key (0%)
            }
        },
        "expected_json": [
            {
                "item": "Item A",
                "unit": "Tấn",
                "actual": 100,
                "planned": 100,
                "variance": 0,
                "percent_actual": 100.0,
                "cumulative_actual": 100,
                "cumulative_planned": 100,
                "percent_cumulative": 100.0
            },
            {
                "item": "Item B",
                "unit": "Tấn",
                "actual": 150,
                "planned": 200,
                "variance": 50,
                "percent_actual": 75.0,
                "cumulative_actual": 150,
                "cumulative_planned": 200,
                "percent_cumulative": 75.0
            },
            {
                "item": "Item C",
                "unit": "Kg",
                "actual": 0,
                "planned": 50,
                "variance": 50,
                "percent_actual": 0.0,
                "cumulative_actual": 0,
                "cumulative_planned": 50,
                "percent_cumulative": 0.0
            }
        ]
    },
    
    {
        "name": "Case 8: Multiple WOs with partial completion",
        "input_json": {
            "wwo_items": [
                {"item": "Item G", "qty": 200, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Item G": [
                    {"name": "WO-007", "produced_qty": 50},
                    {"name": "WO-008", "produced_qty": 60},
                    {"name": "WO-009", "produced_qty": 70}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item G",
                "unit": "Tấn",
                "actual": 180,
                "planned": 200,
                "variance": 20,
                "percent_actual": 90.0,
                "cumulative_actual": 180,
                "cumulative_planned": 200,
                "percent_cumulative": 90.0
            }
        ]
    },
    
    {
        "name": "Case 9: Decimal produced_qty",
        "input_json": {
            "wwo_items": [
                {"item": "Item H", "qty": 100, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Item H": [
                    {"name": "WO-010", "produced_qty": 45.5},
                    {"name": "WO-011", "produced_qty": 49.5}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Item H",
                "unit": "Tấn",
                "actual": 95.0,
                "planned": 100,
                "variance": 5.0,
                "percent_actual": 95.0,
                "cumulative_actual": 95.0,
                "cumulative_planned": 100,
                "percent_cumulative": 95.0
            }
        ]
    },
    
    {
        "name": "Case 10: Unicode item names",
        "input_json": {
            "wwo_items": [
                {"item": "Sản phẩm Việt Nam", "qty": 100, "uom": "Tấn"}
            ],
            "work_orders_by_item": {
                "Sản phẩm Việt Nam": [
                    {"name": "WO-012", "produced_qty": 80}
                ]
            }
        },
        "expected_json": [
            {
                "item": "Sản phẩm Việt Nam",
                "unit": "Tấn",
                "actual": 80,
                "planned": 100,
                "variance": 20,
                "percent_actual": 80.0,
                "cumulative_actual": 80,
                "cumulative_planned": 100,
                "percent_cumulative": 80.0
            }
        ]
    }
]


# UNIT TESTS 
class TestProductionOrderWeeklyReport(unittest.TestCase):
    """
    Pure JSON Input → JSON Output Tests
    
    ĐẦU VÀO: 1 cục JSON (wwo_items + work_orders_by_item)
    ĐẦU RA: 1 cục JSON (data với expected values)
    
    Khi update code, chạy lại tests để đảm bảo không break
    """
    
    def setUp(self):
        self.maxDiff = None
    
    # SCHEMA VALIDATION TESTS     
    def test_output_is_json_serializable(self):
        """Test 1: Output phải JSON-serializable"""
        for test_case in TEST_CASES:
            with self.subTest(test_case["name"]):
                result = calculate_report_data(
                    test_case["input_json"]["wwo_items"],
                    test_case["input_json"]["work_orders_by_item"]
                )
                
                try:
                    json_str = json.dumps(result)
                    parsed = json.loads(json_str)
                    self.assertIsNotNone(parsed)
                except TypeError as e:
                    self.fail(f"{test_case['name']}: Output không JSON-serializable: {e}")
    
    def test_output_is_list(self):
        """Test 2: Output phải là list"""
        test_case = TEST_CASES[0]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        self.assertIsInstance(result, list)
    
    def test_each_row_has_required_fields(self):
        """Test 3: Mỗi row phải có đủ 9 fields"""
        test_case = TEST_CASES[0]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        
        required_fields = {
            "item", "unit", "actual", "planned", "variance",
            "percent_actual", "cumulative_actual", "cumulative_planned", "percent_cumulative"
        }
        
        for row in result:
            self.assertEqual(set(row.keys()), required_fields)
    
    def test_data_types_are_correct(self):
        """Test 4: Data types phải đúng"""
        test_case = TEST_CASES[0]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        
        for row in result:
            # String fields
            self.assertIsInstance(row["item"], str)
            self.assertIsInstance(row["unit"], str)
            
            # Numeric fields
            self.assertIsInstance(row["actual"], (int, float))
            self.assertIsInstance(row["planned"], (int, float))
            self.assertIsInstance(row["variance"], (int, float))
            self.assertIsInstance(row["percent_actual"], (int, float))
            self.assertIsInstance(row["cumulative_actual"], (int, float))
            self.assertIsInstance(row["cumulative_planned"], (int, float))
            self.assertIsInstance(row["percent_cumulative"], (int, float))
    
    def test_columns_structure(self):
        """Test 5: Columns phải có đúng cấu trúc"""
        columns = get_report_columns()
        
        self.assertEqual(len(columns), 9)
        
        expected_fieldnames = [
            "item", "unit", "actual", "planned", "variance",
            "percent_actual", "cumulative_actual", "cumulative_planned", "percent_cumulative"
        ]
        
        actual_fieldnames = [c["fieldname"] for c in columns]
        self.assertEqual(actual_fieldnames, expected_fieldnames)
        
        # Mỗi column phải có fieldname, label, fieldtype, dropdown, sortable
        for col in columns:
            self.assertIn("fieldname", col)
            self.assertIn("label", col)
            self.assertIn("fieldtype", col)
            self.assertIn("dropdown", col)
            self.assertIn("sortable", col)
            self.assertIn("width", col)
    
    # REGRESSION TESTS     
    def test_case_1_normal_two_items(self):
        """REGRESSION: Case 1 - Normal với 2 items"""
        test_case = TEST_CASES[0]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"]
        
        self.assertEqual(len(result), 2)
        
        # Item A
        item_a = next(r for r in result if r["item"] == "Item A")
        exp_a = next(e for e in expected if e["item"] == "Item A")
        self.assertEqual(item_a["actual"], exp_a["actual"])
        self.assertEqual(item_a["planned"], exp_a["planned"])
        self.assertEqual(item_a["variance"], exp_a["variance"])
        self.assertAlmostEqual(item_a["percent_actual"], exp_a["percent_actual"], places=1)
        
        # Item B
        item_b = next(r for r in result if r["item"] == "Item B")
        exp_b = next(e for e in expected if e["item"] == "Item B")
        self.assertEqual(item_b["actual"], exp_b["actual"])
        self.assertEqual(item_b["planned"], exp_b["planned"])
        self.assertEqual(item_b["variance"], exp_b["variance"])
        self.assertAlmostEqual(item_b["percent_actual"], exp_b["percent_actual"], places=1)
    
    def test_case_2_multiple_wos_same_item(self):
        """REGRESSION: Case 2 - Multiple WOs cho cùng item"""
        test_case = TEST_CASES[1]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        self.assertEqual(len(result), 1)
        row = result[0]
        
        self.assertEqual(row["item"], expected["item"])
        self.assertEqual(row["actual"], expected["actual"])
        self.assertEqual(row["planned"], expected["planned"])
        self.assertEqual(row["variance"], expected["variance"])
        self.assertAlmostEqual(row["percent_actual"], expected["percent_actual"], places=1)
    
    def test_case_3_over_production(self):
        """REGRESSION: Case 3 - Over-production"""
        test_case = TEST_CASES[2]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertEqual(row["variance"], expected["variance"])
        self.assertLess(row["variance"], 0, "Variance phải âm khi over-production")
        self.assertAlmostEqual(row["percent_actual"], expected["percent_actual"], places=1)
    
    def test_case_4_empty_work_orders(self):
        """REGRESSION: Case 4 - Không có work orders"""
        test_case = TEST_CASES[3]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertEqual(row["actual"], expected["actual"])
        self.assertEqual(row["variance"], expected["variance"])
        self.assertEqual(row["percent_actual"], expected["percent_actual"])
    
    def test_case_5_zero_planned(self):
        """REGRESSION: Case 5 - Zero planned quantity"""
        test_case = TEST_CASES[4]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertEqual(row["planned"], expected["planned"])
        self.assertEqual(row["variance"], expected["variance"])
        self.assertEqual(row["percent_actual"], expected["percent_actual"])
    
    def test_case_6_exact_match(self):
        """REGRESSION: Case 6 - Exact match"""
        test_case = TEST_CASES[5]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertEqual(row["variance"], expected["variance"])
        self.assertAlmostEqual(row["percent_actual"], expected["percent_actual"], places=1)
    
    def test_case_7_three_items_different_rates(self):
        """REGRESSION: Case 7 - 3 items với completion rates khác nhau"""
        test_case = TEST_CASES[6]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"]
        
        self.assertEqual(len(result), 3)
        
        for exp in expected:
            row = next(r for r in result if r["item"] == exp["item"])
            self.assertEqual(row["actual"], exp["actual"])
            self.assertEqual(row["planned"], exp["planned"])
            self.assertEqual(row["variance"], exp["variance"])
            self.assertAlmostEqual(row["percent_actual"], exp["percent_actual"], places=1)
    
    def test_case_8_multiple_wos_partial_completion(self):
        """REGRESSION: Case 8 - Multiple WOs với partial completion"""
        test_case = TEST_CASES[7]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertEqual(row["actual"], expected["actual"])
        self.assertEqual(row["planned"], expected["planned"])
        self.assertAlmostEqual(row["percent_actual"], expected["percent_actual"], places=1)
    
    def test_case_9_decimal_produced_qty(self):
        """REGRESSION: Case 9 - Decimal produced_qty"""
        test_case = TEST_CASES[8]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertAlmostEqual(row["actual"], expected["actual"], places=1)
        self.assertAlmostEqual(row["variance"], expected["variance"], places=1)
    
    def test_case_10_unicode_item_names(self):
        """REGRESSION: Case 10 - Unicode item names"""
        test_case = TEST_CASES[9]
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        expected = test_case["expected_json"][0]
        
        row = result[0]
        self.assertEqual(row["item"], expected["item"])
        self.assertEqual(row["actual"], expected["actual"])
    
    # LOOP TEST ALL CASES     
    def test_all_cases_match_expected_output(self):
        """
        Test tất cả cases: JSON in → JSON out
        Khi thêm case mới vào TEST_CASES, test này tự động chạy
        """
        for test_case in TEST_CASES:
            with self.subTest(test_case["name"]):
                result = calculate_report_data(
                    test_case["input_json"]["wwo_items"],
                    test_case["input_json"]["work_orders_by_item"]
                )
                expected = test_case["expected_json"]
                
                self.assertEqual(len(result), len(expected), 
                               f"Số rows không khớp")
                
                for actual_row, expected_row in zip(result, expected):
                    # So sánh tất cả fields
                    self.assertEqual(actual_row["item"], expected_row["item"])
                    self.assertEqual(actual_row["unit"], expected_row["unit"])
                    self.assertAlmostEqual(actual_row["actual"], expected_row["actual"], places=1)
                    self.assertEqual(actual_row["planned"], expected_row["planned"])
                    self.assertAlmostEqual(actual_row["variance"], expected_row["variance"], places=1)
                    self.assertAlmostEqual(actual_row["percent_actual"], 
                                         expected_row["percent_actual"], places=1)
                    self.assertAlmostEqual(actual_row["cumulative_actual"], 
                                   expected_row["cumulative_actual"], places=1)
                    self.assertEqual(actual_row["cumulative_planned"], 
                                   expected_row["cumulative_planned"])
                    self.assertAlmostEqual(actual_row["percent_cumulative"], 
                                         expected_row["percent_cumulative"], places=1)


if __name__ == '__main__':
    unittest.main(verbosity=2)