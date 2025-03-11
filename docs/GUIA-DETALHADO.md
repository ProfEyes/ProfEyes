# Guia Detalhado de Colaboração - ProfEyes

## 1. Acessando o Repositório

1. Você receberá um convite por email para colaborar no repositório
2. Clique no link do email e aceite o convite
3. Agora você terá acesso direto ao repositório

## 2. Instalando as Ferramentas Necessárias

### 2.1. GitHub Desktop
1. Acesse https://desktop.github.com/
2. Baixe a versão para seu sistema operacional
3. Execute o instalador
4. Faça login com sua conta do GitHub
5. Configure seu nome e email para os commits

### 2.2. Cursor Editor
1. Acesse https://cursor.sh/
2. Clique em "Download"
3. Execute o instalador
4. Faça login no Cursor (recomendado para acesso às funcionalidades AI)

## 3. Clonando o Repositório

1. No GitHub Desktop:
   - Clique em "File > Clone repository"
   - Selecione "IgorElion/ProfEyes"
   - Escolha uma pasta local
   - Clique em "Clone"

2. No Cursor:
   - Abra o Cursor
   - Clique em "File > Open Folder"
   - Navegue até a pasta onde clonou o repositório
   - Selecione a pasta e clique em "Abrir"

## 4. Configurando o Ambiente

1. Abra o terminal no Cursor (Ctrl + `)
2. Execute os seguintes comandos:
   ```bash
   # Instalar dependências
   npm install
   ```

## 5. Fluxo de Trabalho Diário

### 5.1. Antes de Começar
1. Atualize seu repositório:
   ```bash
   # Mude para o branch principal
   git checkout Pro

   # Atualize com as últimas alterações
   git pull origin Pro
   ```

2. Crie um novo branch para sua feature:
   ```bash
   git checkout -b feature/seu-nome/descricao
   ```
   Exemplo: `feature/joao/correcao-login`

### 5.2. Durante o Desenvolvimento
1. Salve suas alterações frequentemente (Ctrl + S)

2. Faça commits pequenos e frequentes:
   - No GitHub Desktop:
     - Selecione os arquivos alterados
     - Escreva um título descritivo
     - Adicione uma descrição se necessário
     - Clique em "Commit"

   - Ou no terminal:
     ```bash
     git add .
     git commit -m "tipo: descrição da alteração"
     ```
     Tipos de commit:
     - feat: nova funcionalidade
     - fix: correção de bug
     - style: alterações visuais
     - docs: documentação
     - refactor: refatoração de código

3. Envie suas alterações:
   ```bash
   git push origin feature/seu-nome/descricao
   ```

### 5.3. Criando um Pull Request
1. Vá para https://github.com/IgorElion/ProfEyes
2. Clique em "Pull requests"
3. Clique em "New pull request"
4. Selecione:
   - base repository: IgorElion/ProfEyes
   - base: Pro
   - head repository: seu-usuario/ProfEyes
   - compare: seu-branch
5. Clique em "Create pull request"
6. Preencha:
   - Título descritivo
   - Descrição detalhada das alterações
   - Adicione quaisquer informações relevantes
7. Clique em "Create pull request"

## 6. Mantendo-se Atualizado

### 6.1. Configurando Notificações
1. No GitHub:
   - Vá para o repositório
   - Clique em "Watch"
   - Selecione "All Activity"

2. No Discord:
   - Entre no servidor do projeto
   - Ative notificações para o canal #github-updates

### 6.2. Atualizando seu Fork
```bash
# Atualize o upstream
git fetch upstream

# Mude para o branch principal
git checkout Pro

# Mescle as alterações
git merge upstream/Pro

# Atualize seu fork
git push origin Pro
```

## 7. Resolvendo Conflitos

1. Se houver conflitos:
   ```bash
   # Atualize seu branch
   git checkout Pro
   git pull upstream Pro
   
   # Volte para seu branch
   git checkout seu-branch
   git merge Pro
   ```

2. No Cursor:
   - Os conflitos serão destacados
   - Clique em "Accept Current" ou "Accept Incoming"
   - Ou edite manualmente o código
   - Salve os arquivos

3. Complete a mesclagem:
   ```bash
   git add .
   git commit -m "fix: resolução de conflitos"
   git push origin seu-branch
   ```

## 8. Boas Práticas

1. **Sempre** crie um novo branch para cada feature/correção
2. Mantenha seus commits pequenos e focados
3. Escreva mensagens de commit claras e descritivas
4. Teste suas alterações antes de enviar
5. Mantenha seu fork atualizado
6. Comunique-se com a equipe pelo Discord
7. Documente alterações importantes
8. Revise os Pull Requests dos colegas

## 9. Suporte

- Use o canal #duvidas no Discord
- Marque o líder do projeto (@igor) para questões urgentes
- Consulte a documentação do projeto
- Use o GitHub Discussions para discussões técnicas

## 10. Links Úteis

- [Repositório Principal](https://github.com/IgorElion/ProfEyes)
- [Documentação do Projeto](link-para-documentacao)
- [Discord do Projeto](link-para-discord)
- [Guia do GitHub](https://docs.github.com/pt)
- [Documentação do Cursor](https://cursor.sh/docs) 