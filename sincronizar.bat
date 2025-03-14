@echo off
echo.
echo Sincronizando repositórios ProfEyes...
echo.

echo 1. Verificando branch atual...
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%a
echo Branch atual: %BRANCH%
echo.

echo 2. Adicionando todas as alterações...
git add .
echo.

echo 3. Realizando commit das alterações...
set /p MENSAGEM="Digite a mensagem do commit: "
git commit -m "%MENSAGEM%"
echo.

echo 4. Enviando alterações para o repositório principal...
git push origin %BRANCH%
echo.

echo 5. Enviando alterações para o repositório ProfEyes/AppProfyesAtual...
echo (Você precisará fornecer suas credenciais)
git push profeyes %BRANCH%
echo.

echo Sincronização concluída com sucesso!
echo.
pause 