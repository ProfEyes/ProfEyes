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

# Sistema de Gerenciamento de Usuários

O aplicativo inclui um sistema completo de gerenciamento de usuários com controle administrativo. Através do painel de administração, os administradores podem:

- Visualizar todos os usuários cadastrados no sistema
- Adicionar novos usuários manualmente
- Excluir contas de usuário
- Redefinir senhas
- Verificar logs de atividades administrativas

## Configuração

Para configurar o sistema de gerenciamento de usuários:

1. Execute a migração do Supabase incluída no projeto:
```bash
npx supabase migration up
```

2. O primeiro usuário registrado no sistema receberá automaticamente permissões de administrador.

3. Para acessar o painel de administração, navegue para `/admin` após fazer login como um usuário administrador.

## Segurança

O sistema foi projetado com segurança em mente:

- Todas as operações administrativas são registradas em logs
- Políticas de segurança no nível de linha (RLS) restringem o acesso a dados sensíveis
- Operações administrativas sensíveis exigem confirmação
- Senhas armazenadas com hash seguro através do Supabase Auth

## Integração com Supabase

O sistema utiliza a API de autenticação e banco de dados do Supabase:

- Tabela `user_profiles` estendida com campo `is_admin`
- Nova tabela `user_management_logs` para rastreamento de atividades
- Políticas RLS configuradas para controle de acesso
- Triggers para atribuição automática de permissões de administrador

## Melhorias no Sistema de Suporte

O sistema de suporte do ProfEyes foi aprimorado com as seguintes funcionalidades:

### Análise Contextual em Tempo Real
- Sistema inteligente que analisa as mensagens do usuário em tempo real
- Identificação automática de intenções e entidades nas perguntas
- Adaptação da complexidade das respostas com base no nível do usuário (iniciante, intermediário, avançado)
- Personalização das respostas com base no histórico de conversas e tópicos de interesse

### Respostas Personalizadas
- Geração de respostas dinâmicas e contextuais, nunca pré-prontas
- Análise de sentimento para adaptar o tom da resposta (positivo, negativo, neutro)
- Adaptação da resposta com base na complexidade da pergunta
- Filtragem inteligente de informações relevantes baseada em sub-tópicos identificados

### Experiência do Usuário Aprimorada
- Indicador visual de digitação em tempo real
- Interface de chat responsiva e animações suaves
- Rolagem automática para novas mensagens
- Adaptação das respostas ao idioma do usuário (Português, Inglês, Espanhol)

### Sistema de Aprendizado Contínuo
- Armazenamento do histórico de perguntas e respostas para aprendizado
- Busca por conhecimento prévio para perguntas similares
- Adaptação sutil de respostas anteriores para parecerem novas quando relevantes
- Contextualização baseada nos tópicos de interesse do usuário

Estas melhorias tornam o suporte mais eficiente, personalizado e capaz de responder com precisão às necessidades dos usuários em tempo real.

# Sistema de Transmissões Ao Vivo

O ProfEyes agora conta com um sistema completo de transmissões ao vivo que permite que especialistas compartilhem análises, instruções e insights em tempo real com a comunidade.

## Funcionalidades Principais

- **Transmissões em Tempo Real**: Especialistas autorizados podem iniciar transmissões ao vivo diretamente do aplicativo
- **Comentários em Tempo Real**: Usuários podem interagir com o apresentador através de comentários durante a transmissão
- **Sistema de Likes**: Os usuários podem curtir comentários (limitado a um like por usuário por comentário)
- **Interface Moderna**: Design responsivo para uma experiência de visualização de alta qualidade

## Como Configurar o Sistema de Transmissões

1. **Executar a Migração do Banco de Dados**:
   ```bash
   npx supabase migration up
   ```

2. **Conceder Permissões para Transmitir**:
   Para conceder permissão de transmissão a um usuário específico, use o seguinte comando SQL no Supabase:

   ```sql
   INSERT INTO public.stream_permissions (user_id, can_create, can_moderate)
   VALUES ('ID_DO_USUÁRIO', true, false);
   ```

   Substitua `ID_DO_USUÁRIO` pelo ID do usuário no Supabase Auth.

## Como Usar

1. **Assistir Transmissões**:
   - Acesse a aba "Ao Vivo" na navegação principal
   - Selecione uma transmissão ativa na lista lateral
   - Interaja através de comentários em tempo real
   - Curta comentários que você achar relevantes

2. **Iniciar uma Transmissão** (requer permissão):
   - Clique no botão "Iniciar Transmissão" no topo da página
   - Preencha o título, descrição e tags para sua transmissão
   - Clique em "Iniciar Transmissão" para começar imediatamente

## Tecnologias Utilizadas

- **Supabase**: Armazenamento de dados e sistema de autenticação
- **Transmissão em Tempo Real**: Websockets para comentários e notificações
- **Video Streaming**: Sistema integrado de streaming de vídeo

## Solução de Problemas

- **Permissão Negada ao Iniciar Transmissão**: Verifique se o usuário tem a permissão `can_create` na tabela `stream_permissions`
- **Comentários Não Aparecem**: Certifique-se de que as políticas RLS estão configuradas corretamente
- **Problemas de Conexão**: Verifique a conexão com a internet e se o Supabase está acessível

Para mais informações sobre configurações avançadas, consulte a documentação do Supabase.

## Transmissões ao Vivo (Live Streaming)

O sistema agora suporta transmissões ao vivo reais utilizando PeerJS, uma biblioteca que facilita a comunicação WebRTC (Web Real-Time Communication) peer-to-peer diretamente no navegador sem necessidade de servidores dedicados.

### Recursos implementados:

1. **Transmissão ao vivo em tempo real** - Os usuários podem iniciar transmissões usando sua câmera e microfone diretamente pelo navegador.
2. **Visualização em tempo real** - Os espectadores podem assistir às transmissões com baixa latência.
3. **Chat ao vivo** - Comentários e interações em tempo real durante as transmissões.
4. **Controle de permissões** - Apenas usuários autorizados podem iniciar transmissões.
5. **Comunicação peer-to-peer** - As transmissões são estabelecidas diretamente entre o transmissor e os espectadores.

### Componentes do sistema:

- **PeerPublisher** - Gerencia transmissões de vídeo e áudio usando PeerJS.
- **PeerViewer** - Permite visualização das transmissões pelos espectadores.
- **LiveStreamContext** - Contexto React que gerencia estado e interações com o banco de dados.

### Tecnologias utilizadas:

- **PeerJS** - Simplifica a comunicação WebRTC peer-to-peer
- **WebRTC** - Tecnologia para transmissão em tempo real
- **Supabase** - Banco de dados para armazenamento de metadados
- **React** - Interface de usuário

### Como utilizar:

1. Para iniciar uma transmissão, acesse a página "Transmissões" e clique em "Iniciar Transmissão".
2. Preencha os detalhes e permita acesso à câmera e microfone.
3. Sua transmissão estará disponível para todos os usuários da plataforma.

### Configuração do PeerJS:

O sistema está configurado para usar o servidor público do PeerJS (`0.peerjs.com`) para sinalização. As configurações podem ser encontradas em:

```javascript
// src/services/webrtc/peerService.ts
export const DEFAULT_PEER_CONFIG: PeerConfig = {
  host: '0.peerjs.com',
  secure: true,
  port: 443,
  path: '/',
  debug: 1,
  // ...
};
```

Para produção, considere hospedar seu próprio servidor PeerJS para maior controle e desempenho.
