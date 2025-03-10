# Script para sincronizar automaticamente os repositórios

try {
    Write-Host "Sincronizando repositórios..." -ForegroundColor Cyan
    
    # Obtém a branch atual
    $branch = git symbolic-ref --short HEAD
    Write-Host "Branch atual: $branch" -ForegroundColor Yellow
    Write-Host ""
    
    # Envia para o repositório principal (origin)
    Write-Host "Enviando alterações para o repositório principal (origin/$branch)..." -ForegroundColor Green
    git push origin $branch
    Write-Host ""
    
    # Envia para o repositório de cópia (copia)
    Write-Host "Enviando alterações para o repositório de cópia (copia/$branch)..." -ForegroundColor Green  
    git push copia $branch
    Write-Host ""
    
    Write-Host "Sincronização concluída com sucesso!" -ForegroundColor Cyan
} catch {
    Write-Host "Erro ao sincronizar os repositórios: $_" -ForegroundColor Red
    exit 1
}

