import sys

with open('src/hooks/useUserProfile.ts', 'r') as f:
    lines = f.readlines()

def safe_parse_block(var_name, key, default):
    return [
        f'      let {var_name} = {default};\n',
        '      try {\n',
        f'        const str = localStorage.getItem("{key}");\n',
        f'        {var_name} = str ? JSON.parse(str) : {default};\n',
        '      } catch (e) {{\n',
        f'        console.warn("Failed to parse {key}:", e);\n',
        '      }}\n'
    ]

new_content = []
i = 0
while i < len(lines):
    line = lines[i]

    if "localStorage.getItem('seihouse-local-user-profile')" in line or 'localStorage.getItem("seihouse-local-user-profile")' in line:
        if 'const localProfileStr =' in line:
            new_content.extend(safe_parse_block('localProfile', 'seihouse-local-user-profile', 'null'))
            i += 2
            continue
        elif 'const localProfileStr = localStorage.getItem(\'seihouse-local-user-profile\');' in lines[i]:
             new_content.extend(safe_parse_block('localProfile', 'seihouse-local-user-profile', 'null'))
             i += 2
             continue

    if "localStorage.getItem('seihouse-local-cosmic-inventory')" in line or 'localStorage.getItem("seihouse-local-cosmic-inventory")' in line:
        if 'const localInvStr =' in line:
            new_content.extend(safe_parse_block('localInventory', 'seihouse-local-cosmic-inventory', '[]'))
            i += 2
            continue

    new_content.append(line)
    i += 1

with open('src/hooks/useUserProfile.ts', 'w') as f:
    f.writelines(new_content)
