import re

with open("src/utils/downloadUtils.ts", "r") as f:
    content = f.read()

new_logic = """        const isInternal =
          hostname === 'localhost' ||
          hostname === '0.0.0.0' ||
          hostname === '[::1]' ||
          hostname === '[::]' ||
          /^127\\.(?:[0-9]{1,3}\\.){2}[0-9]{1,3}$/.test(hostname) ||
          /^10\\.(?:[0-9]{1,3}\\.){2}[0-9]{1,3}$/.test(hostname) ||
          /^172\\.(?:1[6-9]|2[0-9]|3[0-1])\\.[0-9]{1,3}\\.[0-9]{1,3}$/.test(hostname) ||
          /^192\\.168\\.[0-9]{1,3}\\.[0-9]{1,3}$/.test(hostname) ||
          /^169\\.254\\.[0-9]{1,3}\\.[0-9]{1,3}$/.test(hostname) ||
          /^\\[f[cd][0-9a-f:]+\\]$/i.test(hostname) ||
          /^\\[fe80:[0-9a-f:]+\\]$/i.test(hostname) ||
          hostname.endsWith('.localhost') ||
          hostname.endsWith('.local') ||
          hostname.endsWith('.internal');"""

content = re.sub(r"        const isInternal =\n          hostname === 'localhost' \|\|\n          hostname === '0\.0\.0\.0' \|\|\n          hostname === '\[::1\]' \|\|\n          hostname === '\[::\]' \|\|\n          /\^127\\\.\(\?:\[0-9\]\{1,3\}\\\.\)\{2\}\[0-9\]\{1,3\}\$\/\.test\(hostname\) \|\|\n          /\^10\\\.\(\?:\[0-9\]\{1,3\}\\\.\)\{2\}\[0-9\]\{1,3\}\$\/\.test\(hostname\) \|\|\n          /\^172\\\.\(\?:1\[6-9\]\|2\[0-9\]\|3\[0-1\]\)\\\.\[0-9\]\{1,3\}\\\.\[0-9\]\{1,3\}\$\/\.test\(hostname\) \|\|\n          /\^192\\\.168\\\.\[0-9\]\{1,3\}\\\.\[0-9\]\{1,3\}\$\/\.test\(hostname\) \|\|\n          /\^169\\\.254\\\.\[0-9\]\{1,3\}\\\.\[0-9\]\{1,3\}\$\/\.test\(hostname\) \|\|\n          /\^\\[f\[cd\]\[0-9a-f:\]\+\\]\$\/i\.test\(hostname\) \|\|\n          /\^\\[fe80:\[0-9a-f:\]\+\\]\$\/i\.test\(hostname\) \|\|\n          hostname\.endsWith\('\.localhost'\) \|\|\n          hostname\.endsWith\('\.local'\) \|\|\n          hostname\.endsWith\('\.internal'\);", new_logic, content)


with open("src/utils/downloadUtils.ts", "w") as f:
    f.write(content)
