#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để xem INPUT/OUTPUT của tất cả test cases
run: python3 view_test_cases.py
"""

import json
from test_production_order_weekly_report import calculate_report_data, TEST_CASES

def main():
    print("\n" + " VIEWING ALL TEST CASES - INPUT/OUTPUT".center(80, "="))
    
    total_cases = len(TEST_CASES)
    passed = 0
    failed = 0
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print("\n" + "="*80)
        print(f"TEST CASE {i}/{total_cases}: {test_case['name']}")
        print("="*80)
        
        # INPUT
        print("\n INPUT:")
        print(json.dumps(test_case["input_json"], indent=2, ensure_ascii=False))
        
        # CALCULATE
        result = calculate_report_data(
            test_case["input_json"]["wwo_items"],
            test_case["input_json"]["work_orders_by_item"]
        )
        
        # OUTPUT (Actual)
        print("\n OUTPUT (Actual Result):")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # EXPECTED
        print("\n EXPECTED (Should Be):")
        print(json.dumps(test_case["expected_json"], indent=2, ensure_ascii=False))
        
        # COMPARISON
        if result == test_case["expected_json"]:
            print("\n STATUS: PASS")
            passed += 1
        else:
            print("\n STATUS: FAIL")
            print("\n DIFFERENCES:")
            for j, (actual_row, expected_row) in enumerate(zip(result, test_case["expected_json"])):
                if actual_row != expected_row:
                    print(f"  Row {j}:")
                    for key in expected_row:
                        if actual_row.get(key) != expected_row[key]:
                            print(f"    - {key}: {actual_row.get(key)} != {expected_row[key]}")
            failed += 1
        
        print("\n" + "-"*80)
    
    # SUMMARY
    print("\n" + "="*80)
    print(" SUMMARY".center(80))
    print("="*80)
    print(f"Total test cases: {total_cases}")
    print(f" Passed: {passed}")
    print(f" Failed: {failed}")
    print(f"Success rate: {passed/total_cases*100:.1f}%")
 

if __name__ == "__main__":
    main()