"""Validate all sr2 JSON data files against their schemas.

Usage: python validate_data.py
"""
import json
import sys
from pathlib import Path
import jsonschema

ROOT = Path(__file__).parent.parent
SCHEMAS = ROOT / "data" / "schemas"
DATA    = ROOT / "data" / "sr2"

PAIRS = [
    ("priority_table.schema.json", "priority_table.json"),
    ("metatypes.schema.json",      "metatypes.json"),
    ("skills.schema.json",         "skills.json"),
    ("spells.schema.json",         "spells.json"),
    ("gear.schema.json",           "gear.json"),
    ("cyberware.schema.json",      "cyberware.json"),
    ("archetypes.schema.json",     "archetypes.json"),
]

errors = 0
for schema_file, data_file in PAIRS:
    schema = json.loads((SCHEMAS / schema_file).read_text())
    data   = json.loads((DATA    / data_file).read_text())
    try:
        jsonschema.validate(data, schema)
        print(f"  OK  {data_file}")
    except jsonschema.ValidationError as e:
        print(f"  FAIL {data_file}: {e.message}")
        errors += 1

sys.exit(errors)
