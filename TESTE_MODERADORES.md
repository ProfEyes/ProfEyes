# 🧪 Como Testar o Autocompletar de Moderadores

## ✅ Mudanças Aplicadas

1. ✅ **Bandeiras removidas** - Agora só mostra o nome do idioma (Português, English, Español)
2. ✅ **Layout revertido** - Bloqueados e Estatísticas voltaram para a posição original (vertical)

---

## 📍 Onde Encontrar

1. **Faça login** como streamer
2. **Inicie uma transmissão** ou vá para "Minha Transmissão"
3. Clique em **"Configurações"** (ícone de engrenagem)
4. Role até a seção **"MODERADORES"**
5. Procure o campo **"Adicionar Moderador"**

---

## 🔍 Como Funciona o Autocompletar

### Requisitos:
- Digite **pelo menos 2 caracteres**
- Aguarde **300ms** (debounce)
- O sistema busca por:
  - **Email** (parcial)
  - **Nome completo** (`full_name` na tabela `user_profiles`)

### Exemplos de busca:

```javascript
// O sistema busca em user_profiles onde:
// - email LIKE '%busca%'
// - OU full_name LIKE '%busca%'
// Limite: 5 resultados
```

---

## 📝 Exemplos Práticos para Testar

### **1. Buscar por parte do email:**

```
Digite: "test"
Pode encontrar:
- test@example.com
- testing@gmail.com
- user.test@domain.com
```

### **2. Buscar por nome:**

```
Digite: "joão"
Pode encontrar:
- João Silva (joao.silva@email.com)
- João Pedro (jp@teste.com)
```

### **3. Buscar por domínio:**

```
Digite: "gmail"
Pode encontrar:
- user@gmail.com
- contato@gmail.com
- teste@gmail.com
```

### **4. Buscar por @ (mostra todos com @):**

```
Digite: "@"
Mostra até 5 usuários com @ no email
```

---

## 🎯 Descobrir Usuários Reais do Seu Banco

### Opção 1: **Buscar pelo seu próprio email**
Se você está logado, seu email está cadastrado! Digite parte do seu email.

**Exemplo:**
- Se seu email é `igore@example.com`
- Digite: `igore` ou `@example`

### Opção 2: **Verificar no Supabase Dashboard**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: **arkrjextwpwqhrvcijyr**
3. Vá em **Table Editor** → **user_profiles**
4. Veja os emails e nomes cadastrados
5. Digite parte de qualquer email ou nome no autocompletar

### Opção 3: **Criar um usuário de teste**

Se não houver usuários, crie uma nova conta:
1. Faça logout
2. Crie uma conta com email `test@teste.com`
3. Faça login com sua conta principal (streamer)
4. Digite `test` no campo de moderadores

---

## ✨ Comportamento Esperado

### **Enquanto digita:**
```
┌───────────────────────────────┐
│ 📧 test...                    │ ← Spinner aparece
│    🔄 Buscando...             │
└───────────────────────────────┘
```

### **Após buscar (se encontrar resultados):**
```
┌───────────────────────────────────┐
│ 📧 test                           │
└───────────────────────────────────┘
┌───────────────────────────────────┐ ← Dropdown
│ 👤 Test User                      │
│    test@example.com               │
├───────────────────────────────────┤
│ 👤 Testing Account                │
│    testing@gmail.com              │
└───────────────────────────────────┘
```

### **Navegação:**
- **↓ / ↑** = Navegar entre sugestões
- **Enter** = Selecionar sugestão destacada
- **Esc** = Fechar dropdown
- **Click** = Selecionar diretamente
- **Click fora** = Fechar dropdown

### **Após selecionar:**
```
┌───────────────────────────────────┐
│ 📧 test@example.com ✓             │ ← Email preenchido
└───────────────────────────────────┘
[Adicionar] ← Clique para confirmar
```

---

## 🚨 Se Não Aparecer Nenhum Resultado

Isso significa:

### ❌ **Não há usuários com esse termo no banco**

**Soluções:**

1. **Tente buscar pelo SEU email** (você está logado, então existe!)
   ```
   Digite parte do email que você usou para fazer login
   ```

2. **Verifique no Supabase:**
   - Acesse o Table Editor
   - Tabela: `user_profiles`
   - Veja quais emails existem
   - Digite um deles

3. **Crie um usuário de teste:**
   - Logout → Criar conta → Login novamente

4. **Teste com caracteres genéricos:**
   - Digite: `@` (mostra emails com @)
   - Digite: `.com` (mostra emails .com)

---

## 🔧 Comandos SQL para Verificar (Opcional)

Se quiser ver os usuários no banco, execute no Supabase SQL Editor:

```sql
-- Ver todos os usuários cadastrados
SELECT id, email, full_name, avatar_url 
FROM user_profiles 
LIMIT 10;

-- Buscar usuários com "test" no email ou nome
SELECT id, email, full_name 
FROM user_profiles 
WHERE email ILIKE '%test%' 
   OR full_name ILIKE '%test%';
```

---

## ✅ Status Final

- ✅ Bandeiras removidas (só nome do idioma)
- ✅ Layout revertido (Bloqueados e Estatísticas na vertical)
- ✅ Autocompletar implementado e funcional
- ✅ Busca por email e nome com debounce de 300ms
- ✅ Navegação por teclado (↑ ↓ Enter Esc)
- ✅ Limite de 5 sugestões
- ✅ Avatar, nome e email exibidos

**Agora faça um refresh no navegador (Ctrl+R) e teste!** 🎉
