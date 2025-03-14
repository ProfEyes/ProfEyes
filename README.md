# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0a0bc9d4-cf4f-4d6c-a56d-4147de8434b4

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0a0bc9d4-cf4f-4d6c-a56d-4147de8434b4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0a0bc9d4-cf4f-4d6c-a56d-4147de8434b4) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

# ProfEyes

Aplicativo para traders e investidores do mercado financeiro.

## Sistema de Sincronização Automática

Este projeto está configurado com um sistema de sincronização automática que mantém dois repositórios GitHub atualizados:

1. **Repositório Principal**: `origin` (https://github.com/IgorElion/IgorelionProfEyes.git)
2. **Repositório Cópia**: `copia` (https://github.com/IgorElion/ProfEyes-C-pia.git)

### Funcionalidades do Sistema de Sincronização

O sistema sincroniza automaticamente os repositórios nas seguintes situações:

- **Após um commit**: Quando você faz um commit, o hook `post-commit` é acionado.
- **Após um checkout**: Quando você muda de branch ou volta para uma versão anterior (checkout), o hook `post-checkout` é acionado.
- **Após um merge**: Quando você realiza um merge, o hook `post-merge` é acionado.
- **Após um rebase ou amend**: Quando você faz um rebase ou amend, o hook `post-rewrite` é acionado.

### Sincronização Manual

Se por algum motivo a sincronização automática falhar, você pode sincronizar manualmente os repositórios usando:

1. O atalho "Sincronizar Repositórios" na área de trabalho.
2. Executando o arquivo `sincronizar.bat` na raiz do projeto.

### Detalhes Técnicos

- O sistema usa hooks Git para detectar eventos e acionar a sincronização.
- Os scripts PowerShell são usados para realizar a sincronização.
- O sistema suporta estados "detached HEAD" (quando você volta para versões anteriores).

## Desenvolvimento

Para contribuir com o projeto, siga as práticas padrão de desenvolvimento:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Envie para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

## Sincronização com o Repositório Oficial

Este repositório está configurado para trabalhar com o repositório oficial do ProfEyes em <https://github.com/ProfEyes/AppProfyesAtual.git>.

> **Nota:** O repositório oficial do ProfEyes está configurado como público, permitindo contribuições via Pull Requests.

## Sistema de Sincronização

Este projeto está configurado com um sistema de sincronização que:

1. **Sincroniza Automaticamente** com seu repositório pessoal (`origin`) após cada commit
2. **Prepara Pull Requests** para contribuição ao repositório oficial ProfEyes

### Como Contribuir para o Repositório Oficial

Para enviar suas alterações para o repositório oficial do ProfEyes:

1. **Fork o repositório oficial**: Acesse <https://github.com/ProfEyes/AppProfyesAtual> e clique em "Fork"
2. **Configure seu fork como um remote**: `git remote add meu-fork [URL-DO-SEU-FORK]`
3. **Envie suas alterações para seu fork**: `git push meu-fork sua-branch`
4. **Crie um Pull Request**: Acesse seu fork no GitHub e clique em "Contribute" e "Open Pull Request"

### Sincronização Manual

O script `sincronizar.bat` facilita o processo de commit e push para o seu repositório:

1. Execute `sincronizar.bat` na raiz do projeto
2. Digite sua mensagem de commit quando solicitado
3. O script fará push para seu repositório e mostrará instruções para criar um Pull Request

### Atualização da Sincronização

A partir de agora, os scripts `sincronizar.bat` e `sync-repos.ps1` foram atualizados para:

1. **Verificar alterações pendentes** antes de iniciar o processo
2. **Solicitar uma mensagem de commit** personalizada
3. **Enviar automaticamente para ambos os repositórios**:
   - Seu fork pessoal (https://github.com/IgorElion/ProfEyes)
   - Repositório principal da organização (https://github.com/ProfEyes/ProfEyes)

Isto garante que todas as mudanças sejam sincronizadas simultaneamente em ambos os repositórios.

### Detalhes Técnicos

* O script usa hooks Git para automatizar o push para o seu repositório pessoal
* O sistema foi projetado para trabalhar com o fluxo padrão de contribuição via Pull Requests
* Recomendamos criar uma branch separada para cada feature antes de submeter Pull Requests

## Desenvolvimento

Para contribuir com o projeto, siga as práticas padrão de desenvolvimento:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Envie para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request
