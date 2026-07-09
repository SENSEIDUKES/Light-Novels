import json

def fix_capitalization():
    file_path = 'master_glossary_schema_locked.json'
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    modified = 0
    for term in data:
        if 'nativeLanguages' in term:
            # Fix Chinese pinyin
            if 'chinese' in term['nativeLanguages'] and 'pinyin' in term['nativeLanguages']['chinese']:
                val = term['nativeLanguages']['chinese']['pinyin']
                if val and not val.islower():
                    term['nativeLanguages']['chinese']['pinyin'] = val.lower()
                    modified += 1
            
            # Fix Korean romanization
            if 'korean' in term['nativeLanguages'] and 'romanization' in term['nativeLanguages']['korean']:
                val = term['nativeLanguages']['korean']['romanization']
                if val and not val.islower():
                    term['nativeLanguages']['korean']['romanization'] = val.lower()
                    modified += 1
                    
            # Fix Japanese romaji
            if 'japanese' in term['nativeLanguages'] and 'romaji' in term['nativeLanguages']['japanese']:
                val = term['nativeLanguages']['japanese']['romaji']
                if val and not val.islower():
                    term['nativeLanguages']['japanese']['romaji'] = val.lower()
                    modified += 1

    if modified > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Fixed capitalization for {modified} fields.")
    else:
        print("No inconsistent capitalization found.")

if __name__ == '__main__':
    fix_capitalization()
