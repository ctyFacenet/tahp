# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
    columns = [
    {'fieldname':'letter','label':'Letter','fieldtype':'Data','align':'right','width':200},
    {'fieldname':'number','label':'Number','fieldtype':'Int','align':'right','width':200}
]
    data = [
		{'letter':'c','number':2,'indent':0},
		{'letter':'a','number':2,'indent':1},
		{'letter':'t','number':8,'indent':2},
		{'letter':'s','number':7,'indent':0}
	]
    message = ["Helloooooooooo"]
    
    chart = {
    'data':{
        'labels':['d','o','g','s'],
        'datasets':[
            {'name':'Number','values':[3,6,4,7], 'chartType':'bar'},
            {'name':'Vowel','values':[1,1,2,3], 'chartType': 'line'}
        ]
    },
    'type':'axis-mixed'
}
    return columns, data, message, chart
