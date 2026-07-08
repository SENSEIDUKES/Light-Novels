import sys

def fix_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    content = content.replace("const { provider, model, temperature, maxOutputTokens } = activeConfig;",
                              "const { provider, temperature, maxOutputTokens } = activeConfig;\n  let { model } = activeConfig;")
    content = content.replace("const { provider, model } = activeConfig;",
                              "const { provider } = activeConfig;\n  let { model } = activeConfig;")

    with open(filename, 'w') as f:
        f.write(content)

fix_file('src/aiRouter.ts')
