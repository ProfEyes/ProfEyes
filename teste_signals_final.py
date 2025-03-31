"""
Teste final para verificar a formatação do sinal.
"""

import random
import datetime
from typing import Dict, List, Tuple, Optional

# Categorias de teste
CATEGORIAS_TESTE = {
    "USD/BRL (OTC)": "Blitz",
    "Google (OTC)": "Blitz",
    "Tesla (OTC)": "Blitz",
    "XAUUSD (OTC)": "Digital",
    "JPY Currency Index": "Digital",
    "AUS 200 (OTC)": "Digital",
    "MELANIA Coin (OTC)": "Binary",
    "TRUMP Coin (OTC)": "Binary",
    "Litecoin (OTC)": "Binary",
    "Ativo Desconhecido": "Outro"
}

def obter_tempo_expiracao(categoria: str) -> Tuple[int, Optional[int]]:
    """
    Obtém o tempo de expiração em minutos e segundos com base na categoria do ativo.
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
    """
    # Reentrada 1 = Horário de expiração + 2 minutos
    reentrada1 = horario_expiracao + datetime.timedelta(minutes=2)
    
    # Reentrada 2 = Reentrada 1 + tempo de expiração + 2 minutos
    reentrada2 = reentrada1 + datetime.timedelta(minutes=tempo_expiracao_minutos + 2)
    
    return reentrada1, reentrada2

def calcular_horario_entrada(horario_atual: datetime.datetime) -> datetime.datetime:
    """
    Calcula o horário de entrada do sinal com base no último dígito do minuto atual.
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
    """
    if horario_atual is None:
        horario_atual = datetime.datetime.now()
    
    # Obter a categoria do ativo
    categoria = CATEGORIAS_TESTE.get(ativo, "Outro")
    
    # Calcular o horário de entrada usando a nova lógica
    horario_entrada = calcular_horario_entrada(horario_atual)
    
    # Obter tempo de expiração
    tempo_expiracao_minutos, segundos_adicionais = obter_tempo_expiracao(categoria)
    
    # Calcular horário de expiração a partir do horário de entrada
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
        "horario_entrada": horario_entrada,
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
    """
    return (
        f"SINAL ABERTO - {sinal['ativo']}\n\n"
        f"Direção: {sinal['direcao']}\n"
        f"Entrada: {sinal['horario_entrada'].strftime('%H:%M')}\n"
        f"{sinal['mensagem_expiracao']}\n\n"
        f"Reentradas:\n"
        f"1 - {sinal['reentrada1'].strftime('%H:%M')}\n"
        f"2 - {sinal['reentrada2'].strftime('%H:%M')}\n\n"
        f"Categoria: {sinal['categoria']}"
    )

def main():
    """
    Função principal para testar a geração de sinais.
    """
    print("TESTE FINAL DE FORMATAÇÃO DE SINAIS\n")
    
    # Testar um sinal de cada categoria
    for ativo, categoria in CATEGORIAS_TESTE.items():
        print(f"=== CATEGORIA: {categoria} ===")
        
        # Gerar o sinal
        sinal = gerar_sinal(ativo)
        
        # Formatar a mensagem
        mensagem = formatar_mensagem_sinal(sinal)
        
        # Exibir a mensagem
        print(mensagem)
        
        # Mostrar detalhes do cálculo do horário
        horario_atual = sinal["horario_atual"]
        ultimo_digito = horario_atual.minute % 10
        minutos_adicionados = 2 if ultimo_digito != 7 else 3
        print(f"\nHorário atual: {horario_atual.strftime('%H:%M')}")
        print(f"Último dígito: {ultimo_digito}, minutos adicionados: {minutos_adicionados}")
        print(f"Horário de entrada calculado: {sinal['horario_entrada'].strftime('%H:%M')}")
        print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main() 