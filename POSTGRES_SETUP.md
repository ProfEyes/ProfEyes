# Configuração do PostgreSQL com Supabase

Este documento descreve como configurar e utilizar o PostgreSQL como banco de dados para o ProfEyes através do serviço Supabase.

## O que é o Supabase?

O Supabase é uma alternativa de código aberto ao Firebase, que oferece:
- PostgreSQL Gerenciado
- Autenticação de usuários
- Armazenamento de arquivos
- APIs RESTful automáticas
- Listeners em tempo real
- Funções serverless

## Requisitos

- Conta no [Supabase](https://supabase.com)
- Node.js (versão 16 ou superior)
- NPM ou Yarn

## Passo 1: Criar projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta ou faça login
2. Crie um novo projeto:
   - Dê um nome ao projeto (por exemplo, "profeyes")
   - Defina uma senha para o banco de dados (guarde-a com segurança)
   - Escolha a região mais próxima à sua localização
   - Aguarde a criação do projeto (pode levar alguns minutos)

## Passo 2: Obter credenciais

Após criar o projeto, obtenha as seguintes credenciais:

1. URL do projeto (ex: `https://seuprojetoid.supabase.co`)
2. Chave anônima (Anon Key): Para operações do frontend
3. Chave de serviço (Service Role Key): Para scripts de migração e administração

Essas informações estão disponíveis na seção "Settings" > "API" do seu projeto Supabase.

## Passo 3: Configurar o ambiente local

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Preencha as variáveis de ambiente no arquivo `.env`:
   ```
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   SUPABASE_URL=sua_url_supabase
   SUPABASE_SERVICE_KEY=sua_chave_servico
   ```

## Passo 4: Executar migrações do banco de dados

Há duas maneiras de executar as migrações do banco de dados:

### Opção 1: Usando o script automatizado (preferencial)

Execute o script de configuração do banco de dados:

```bash
npm run setup-postgres
```

Este script irá:
1. Verificar a conexão com o Supabase
2. Executar os arquivos SQL da pasta `supabase/migrations`
3. Configurar tabelas, funções e políticas de segurança

### Opção 2: Executando migrações manualmente no SQL Editor do Supabase

Caso o script automatizado apresente problemas, você pode executar as migrações manualmente:

1. Execute o comando para preparar as migrações combinadas:
   ```bash
   npm run prepare-migrations
   ```
   Isso irá criar um arquivo `combined_migrations.sql` na raiz do projeto.

2. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard) e selecione seu projeto
3. Vá para a seção "SQL Editor" no menu lateral
4. Crie uma nova consulta SQL ("New query")
5. Copie e cole o conteúdo do arquivo `combined_migrations.sql` no editor
6. Clique em "Run" para executar as migrações
7. Verifique se todas as tabelas foram criadas corretamente na seção "Table Editor"

## Passo 5: Verificar as tabelas criadas

Acesse o dashboard do Supabase > "Table Editor" para verificar se as tabelas foram criadas corretamente:

- `auth.users` (gerenciada pelo Supabase)
- `public.user_profiles`
- `public.notification_settings`
- `public.trading_preferences`
- `public.user_management_logs`
- `public.auth_tokens`
- `public.user_sessions`

## Estrutura das tabelas

### auth.users
Gerenciada pelo Supabase, contém informações básicas de autenticação.

### public.user_profiles
```sql
- id: UUID (PK)
- user_id: UUID (FK para auth.users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- display_name: VARCHAR
- avatar_url: TEXT
- language: VARCHAR
- timezone: VARCHAR
- risk_level: ENUM ('conservador', 'moderado', 'agressivo')
- default_currency: VARCHAR
- phone_number: VARCHAR
- address: JSONB
- birthdate: DATE
- verified_email: BOOLEAN
- verified_phone: BOOLEAN
- is_admin: BOOLEAN
- status: ENUM ('active', 'inactive', 'suspended', 'deleted')
```

### public.notification_settings
```sql
- id: UUID (PK)
- user_id: UUID (FK para auth.users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- trading_signals: BOOLEAN
- important_news: BOOLEAN
- price_alerts: BOOLEAN
- volume: INTEGER
- quiet_hours_start: TIME
- quiet_hours_end: TIME
- browser_enabled: BOOLEAN
- email_enabled: BOOLEAN
- mobile_enabled: BOOLEAN
```

