with open(r'c:\Users\Usuario\Desktop\Proyecto Cryptowallet\src\components\views.tsx', 'r', encoding='utf-8') as f, open(r'c:\Users\Usuario\Desktop\Proyecto Cryptowallet\scratch\overflow_lines.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(f, 1):
        if 'overflow-y-auto' in line:
            out.write(f"{i}: {line.strip()}\n")
