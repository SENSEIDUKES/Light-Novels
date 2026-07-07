import sys

with open('src/hooks/useUserProfile.ts', 'r') as f:
    lines = f.readlines()

new_content = []
i = 0
while i < len(lines):
    line = lines[i]

    # Comment 1: Subscription Effect
    if '}, [currentUser, isEditing]);' in line:
        new_content.append('  }, [currentUser]);\n')
        i += 1
        continue

    if '        setProfile(data);\n' in line and '        if (!isEditing) {\n' in lines[i+1]:
        new_content.append('        setProfile(data);\n')
        i += 4 # Skip the if (!isEditing) { setFormData(data); }
        continue

    # Comment 1: New useEffect for formData
    if '  useEffect(() => {\n    if (!currentUser) {\n' in line:
        new_content.append('  useEffect(() => {\n')
        new_content.append('    if (!isEditing && profile) {\n')
        new_content.append('      setFormData(profile);\n')
        new_content.append('    }\n')
        new_content.append('  }, [profile, isEditing]);\n\n')
        new_content.append(line)
        i += 1
        continue

    # Comment 2: localStorage parsing
    if 'const localProfileStr = localStorage.getItem(\'seihouse-local-user-profile\');' in line:
        new_content.append('      let localProfile = null;\n')
        new_content.append('      try {\n')
        new_content.append('        const localProfileStr = localStorage.getItem(\'seihouse-local-user-profile\');\n')
        new_content.append('        localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;\n')
        new_content.append('      } catch (e) {\n')
        new_content.append('        console.warn("Failed to parse local profile:", e);\n')
        new_content.append('      }\n')
        i += 2 # Skip original lines
        continue

    if 'const localInvStr = localStorage.getItem(\'seihouse-local-cosmic-inventory\');' in line:
        new_content.append('      let localInventory = [];\n')
        new_content.append('      try {\n')
        new_content.append('        const localInvStr = localStorage.getItem(\'seihouse-local-cosmic-inventory\');\n')
        new_content.append('        localInventory = localInvStr ? JSON.parse(localInvStr) : [];\n')
        new_content.append('      } catch (e) {\n')
        new_content.append('        console.warn("Failed to parse local inventory:", e);\n')
        new_content.append('      }\n')
        i += 2
        continue

    new_content.append(line)
    i += 1

with open('src/hooks/useUserProfile.ts', 'w') as f:
    f.writelines(new_content)
