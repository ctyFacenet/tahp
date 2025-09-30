from tahp.tahp.doctype.shift_handover.shift_handover import create_shift_handover
from tahp.tahp.doctype.quality_card.quality_card import create_quality_card

def on_submit(doc, method):
    if doc.custom_plan:
        create_shift_handover(doc.name)
    # create_quality_card(doc.name)