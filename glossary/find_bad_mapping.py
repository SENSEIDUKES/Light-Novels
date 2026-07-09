import json
from process_xh_rw_wo import mappings

for key, value in mappings.items():
    if len(value) < 6:
        print(f"Term '{key}' only has {len(value)} elements: {value}")
