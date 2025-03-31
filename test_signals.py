"""
Script para testar a geração de sinais.
"""

import random
import datetime
from typing import Dict, List, Tuple, Optional

# Categorias de teste
CATEGORIAS_TESTE = {
    "Ativo Blitz": "Blitz",
    "Ativo Digital": "Digital",
    "Ativo Binary": "Binary",
    "Ativo Outro": "Outro"
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
        return f"⏳ Expiração: {segundos} segundos"
    
    elif categoria == "Digital":
        if minutos == 1:
            return f"⏳ Expiração: 1 minuto ({horario_expiracao.strftime('%H:%M')})"
        else:
            return f"⏳ Expiração: {minutos} minutos ({horario_expiracao.strftime('%H:%M')})"
    
    elif categoria == "Binary":
        return f"⏳ Expiração: 1 minuto ({horario_expiracao.strftime('%H:%M')})"
    
    else:
        return f"⏳ Expiração: até 5 minutos"

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

def gerar_sinal(ativo: str, categoria: str, horario_atual: Optional[datetime.datetime] = None) -> Dict:
    """
    Gera um sinal para o ativo especificado com base em sua categoria.
    """
    if horario_atual is None:
        horario_atual = datetime.datetime.now()
    
    # Obter tempo de expiração
    tempo_expiracao_minutos, segundos_adicionais = obter_tempo_expiracao(categoria)
    
    # Calcular horário de expiração
    horario_expiracao = horario_atual + datetime.timedelta(minutes=tempo_expiracao_minutos)
    
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
    emoji_direcao = "🟢" if sinal["direcao"] == "ALTA" else "🔴"
    
    mensagem = f"""
📊 SINAL ABERTO - {sinal["ativo"]}

{emoji_direcao} Direção: {sinal["direcao"]}
{sinal["mensagem_expiracao"]}

⚠️ Reentradas:
1️⃣ {sinal["reentrada1"].strftime('%H:%M')}
2️⃣ {sinal["reentrada2"].strftime('%H:%M')}

⚡ Categoria: {sinal["categoria"]}
"""
    return mensagem.strip()

def main():
    """
    Função principal para testar a geração de sinais.
    """
    print("Gerando sinais de teste...\n")
    
    # Horário atual para todos os sinais
    agora = datetime.datetime.now()
    
    # Gerar um sinal para cada categoria
    for ativo, categoria in CATEGORIAS_TESTE.items():
        # Gera sinal com horário atual
        sinal = gerar_sinal(ativo, categoria, agora)
        
        # Formata mensagem do sinal
        mensagem = formatar_mensagem_sinal(sinal)
        
        # Exibe informações
        print(f"=== SINAL PARA ATIVO: {ativo} (Categoria: {categoria}) ===")
        print(mensagem)
        print(f"\nHorário geração: {sinal['horario_atual'].strftime('%H:%M:%S')}")
        print(f"Horário expiração: {sinal['horario_expiracao'].strftime('%H:%M:%S')}")
        if sinal["segundos_adicionais"] is not None:
            print(f"Segundos adicionais: {sinal['segundos_adicionais']}")
        print("="*50)
        print("")

if __name__ == "__main__":
    main() 