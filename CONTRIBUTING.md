# Guia de Contribuição - ProfEyes

## Configuração Inicial

1. Faça um fork do repositório principal
2. Instale o GitHub Desktop em https://desktop.github.com/
3. Clone seu fork usando o GitHub Desktop
4. Instale o Cursor Editor em https://cursor.sh/

## Fluxo de Trabalho

1. **Antes de começar a trabalhar:**
   ```bash
   git checkout Pro        # Muda para o branch principal
   git pull origin Pro    # Atualiza seu branch local
   git checkout -b feature/seu-nome/descricao  # Cria um novo branch para sua feature
   ```

2. **Durante o desenvolvimento:**
   - Faça commits frequentes com mensagens descritivas
   - Use prefixos nos commits:
     - `feat:` para novas funcionalidades
     - `fix:` para correções
     - `style:` para alterações visuais
     - `docs:` para documentação
     - `refactor:` para refatorações

3. **Para enviar suas alterações:**
   ```bash
   git push origin feature/seu-nome/descricao
   ```
   - Crie um Pull Request no GitHub
   - Aguarde a revisão da equipe

## Boas Práticas

1. **Commits Frequentes:**
   - Faça commits pequenos e frequentes
   - Use mensagens claras e descritivas
   - Sempre teste antes de commitar

2. **Comunicação:**
   - Use o Discord para discussões em tempo real
   - Comente no código quando necessário
   - Documente decisões importantes

3. **Resolução de Conflitos:**
   - Sempre atualize seu branch antes de começar a trabalhar
   - Em caso de conflitos, comunique a equipe
   - Use o GitHub Desktop para resolver conflitos visuais

## Notificações

- As alterações serão notificadas automaticamente no Discord
- Mantenha as notificações do GitHub ativadas
- Responda aos comentários nos Pull Requests

## Dúvidas?

Entre em contato com o líder do projeto ou use o canal #duvidas no Discord. 