### public.trading_preferences
```sql
- id: UUID (PK)
- user_id: UUID (FK para auth.users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- default_order_size: DECIMAL
- default_stop_loss: DECIMAL
- default_take_profit: DECIMAL
- enable_advanced_charts: BOOLEAN
- auto_backup: BOOLEAN
- data_export: BOOLEAN
```

## Uso no código

### Autenticação
```typescript
import { userService } from '@/services/userService';

// Login
const { data, error } = await userService.signInWithEmail('usuario@exemplo.com', 'senha123');

// Cadastro
const { data, error } = await userService.signUp('novo@exemplo.com', 'senha123', '1990-01-01');

// Logout
await userService.signOut();
```

### Perfil de usuário
```typescript
import { userService } from '@/services/userService';

// Obter perfil
const { data: profile } = await userService.getUserProfile();

// Atualizar perfil
const { data, error } = await userService.updateUserProfile({
  display_name: 'Novo Nome',
  risk_level: 'moderado'
});
```

### Configurações
```typescript
import { userService } from '@/services/userService';

// Obter configurações de notificação
const { data: settings } = await userService.getNotificationSettings();

// Atualizar configurações
const { data, error } = await userService.updateNotificationSettings({
  trading_signals: true,
  email_enabled: true
});
```

## Solução de problemas

### Testando a conexão com o Supabase

Para verificar se a conexão com o Supabase está funcionando corretamente, execute o script de teste:

```bash
npm run test-connection
```

Este script irá:
1. Verificar se as variáveis de ambiente estão configuradas corretamente
2. Testar a conexão com o Supabase usando diferentes métodos
3. Listar as tabelas disponíveis no banco de dados (se houver)

Se o script indicar problemas de conexão:
- Verifique se as credenciais no arquivo `.env` estão corretas
- Confirme se o projeto Supabase está ativo
- Certifique-se de que as tabelas foram criadas através das migrações

### Testando a autenticação de usuários

Para testar a funcionalidade de autenticação e criação de usuários, execute:

```bash
npm run test-auth
```

Este script interativo permite:
1. Listar usuários existentes
2. Criar novos usuários com email e senha
3. Verificar se os perfis de usuário são criados automaticamente

Isso é útil para confirmar que:
- As migrações foram aplicadas corretamente
- Os triggers para criação automática de perfil estão funcionando
- As políticas de segurança (RLS) permitem as operações necessárias

### Não consigo me conectar ao banco de dados
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o projeto Supabase está ativo
- Verifique se as políticas de segurança estão permitindo sua conexão

### Erros em migrações
- Verifique os logs de erro para identificar o problema específico
- Confirme se o usuário do Supabase tem permissões suficientes
- Execute as migrações manualmente no SQL Editor do Supabase se necessário

### Dados não aparecem após o cadastro
- Verifique se os triggers para criação automática de perfil estão ativos
- Confirme se as políticas de segurança (RLS) estão configuradas corretamente
- Verifique os logs para identificar erros durante o processo de cadastro

## Recursos e documentação

- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do PostgreSQL](https://www.postgresql.org/docs/)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Resumo e próximos passos

### O que já foi configurado
- ✅ Projeto Supabase criado e configurado
- ✅ Variáveis de ambiente definidas no arquivo `.env`
- ✅ Estrutura inicial das tabelas definida
- ✅ Scripts para migrações do banco de dados
- ✅ Ferramentas para teste de conexão e autenticação

### Próximos passos
1. **Executar migrações no Supabase SQL Editor**
   - Se ainda não executou, utilize o arquivo `combined_migrations.sql`
   - Acesse o SQL Editor no Supabase Dashboard e execute o script

2. **Testar autenticação com o script `test-auth`**
   - Crie um usuário de teste
   - Verifique se o perfil é criado automaticamente

3. **Implementar funcionalidades de usuário no aplicativo**
   - Login/Logout
   - Cadastro de novos usuários
   - Gerenciamento de perfil
   - Gerenciamento de preferências

4. **Adicionar políticas de segurança específicas**
   - Revisar as políticas RLS para suas necessidades
   - Testar o acesso aos dados com diferentes usuários

5. **Implementar backup e monitoramento**
   - Configurar backups regulares do banco de dados
   - Implementar monitoramento de performance 