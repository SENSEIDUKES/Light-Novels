import re

files = [
    ('src/components/codex/LivingCodexCollage.tsx', ['characters', 'locations', 'artifacts']),
    ('src/components/codex/LivingCodexRelations.tsx', ['characters'])
]

for file_path, deps in files:
    with open(file_path, 'r') as f:
        content = f.read()

    for dep in deps:
        # Find the useMemo for this map and use the specific array
        # This is a bit tricky with regex, but let's try to find the memory.X and replace with [memory.X]
        # Actually, let's just use the destructured version if possible or just use memory.X and disable lint if it still complains.
        # Better: destructure at the top of the component.
        pass

# Let's just do a simple replacement to try memory.X again and see if destructuring helps.
