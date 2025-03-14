@echo off
setlocal enabledelayedexpansion

REM Verifica se há alterações não confirmadas
git status --porcelain > temp.txt
set /p CHANGES=<temp.txt
del temp.txt

if "!CHANGES!" == "" (
    echo Nao ha alteracoes para confirmar.
    exit /b 1
)

REM Solicita a mensagem de commit
set /p COMMIT_MSG="Digite sua mensagem de commit: "

REM Adiciona todas as alteracoes
echo Adicionando alteracoes...
git add .

REM Faz o commit com a mensagem fornecida
echo Confirmando alteracoes com a mensagem: "!COMMIT_MSG!"
git commit -m "!COMMIT_MSG!"

REM Envia para o repositório pessoal (origin)
echo Enviando alteracoes para seu repositorio pessoal (origin)...
git push origin Pro

REM Envia para o repositório principal (upstream)
echo Enviando alteracoes para o repositorio principal (upstream)...
git push upstream Pro

echo.
echo ======================================================
echo Alteracoes enviadas com sucesso para ambos os repositorios:
echo.
echo 1. Seu fork pessoal: https://github.com/IgorElion/ProfEyes
echo 2. Repositorio principal: https://github.com/ProfEyes/ProfEyes
echo ======================================================
echo.
echo Todas as alteracoes foram sincronizadas automaticamente!

endlocal 