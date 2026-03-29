
import zipfile
import xml.etree.ElementTree as ET
import os

def get_docx_text(path):
    document = zipfile.ZipFile(path)
    xml_content = document.read('word/document.xml')
    document.close()
    tree = ET.fromstring(xml_content)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = []
    for paragraph in tree.findall('.//w:p', ns):
        texts = "".join([node.text for node in paragraph.findall('.//w:t', ns) if node.text])
        if texts:
            paragraphs.append(texts)
    return "\n".join(paragraphs)

if __name__ == "__main__":
    path = r'C:\Data\primesoft\QUALITY INSPECTION COMMITTEE.docx'
    text = get_docx_text(path)
    with open('doc_content.txt', 'w', encoding='utf-8') as f:
        f.write(text)
