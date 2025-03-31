"""
Módulo para geração de sinais com base nas categorias de ativos.
Implementa as diferentes regras de expiração para cada categoria de ativo.
"""

import random
import datetime
from typing import Dict, List, Tuple, Optional

from .assets import ATIVOS_CATEGORIAS, assets, inicializar_horarios_ativos

# Certifique-se de que os horários dos ativos estão inicializados
inicializar_horarios_ativos()

def obter_tempo_expiracao(categoria: str) -> Tuple[int, Optional[int]]:
    """
    Obtém o tempo de expiração em minutos e segundos com base na categoria do ativo.
    
    Args:
        categoria: A categoria do ativo (Blitz, Digital, Binary, etc.)
        
    Returns:
        Tupla contendo (minutos, segundos) para expiração
    """
    if categoria == "Blitz":
        # Tempo fixo de 1 minuto, segundos aleatórios: 5, 10, 15 ou 30
        minutos = 1
        segundos = random.choice([5, 10, 15, 30])
        return minutos, segundos
    
    elif categoria == "Digital":
        # Tempo aleatório: 1, 3 ou 5 minutos
        minutos = random.choice([1, 3, 5])
        return minutos, None
    
    elif categoria == "Binary":
        # Tempo fixo: 1 minuto
        return 1, None
    
    else:
        # Padrão: 5 minutos
        return 5, None

def formatar_mensagem_expiracao(categoria: str, minutos: int, segundos: Optional[int], 
                               horario_expiracao: datetime.datetime) -> str:
    """
    Formata a mensagem de expiração com base na categoria e tempo de expiração.
    
    Args:
        categoria: A categoria do ativo
        minutos: Minutos para expiração
        segundos: Segundos para expiração (opcional)
        horario_expiracao: O horário calculado de expiração
        
    Returns:
        Mensagem formatada de expiração
    """
    if categoria == "Blitz":
        return f"Expiração: {segundos} segundos"
    
    elif categoria == "Digital":
        if minutos == 1:
            return f"Expiração: 1 minuto ({horario_expiracao.strftime('%H:%M')})"
        else:
            return f"Expiração: {minutos} minutos ({horario_expiracao.strftime('%H:%M')})"
    
    elif categoria == "Binary":
        return f"Expiração: 1 minuto ({horario_expiracao.strftime('%H:%M')})"
    
    else:
        return f"Expiração: até 5 minutos"

def calcular_horarios_reentrada(horario_expiracao: datetime.datetime, 
                              tempo_expiracao_minutos: int) -> Tuple[datetime.datetime, datetime.datetime]:
    """
    Calcula os horários de reentrada com base no horário de expiração.
    
    Args:
        horario_expiracao: O horário de expiração do sinal
        tempo_expiracao_minutos: O tempo de expiração em minutos
        
    Returns:
        Tupla contendo (horario_reentrada1, horario_reentrada2)
    """
    # Reentrada 1 = Horário de expiração + 2 minutos
    reentrada1 = horario_expiracao + datetime.timedelta(minutes=2)
    
    # Reentrada 2 = Reentrada 1 + tempo de expiração + 2 minutos
    reentrada2 = reentrada1 + datetime.timedelta(minutes=tempo_expiracao_minutos + 2)
    
    return reentrada1, reentrada2

def calcular_horario_entrada(horario_atual: datetime.datetime) -> datetime.datetime:
    """
    Calcula o horário de entrada do sinal com base no último dígito do minuto atual.
    
    Args:
        horario_atual: O horário atual
        
    Returns:
        Horário de entrada calculado
    """
    # Obter o último dígito do minuto atual
    ultimo_digito = horario_atual.minute % 10
    
    # Determinar minutos a adicionar com base no último dígito
    if ultimo_digito == 3:
        minutos_adicionar = 2  # Se termina em 3, adiciona 2 minutos
    elif ultimo_digito == 7:
        minutos_adicionar = 3  # Se termina em 7, adiciona 3 minutos
    else:
        minutos_adicionar = 2  # Padrão: adiciona 2 minutos
    
    # Calcular o horário de entrada
    horario_entrada = horario_atual + datetime.timedelta(minutes=minutos_adicionar)
    
    return horario_entrada

