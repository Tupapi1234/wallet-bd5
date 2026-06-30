import sys
import os

def read_pdf(pdf_path, txt_path):
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print("Success using pypdf")
        return
    except ImportError:
        pass

    try:
        # If no library, try simple strings extraction
        with open(pdf_path, 'rb') as f:
            content = f.read()
        
        # Simple extraction of text elements in parentheses
        import re
        # Find text inside ( )
        matches = re.findall(b'\\((.*?)\\)', content)
        text_parts = []
        for m in matches:
            try:
                decoded = m.decode('utf-8', errors='ignore')
                if len(decoded.strip()) > 3:
                    text_parts.append(decoded)
            except Exception:
                pass
        
        text = "\n".join(text_parts)
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print("Fallback strings extraction complete")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    pdf = r"c:\Users\Usuario\Desktop\Proyecto Cryptowallet\DOCUMENTO DE REQUERIMIENTOS Y ESPECIFICACIONES.pdf"
    txt = r"c:\Users\Usuario\Desktop\Proyecto Cryptowallet\scratch\pdf_text.txt"
    read_pdf(pdf, txt)
