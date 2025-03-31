"""
Pacote para dados e configurações do sistema
"""

from .assets import ATIVOS_CATEGORIAS, HORARIOS_PADRAO, assets, inicializar_horarios_ativos
from .signals import (
    gerar_sinal, 
    gerar_sinais_periodicos, 
    formatar_mensagem_sinal,
    obter_tempo_expiracao,
    formatar_mensagem_expiracao,
    calcular_horarios_reentrada
)

# Inicializar os horários dos ativos automaticamente quando o pacote for importado
inicializar_horarios_ativos() 