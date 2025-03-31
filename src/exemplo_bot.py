"""
Exemplo de uso do módulo de sinais em um bot de Telegram.
Este é apenas um exemplo demonstrativo, não uma implementação completa.
"""

import time
import random
import schedule
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Adicionar o diretório pai ao sys.path para permitir importações relativas
sys.path.insert(0, str(Path(__file__).parent.parent))

# Importar os módulos de sinais
from src.data.signals import gerar_sinal, gerar_sinais_periodicos, formatar_mensagem_sinal
from src.data.assets import ATIVOS_CATEGORIAS

# Simulação de função para enviar mensagem ao Telegram
def enviar_mensagem_telegram(mensagem: str, chat_id: str = None):
    """
    Simula o envio de uma mensagem para o Telegram.
    Em uma implementação real, isso usaria a API do Telegram.
    
    Args:
        mensagem: Texto da mensagem a ser enviada
        chat_id: ID do chat para enviar a mensagem (opcional)
    """
    print(f"\n[TELEGRAM] Enviando mensagem{' para ' + chat_id if chat_id else ''}:")
    print("-" * 50)
    print(mensagem)
    print("-" * 50)

# Função para enviar um sinal para o Telegram
def enviar_sinal():
    """
    Gera e envia um sinal aleatório para o Telegram.
    """
    # Seleciona um ativo aleatório
    ativo = random.choice(list(ATIVOS_CATEGORIAS.keys()))
    
    # Gera um sinal para o ativo
    sinal = gerar_sinal(ativo)
    
    # Formata a mensagem do sinal
    mensagem = formatar_mensagem_sinal(sinal)
    
    # Simula o envio para o Telegram
    enviar_mensagem_telegram(mensagem, "canal_sinais")
    
    # Registra o sinal enviado
    print(f"Sinal enviado para o ativo {ativo} ({sinal['categoria']}) às {datetime.now().strftime('%H:%M:%S')}")

def enviar_sinais_por_categoria():
    """
    Envia um sinal para cada categoria de ativo.
    """
    # Obter uma lista única de categorias
    categorias = set(ATIVOS_CATEGORIAS.values())
    
    for categoria in categorias:
        # Encontrar ativos desta categoria
        ativos_categoria = [ativo for ativo, cat in ATIVOS_CATEGORIAS.items() if cat == categoria]
        
        if ativos_categoria:
            # Selecionar um ativo aleatório desta categoria
            ativo = random.choice(ativos_categoria)
            
            # Gerar um sinal para o ativo
            sinal = gerar_sinal(ativo)
            
            # Formatar a mensagem do sinal
            mensagem = formatar_mensagem_sinal(sinal)
            
            # Simular o envio para o Telegram
            enviar_mensagem_telegram(mensagem, f"canal_{categoria.lower()}")
            
            # Registrar o sinal enviado
            print(f"Sinal de categoria {categoria} enviado para o ativo {ativo} às {datetime.now().strftime('%H:%M:%S')}")

def programar_sinais():
    """
    Programa o envio de sinais a cada 10 minutos.
    """
    print("Programando envio de sinais a cada 10 minutos...")
    
    # Programa o envio de um sinal a cada 10 minutos
    schedule.every(10).minutes.do(enviar_sinal)
    
    # Também envia sinais de cada categoria uma vez por hora
    schedule.every(1).hour.do(enviar_sinais_por_categoria)
    
    # Enviar um sinal imediatamente para demonstração
    enviar_sinal()
    
    # Manter o programa em execução
    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        print("Programa interrompido pelo usuário.")

# Exemplo de uso para demonstração
def demonstracao():
    """
    Demonstração do funcionamento do bot com exemplos de sinais.
    """
    print("Demonstração do bot de sinais")
    print("=" * 50)
    
    # 1. Enviar um sinal aleatório
    print("\n1. Enviando um sinal aleatório:")
    enviar_sinal()
    
    # 2. Enviar sinais para cada categoria
    print("\n2. Enviando sinais para cada categoria:")
    enviar_sinais_por_categoria()
    
    # 3. Demonstrar a geração de múltiplos sinais periódicos
    print("\n3. Demonstração de sinais periódicos (3 sinais com intervalo de 10 minutos):")
    sinais = gerar_sinais_periodicos(intervalo_minutos=10, total_sinais=3)
    
    for i, sinal in enumerate(sinais, 1):
        print(f"\nSinal {i} - Horário: {sinal['horario_atual'].strftime('%H:%M')}")
        enviar_mensagem_telegram(sinal["mensagem_formatada"])
    
    print("\nDemonstração concluída!")

if __name__ == "__main__":
    # Para demonstração, apenas mostra exemplos de sinais
    demonstracao()
    
    # Para executar o bot com agendamento, descomente a linha abaixo:
    # programar_sinais() 