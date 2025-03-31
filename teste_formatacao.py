"""
Teste de formatação dos sinais.
"""

def main():
    """Teste rápido de formatação de mensagens"""
    
    # Blitz
    print("=== CATEGORIA BLITZ ===")
    msg_blitz = (
        f"SINAL ABERTO - Google (OTC)\n\n"
        f"Direção: ALTA\n"
        f"Expiração: 15 segundos\n\n"
        f"Reentradas:\n"
        f"1 - 18:40\n"
        f"2 - 18:43\n\n"
        f"Categoria: Blitz"
    )
    print(msg_blitz)
    
    print("\n\n=== CATEGORIA DIGITAL ===")
    msg_digital = (
        f"SINAL ABERTO - JPY Currency Index\n\n"
        f"Direção: BAIXA\n"
        f"Expiração: 5 minutos (18:45)\n\n"
        f"Reentradas:\n"
        f"1 - 18:47\n"
        f"2 - 18:54\n\n"
        f"Categoria: Digital"
    )
    print(msg_digital)
    
    print("\n\n=== CATEGORIA BINARY ===")
    msg_binary = (
        f"SINAL ABERTO - TRUMP Coin (OTC)\n\n"
        f"Direção: ALTA\n"
        f"Expiração: 1 minuto (18:41)\n\n"
        f"Reentradas:\n"
        f"1 - 18:43\n"
        f"2 - 18:46\n\n"
        f"Categoria: Binary"
    )
    print(msg_binary)
    
    print("\n\n=== CATEGORIA OUTRO ===")
    msg_outro = (
        f"SINAL ABERTO - Ativo Genérico\n\n"
        f"Direção: BAIXA\n"
        f"Expiração: até 5 minutos\n\n"
        f"Reentradas:\n"
        f"1 - 18:47\n"
        f"2 - 18:54\n\n"
        f"Categoria: Outro"
    )
    print(msg_outro)

if __name__ == "__main__":
    main() 