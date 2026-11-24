import zipfile
import xml.etree.ElementTree as ET

def read_docx(path):
    with zipfile.ZipFile(path) as docx:
        xml_content = docx.read('word/document.xml')
        tree = ET.XML(xml_content)
        NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        paragraphs = []
        for paragraph in tree.iter(NAMESPACE + 'p'):
            texts = [node.text for node in paragraph.iter(NAMESPACE + 't') if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        return '\n'.join(paragraphs)

content = read_docx(r'c:\Users\vansh\OneDrive\Desktop\CGIP\SkyMapAR_Web_Development_Stages_1.docx')
with open(r'c:\Users\vansh\OneDrive\Desktop\CGIP\output.txt', 'w', encoding='utf-8') as f:
    f.write(content)
