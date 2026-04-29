import re

ino_path = r'c:\Users\GODDARD\Documents\ADAPTRON\esp32_adaptron.ino'
out_path = r'c:\Users\GODDARD\Documents\ADAPTRON\adaptron_site_complet.html'

with open(ino_path, 'r', encoding='utf-8') as f:
    ino_content = f.read()

pattern = r'const\s+char\s+INDEX_HTML\[\]\s+PROGMEM\s*=\s*R"rawliteral\([\s\S]*?\)rawliteral";'

match = re.search(pattern, ino_content)
if match:
    # Extract the block
    block = match.group(0)
    # Strip the header and footer
    html_content = block.replace('const char INDEX_HTML[] PROGMEM = R"rawliteral(\n', '')
    html_content = html_content.replace('\n)rawliteral";', '')
    
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("SITE COMPLET EXPORTÉ VERS adaptron_site_complet.html")
else:
    print("INDEX_HTML NON TROUVÉ")
