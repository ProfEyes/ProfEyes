# Script para sincronizar alterações entre repositórios Git
Write-Host "Verificando alterações pendentes..." -ForegroundColor Cyan

# Verifica se há alterações não confirmadas
$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Não há alterações para confirmar." -ForegroundColor Yellow
    exit 1
}

# Solicita a mensagem de commit
$commitMsg = Read-Host "Digite sua mensagem de commit"
if (-not $commitMsg) {
    Write-Host "Mensagem de commit não pode ser vazia." -ForegroundColor Red
    exit 1
}

# Adiciona todas as alterações
Write-Host "`nAdicionando alterações..." -ForegroundColor Cyan
git add .

# Faz o commit com a mensagem fornecida
Write-Host "`nConfirmando alterações com a mensagem: '$commitMsg'" -ForegroundColor Cyan
git commit -m $commitMsg

# Envia para o repositório pessoal (origin)
Write-Host "`nEnviando alterações para seu repositório pessoal (origin)..." -ForegroundColor Cyan
git push origin Pro

# Envia para o repositório principal (upstream)
Write-Host "`nEnviando alterações para o repositório principal (upstream)..." -ForegroundColor Cyan
git push upstream Pro

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "Alterações enviadas com sucesso para ambos os repositórios:" -ForegroundColor Green
Write-Host "`n1. Seu fork pessoal: https://github.com/IgorElion/ProfEyes" -ForegroundColor White
Write-Host "2. Repositório principal: https://github.com/ProfEyes/ProfEyes" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Green

Write-Host "`nTodas as alterações foram sincronizadas automaticamente!" -ForegroundColor Green

