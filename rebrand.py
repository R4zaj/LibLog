import os

replacements = [
    ("Welcome to LibLog", "Welcome to CCC LIB APP"),
    ("LibLog Desktop Admin", "CCC LIB APP Desktop Admin"),
    ("LibLog_Report_", "CCC_LIB_APP_Report_"),
    ("LibLog Library Management System", "CCC LIB APP Library Management System"),
    ("LibLog - Your Verification Code", "CCC LIB APP - Your Verification Code"),
    ('"name": "LibLog Mobile"', '"name": "CCC LIB APP Mobile"'),
    ("explore LibLog", "explore CCC LIB APP"),
    ("LibLog values your privacy", "CCC LIB APP values your privacy"),
    ("LibLog Mobile Version", "CCC LIB APP Mobile Version"),
    ("# LibLog — Library", "# CCC LIB APP — Library"),
    ("LibLog is a dual-platform", "CCC LIB APP is a dual-platform"),
    ("Welcome to the LibLog", "Welcome to the CCC LIB APP"),
    ("LibLog_Export_", "CCC_LIB_APP_Export_"),
    ("LibLog_Activity_Report_", "CCC_LIB_APP_Activity_Report_"),
    ("name: 'LibLog'", "name: 'CCC LIB APP'"),
    ('ml-2">LibLog</span>', 'ml-2">CCC LIB APP</span>'),
    ("Welcome to LibLog!", "Welcome to CCC LIB APP!"),
]

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for old, new in replacements:
            new_content = new_content.replace(old, new)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'dist' in root or 'scratch' in root or 'electron' in root:
        continue
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.md')):
            process_file(os.path.join(root, file))

print("Rebranding complete.")
