-- Script para verificar usuários no banco de dados
-- Execute no Supabase SQL Editor

-- 1. Ver total de usuários
SELECT COUNT(*) as total_usuarios FROM user_profiles;

-- 2. Ver primeiros 10 usuários com email e nome
SELECT 
  user_id,
  email,
  full_name,
  created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Buscar usuários com "test" no email ou nome
SELECT 
  user_id,
  email,
  full_name
FROM user_profiles 
WHERE email ILIKE '%test%' 
   OR full_name ILIKE '%test%'
LIMIT 5;

-- 4. Buscar usuários com "@" no email (todos)
SELECT 
  user_id,
  email,
  full_name
FROM user_profiles 
WHERE email ILIKE '%@%'
LIMIT 5;

-- 5. Ver estrutura da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;
