"""
Exemplo de como implementar a geração de sinais a cada 10 minutos para a Dashboard.
Este exemplo simula o comportamento que a Dashboard deve ter ao gerar sinais.
"""

import time
import datetime
import threading
from typing import Dict, List, Optional

# Importar os módulos necessários para geração de sinais
from src.data.signals import (
    gerar_sinais_para_dashboard, 
    obter_proximo_horario_geracao,
    eh_hora_de_gerar_sinais
)

# Armazenar os sinais atualmente exibidos na Dashboard
sinais_atuais: List[Dict] = []
ultimo_horario_geracao: Optional[datetime.datetime] = None
lock = threading.Lock()  # Para acesso thread-safe aos sinais

def atualizar_sinais_dashboard():
    """
    Atualiza os sinais na dashboard se for o momento adequado.
    Retorna True se os sinais foram atualizados, False caso contrário.
    """
    global sinais_atuais, ultimo_horario_geracao
    
    # Verificar se é hora de gerar novos sinais
    if eh_hora_de_gerar_sinais():
        # Thread safety para atualização dos sinais
        with lock:
            # Obter o horário atual arredondado para baixo em múltiplos de 10 minutos
            agora = datetime.datetime.now()
            horario_base = agora.replace(minute=(agora.minute // 10) * 10, second=0, microsecond=0)
            
            # Verificar se já geramos sinais para este intervalo
            if ultimo_horario_geracao is None or ultimo_horario_geracao < horario_base:
                print(f"Gerando novos sinais às {agora.strftime('%H:%M:%S')}")
                
                # Gerar 5 sinais para a dashboard
                sinais_atuais = gerar_sinais_para_dashboard(5)
                ultimo_horario_geracao = horario_base
                
                # Exibir os sinais gerados
                print(f"Sinais gerados para o período de {horario_base.strftime('%H:%M')} até {(horario_base + datetime.timedelta(minutes=10)).strftime('%H:%M')}")
                for i, sinal in enumerate(sinais_atuais, 1):
                    print(f"\n=== SINAL {i} ===")
                    print(sinal['mensagem_formatada'])
                    print(f"Válido até: {sinal['valido_ate'].strftime('%H:%M')}")
                
                return True
    
    return False

def verificar_validade_sinais():
    """
    Verifica se os sinais atuais ainda são válidos com base no horário atual.
    Retorna True se todos os sinais são válidos, False caso contrário.
    """
    global sinais_atuais
    
    if not sinais_atuais:
        return False
    
    agora = datetime.datetime.now()
    return all(sinal["valido_ate"] > agora for sinal in sinais_atuais)

def obter_sinais_validos():
    """
    Retorna os sinais atualmente válidos para exibição na Dashboard.
    Se não houver sinais válidos ou for hora de atualizar, gera novos sinais.
    """
    global sinais_atuais
    
    with lock:
        # Se não há sinais ou os sinais não são mais válidos, tenta atualizar
        if not sinais_atuais or not verificar_validade_sinais():
            atualizar_sinais_dashboard()
        
        return sinais_atuais.copy()  # Retorna uma cópia para evitar modificação externa

def loop_verificacao_sinais():
    """
    Loop principal que verifica periodicamente se é hora de atualizar os sinais.
    Em um cenário real, este loop seria executado em uma thread separada.
    """
    print("Iniciando loop de verificação de sinais...")
    print(f"Próxima atualização programada para: {obter_proximo_horario_geracao().strftime('%H:%M')}")
    
    try:
        while True:
            if atualizar_sinais_dashboard():
                proximo = obter_proximo_horario_geracao()
                print(f"Sinais atualizados. Próxima atualização em: {proximo.strftime('%H:%M')}")
            
            # Verifica a cada 5 segundos (em um cenário real, poderia ser maior)
            time.sleep(5)
    except KeyboardInterrupt:
        print("Loop interrompido pelo usuário.")

def simular_dashboard():
    """
    Simula o comportamento da Dashboard por um período de tempo.
    Mostra quando os sinais são atualizados e quando são consultados.
    """
    print("=== SIMULAÇÃO DA DASHBOARD ===")
    
    # Exibir o próximo horário de atualização
    proximo = obter_proximo_horario_geracao()
    print(f"Próxima atualização programada para: {proximo.strftime('%H:%M')}")
    
    # Forçar a geração de sinais para demonstração
    print("\n=== FORÇANDO GERAÇÃO DE SINAIS PARA DEMONSTRAÇÃO ===")
    
    # Gerar sinais manualmente para demonstração
    sinais_demo = gerar_sinais_para_dashboard(5)
    print(f"Sinais de demonstração gerados para o período atual")
    
    for i, sinal in enumerate(sinais_demo, 1):
        print(f"\n=== SINAL {i} ===")
        print(sinal['mensagem_formatada'])
        print(f"Válido até: {sinal['valido_ate'].strftime('%H:%M')}")
    
    global sinais_atuais, ultimo_horario_geracao
    sinais_atuais = sinais_demo
    ultimo_horario_geracao = datetime.datetime.now().replace(minute=(datetime.datetime.now().minute // 10) * 10, second=0, microsecond=0)
    
    print("\n=== SIMULANDO VERIFICAÇÕES PERIÓDICAS DA DASHBOARD ===")
    # Simular verificações periódicas da dashboard
    try:
        for i in range(24):  # Simula 2 minutos (24 verificações a cada 5 segundos)
            print(f"\n[Verificação {i+1}] - {datetime.datetime.now().strftime('%H:%M:%S')}")
            
            # Obter sinais válidos
            sinais = obter_sinais_validos()
            
            if sinais:
                print(f"Exibindo {len(sinais)} sinais válidos na Dashboard.")
                # Exibir o primeiro sinal como exemplo
                if i % 6 == 0:  # Mostrar apenas a cada 30 segundos para não sobrecarregar o console
                    print("\nExemplo do primeiro sinal:")
                    print(sinais[0]['mensagem_formatada'])
            else:
                print("Não há sinais válidos para exibir.")
            
            # Em uma implementação real, aqui renderizaríamos os sinais na UI
            
            # Verifica a cada 5 segundos
            time.sleep(5)
    except KeyboardInterrupt:
        print("Simulação interrompida pelo usuário.")
    
    print("\nSimulação concluída.")

if __name__ == "__main__":
    # Para uma simulação rápida:
    simular_dashboard()
    
    # Para um loop contínuo:
    # loop_verificacao_sinais() 