def gerar_sinal(ativo: str, horario_atual: Optional[datetime.datetime] = None) -> Dict:
    """
    Gera um sinal para o ativo especificado com base em sua categoria.
    
    Args:
        ativo: O nome do ativo para gerar o sinal
        horario_atual: Horário atual (opcional, usa datetime.now() se não especificado)
        
    Returns:
        Dicionário contendo informações do sinal
    """
    if horario_atual is None:
        horario_atual = datetime.datetime.now()
    
    # Obter a categoria do ativo
    categoria = ATIVOS_CATEGORIAS.get(ativo, "Outro")
    
    # Aplicar a lógica do último dígito para calcular o horário de entrada do sinal
    horario_entrada = calcular_horario_entrada(horario_atual)
    
    # Obter tempo de expiração
    tempo_expiracao_minutos, segundos_adicionais = obter_tempo_expiracao(categoria)
    
    # Calcular horário de expiração a partir do horário de entrada (não do horário atual)
    horario_expiracao = horario_entrada + datetime.timedelta(minutes=tempo_expiracao_minutos)
    
    # Formatar mensagem de expiração
    mensagem_expiracao = formatar_mensagem_expiracao(categoria, tempo_expiracao_minutos, 
                                                 segundos_adicionais, horario_expiracao)
    
    # Calcular horários de reentrada
    reentrada1, reentrada2 = calcular_horarios_reentrada(horario_expiracao, tempo_expiracao_minutos)
    
    # Gerar direção aleatória (Alta ou Baixa)
    direcao = random.choice(["ALTA", "BAIXA"])
    
    # Construir sinal
    sinal = {
        "ativo": ativo,
        "categoria": categoria,
        "direcao": direcao,
        "horario_atual": horario_atual,
        "horario_entrada": horario_entrada,  # Novo campo para armazenar o horário de entrada
        "tempo_expiracao_minutos": tempo_expiracao_minutos,
        "segundos_adicionais": segundos_adicionais,
        "horario_expiracao": horario_expiracao,
        "mensagem_expiracao": mensagem_expiracao,
        "reentrada1": reentrada1,
        "reentrada2": reentrada2
    }
    
    return sinal

def formatar_mensagem_sinal(sinal: Dict) -> str:
    """
    Formata a mensagem completa do sinal para envio.
    
    Args:
        sinal: Dicionário contendo informações do sinal
        
    Returns:
        Mensagem formatada para envio
    """
    # Usar o horário de entrada para exibição, se disponível, senão usar o horário atual
    horario_exibir = sinal.get('horario_entrada', sinal['horario_atual'])
    
    return (
        f"SINAL ABERTO - {sinal['ativo']}\n\n"
        f"Direção: {sinal['direcao']}\n"
        f"Entrada: {horario_exibir.strftime('%H:%M')}\n"  # Adicionado horário de entrada
        f"{sinal['mensagem_expiracao']}\n\n"
        f"Reentradas:\n"
        f"1 - {sinal['reentrada1'].strftime('%H:%M')}\n"
        f"2 - {sinal['reentrada2'].strftime('%H:%M')}\n\n"
        f"Categoria: {sinal['categoria']}"
    )

def gerar_sinais_periodicos(intervalo_minutos: int = 10, 
                           total_sinais: int = 5, 
                           horario_atual: Optional[datetime.datetime] = None) -> List[Dict]:
    """
    Gera múltiplos sinais periódicos para envio.
    
    Args:
        intervalo_minutos: Intervalo em minutos entre os sinais (padrão: 10)
        total_sinais: Número total de sinais a gerar (padrão: 5)
        horario_atual: Horário inicial (opcional, usa datetime.now() se não especificado)
        
    Returns:
        Lista de sinais gerados
    """
    if horario_atual is None:
        horario_atual = datetime.datetime.now()
    
    sinais = []
    
    # Calcular o horário base usando a lógica do último dígito
    horario_base = calcular_horario_entrada(horario_atual)
    
    for i in range(total_sinais):
        # Escolhe um ativo aleatório
        ativo = random.choice(list(ATIVOS_CATEGORIAS.keys()))
        
        # Ajusta o horário conforme o intervalo a partir do horário base calculado
        horario_ajustado = horario_base + datetime.timedelta(minutes=i * intervalo_minutos)
        
        # Gera o sinal usando o horário ajustado como base
        # Usamos o horário atual apenas como referência, pois gerar_sinal já calculará o horário correto de entrada
        sinal = gerar_sinal(ativo, horario_atual)
        
        # Para o primeiro sinal, usamos o horário calculado com a regra do último dígito
        # Para os demais sinais, escalonamos a partir do primeiro
        if i > 0:
            # Ajustamos o horário de entrada para ser o horário base + intervalo
            sinal["horario_entrada"] = horario_ajustado
            
            # Recalculamos o horário de expiração a partir do novo horário de entrada
            sinal["horario_expiracao"] = horario_ajustado + datetime.timedelta(minutes=sinal["tempo_expiracao_minutos"])
            
            # Recalculamos os horários de reentrada
            sinal["reentrada1"], sinal["reentrada2"] = calcular_horarios_reentrada(
                sinal["horario_expiracao"], 
                sinal["tempo_expiracao_minutos"]
            )
            
            # Atualizamos a mensagem de expiração
            sinal["mensagem_expiracao"] = formatar_mensagem_expiracao(
                sinal["categoria"],
                sinal["tempo_expiracao_minutos"],
                sinal["segundos_adicionais"],
                sinal["horario_expiracao"]
            )
        
        # Adiciona a mensagem formatada ao sinal
        sinal["mensagem_formatada"] = formatar_mensagem_sinal(sinal)
        
        sinais.append(sinal)
    
    return sinais

# Exemplo de uso
if __name__ == "__main__":
    # Gera 5 sinais em intervalos de 10 minutos
    sinais = gerar_sinais_periodicos()
    
    # Exibe as mensagens formatadas
    for i, sinal in enumerate(sinais, 1):
        print(f"=== SINAL {i} ===")
        print(sinal["mensagem_formatada"])
        print("") 