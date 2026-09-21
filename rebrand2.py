import os

replacements = [
    ("<title>LibLog</title>", "<title>CCC LIB APP</title>"),
    ("LibLog Desktop Admin", "CCC LIB APP Desktop Admin"),
    ('ml-2">LibLog</span>', 'ml-2">CCC LIB APP</span>'),
    ("Welcome to LibLog!", "Welcome to CCC LIB APP!"),
    ("Welcome to LibLog", "Welcome to CCC LIB APP"),
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
