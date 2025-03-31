"""
Script para testar a geração de sinais.
"""

from src.data.signals import gerar_sinais_periodicos

def main():
    """
    Função principal para testar a geração de sinais.
    """
    print("Gerando sinais de teste...")
    
    # Gera 3 sinais com intervalos de 10 minutos
    sinais = gerar_sinais_periodicos(intervalo_minutos=10, total_sinais=3)
    
    # Exibe as mensagens formatadas
    for i, sinal in enumerate(sinais, 1):
        print(f"\n=== SINAL {i} ===")
        print(sinal["mensagem_formatada"])
        print(f"\nHorário geração: {sinal['horario_atual'].strftime('%H:%M:%S')}")
        print(f"Horário expiração: {sinal['horario_expiracao'].strftime('%H:%M:%S')}")
        print(f"Categoria: {sinal['categoria']}")
        print("="*40)

if __name__ == "__main__":
    main() 