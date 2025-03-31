"""
Script simples para demonstrar o formato dos sinais.
"""

import random
import datetime
from typing import Dict, List

# Demonstração de sinais para cada categoria

def main():
    """
    Demonstração de sinais para cada categoria
    """
    print("Exemplos de sinais por categoria:")
    
    # Horário atual para simulação
    now = datetime.datetime.now()
    
    # Exemplo 1: Blitz
    segundos = random.choice([5, 10, 15, 30])
    horario_exp = now + datetime.timedelta(minutes=1)
    reentrada1 = horario_exp + datetime.timedelta(minutes=2)
    reentrada2 = reentrada1 + datetime.timedelta(minutes=3)
    
    print("\n=== CATEGORIA: Blitz ===")
    print(f"""
📊 SINAL ABERTO - USD/BRL (OTC)

🟢 Direção: ALTA
⏳ Expiração: {segundos} segundos

⚠️ Reentradas:
1️⃣ {reentrada1.strftime('%H:%M')}
2️⃣ {reentrada2.strftime('%H:%M')}

⚡ Categoria: Blitz
""")
    
    # Exemplo 2: Digital
    minutos = random.choice([1, 3, 5])
    horario_exp = now + datetime.timedelta(minutes=minutos)
    reentrada1 = horario_exp + datetime.timedelta(minutes=2)
    reentrada2 = reentrada1 + datetime.timedelta(minutes=minutos + 2)
    
    print("\n=== CATEGORIA: Digital ===")
    msg_exp = f"⏳ Expiração: 1 minuto ({horario_exp.strftime('%H:%M')})" if minutos == 1 else f"⏳ Expiração: {minutos} minutos ({horario_exp.strftime('%H:%M')})"
    print(f"""
📊 SINAL ABERTO - XAUUSD (OTC)

🔴 Direção: BAIXA
{msg_exp}

⚠️ Reentradas:
1️⃣ {reentrada1.strftime('%H:%M')}
2️⃣ {reentrada2.strftime('%H:%M')}

⚡ Categoria: Digital
""")
    
    # Exemplo 3: Binary
    horario_exp = now + datetime.timedelta(minutes=1)
    reentrada1 = horario_exp + datetime.timedelta(minutes=2)
    reentrada2 = reentrada1 + datetime.timedelta(minutes=3)
    
    print("\n=== CATEGORIA: Binary ===")
    print(f"""
📊 SINAL ABERTO - MELANIA Coin (OTC)

🟢 Direção: ALTA
⏳ Expiração: 1 minuto ({horario_exp.strftime('%H:%M')})

⚠️ Reentradas:
1️⃣ {reentrada1.strftime('%H:%M')}
2️⃣ {reentrada2.strftime('%H:%M')}

⚡ Categoria: Binary
""")
    
    # Exemplo 4: Outros
    horario_exp = now + datetime.timedelta(minutes=5)
    reentrada1 = horario_exp + datetime.timedelta(minutes=2)
    reentrada2 = reentrada1 + datetime.timedelta(minutes=7)
    
    print("\n=== CATEGORIA: Outro ===")
    print(f"""
📊 SINAL ABERTO - Ativo Desconhecido

🔴 Direção: BAIXA
⏳ Expiração: até 5 minutos

⚠️ Reentradas:
1️⃣ {reentrada1.strftime('%H:%M')}
2️⃣ {reentrada2.strftime('%H:%M')}

⚡ Categoria: Outro
""")

if __name__ == "__main__":
    main() 