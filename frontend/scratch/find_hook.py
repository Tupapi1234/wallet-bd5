with open(r'c:\Users\Usuario\Desktop\Proyecto Cryptowallet\src\components\views.tsx', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'useDragToScroll' in line:
            print(f"{i}: {line.strip()}")
