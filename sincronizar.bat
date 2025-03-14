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

echo 5. Instruções para sincronizar com o repositório oficial ProfEyes:
echo.
echo    a. Acesse https://github.com/ProfEyes/AppProfyesAtual
echo    b. Clique em "Fork" (caso ainda não tenha um fork)
echo    c. Compare e crie um Pull Request a partir do seu repositório
echo    d. Aguarde a aprovação do Pull Request pela equipe do ProfEyes
echo.

echo Sincronização com origin concluída com sucesso!
echo.
pause 