"""
Exemplo simples de geração de sinais para cada categoria.
"""

import random
import datetime

# Simulação das categorias de ativos
CATEGORIAS = ["Blitz", "Digital", "Binary", "Outro"]
ATIVOS = {
    "Blitz": ["USD/BRL (OTC)", "ETH/USD (OTC)", "Google (OTC)", "CARDANO (OTC)", "Tesla (OTC)"],
    "Digital": [
        "Gold/Silver (OTC)", "Worldcoin (OTC)", "USD/THB (OTC)", "ETH/USD (OTC)", "CHF/JPY (OTC)",
        "Pepe (OTC)", "GBP/AUD (OTC)", "GBP/CHF", "GBP/CAD (OTC)", "EUR/JPY (OTC)",
        "AUD/CHF", "GER 30 (OTC)", "AUD/CHF (OTC)", "EUR/AUD", "USD/CAD (OTC)",
        "BTC/USD", "Amazon/Ebay (OTC)", "Coca-Cola Company (OTC)", "AIG (OTC)", "Amazon/Alibaba (OTC)",
        "Bitcoin Cash (OTC)", "AUD/USD", "DASH (OTC)", "BTC/USD (OTC)", "SP 35 (OTC)",
        "TRUMP Coin (OTC)", "US 100 (OTC)", "EUR/CAD (OTC)", "HK 33 (OTC)", "Alphabet/Microsoft (OTC)",
        "1000Sats (OTC)", "USD/ZAR (OTC)", "Litecoin (OTC)", "Hamster Kombat (OTC)", "USD Currency Index (OTC)",
        "AUS 200 (OTC)", "USD/CAD", "MELANIA Coin (OTC)", "JP 225 (OTC)", "AUD/CAD (OTC)",
        "AUD/JPY (OTC)", "US 500 (OTC)"
    ],
    "Binary": ["MELANIA Coin (OTC)", "TRUMP Coin (OTC)", "1000Sats (OTC)", "Litecoin (OTC)", "Celestia (OTC)"],
    "Outro": ["Ativo Genérico"]
}

def calcular_horario_entrada(horario_atual):
    """Calcula o horário de entrada do sinal com base no último dígito do minuto atual"""
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

def obter_tempo_expiracao(categoria):
    """Obtém o tempo de expiração baseado na categoria"""
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

def formatar_mensagem_expiracao(categoria, minutos, segundos, horario_expiracao):
    """Formata a mensagem de expiração"""
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

def calcular_horarios_reentrada(horario_expiracao, tempo_expiracao_minutos):
    """Calcula os horários de reentrada"""
    # Reentrada 1 = Horário de expiração + 2 minutos
    reentrada1 = horario_expiracao + datetime.timedelta(minutes=2)
    
    # Reentrada 2 = Reentrada 1 + tempo de expiração + 2 minutos
    reentrada2 = reentrada1 + datetime.timedelta(minutes=tempo_expiracao_minutos + 2)
    
    return reentrada1, reentrada2

def gerar_mensagem_sinal(categoria):
    """Gera uma mensagem de sinal para uma categoria"""
    # Selecionar um ativo aleatório para esta categoria
    ativo = random.choice(ATIVOS[categoria])
    
    # Obter tempos de expiração
    tempo_expiracao_minutos, segundos = obter_tempo_expiracao(categoria)
    
    # Horário atual
    agora = datetime.datetime.now()
    
    # Calcular o horário de entrada usando a nova lógica
    horario_entrada = calcular_horario_entrada(agora)
    
    # Calcular horário de expiração a partir do horário de entrada (não do horário atual)
    horario_expiracao = horario_entrada + datetime.timedelta(minutes=tempo_expiracao_minutos)
    
    # Formatar mensagem de expiração
    mensagem_expiracao = formatar_mensagem_expiracao(categoria, tempo_expiracao_minutos, 
                                                 segundos, horario_expiracao)
    
    # Calcular horários de reentrada
    reentrada1, reentrada2 = calcular_horarios_reentrada(horario_expiracao, tempo_expiracao_minutos)
    
    # Gerar direção aleatória (Alta ou Baixa)
    direcao = random.choice(["ALTA", "BAIXA"])
    
    # Verificar o último dígito do minuto atual (para exibir)
    ultimo_digito = agora.minute % 10
    minutos_adicionados = 2 if ultimo_digito != 7 else 3
    
    # Formatar mensagem completa usando o novo formato
    return (
        f"SINAL ABERTO - {ativo}\n\n"
        f"Direção: {direcao}\n"
        f"Entrada: {horario_entrada.strftime('%H:%M')}\n"
        f"{mensagem_expiracao}\n\n"
        f"Reentradas:\n"
        f"1 - {reentrada1.strftime('%H:%M')}\n"
        f"2 - {reentrada2.strftime('%H:%M')}\n\n"
        f"Categoria: {categoria}\n"
        f"[Último dígito: {ultimo_digito}, +{minutos_adicionados} min]"
    )

def main():
    """Função principal que demonstra os sinais para cada categoria"""
    print("=== DEMONSTRAÇÃO DE SINAIS POR CATEGORIA ===")
    
    for categoria in CATEGORIAS:
        print("\n" + "="*60)
        print(f"Categoria: {categoria}")
        print("="*60)
        
        # Gerar e exibir o sinal
        mensagem = gerar_mensagem_sinal(categoria)
        print(mensagem)
        
        # Informações adicionais para debug
        tempo_expiracao_minutos, segundos = obter_tempo_expiracao(categoria)
        print("\nInformações adicionais:")
        print(f"- Tempo de expiração: {tempo_expiracao_minutos} minuto(s)")
        if segundos:
            print(f"- Segundos adicionais: {segundos} segundos")

if __name__ == "__main__":
    main() 