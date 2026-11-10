import base64, io, json, re, sys, zipfile
from xml.etree import ElementTree

try:
    item = json.load(sys.stdin)
    data = base64.b64decode(item['data'])
    filename = item['filename'].lower()
    if filename.endswith('.pdf'):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        text = '\n'.join((page.extract_text() or '') for page in reader.pages[:30])
    elif filename.endswith('.docx'):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            info = archive.getinfo('word/document.xml')
            if info.file_size > 8_000_000:
                raise ValueError('Documento muito grande')
            root = ElementTree.fromstring(archive.read(info))
            text = '\n'.join(' '.join(n.itertext()) for n in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
    elif filename.endswith('.txt'):
        text = data.decode('utf-8', errors='replace')
    else:
        text = ''
    text = re.sub(r'\n{3,}', '\n\n', text).strip()[:100000]
    print(json.dumps({'text': text}, ensure_ascii=False))
except Exception:
    print(json.dumps({'text': ''}))
