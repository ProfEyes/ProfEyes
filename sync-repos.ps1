# Script para sincronizar automaticamente os repositórios

try {
    Write-Host "Sincronizando repositórios..." -ForegroundColor Cyan
    
    # Obtém a branch atual ou o hash do commit se estiver em detached HEAD
    $branch = git symbolic-ref --short HEAD 2>$null
    $isDetachedHead = $false
    
    if (-not $branch) {
        # Se estiver em estado "detached HEAD", obtém o hash do commit atual
        $branch = git rev-parse --short HEAD
        $isDetachedHead = $true
        Write-Host "Estado detached HEAD detectado no commit: $branch" -ForegroundColor Yellow
    } else {
        Write-Host "Branch atual: $branch" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Envia para o repositório principal (origin)
    Write-Host "Enviando alterações para o repositório principal (origin)..." -ForegroundColor Green
    
    if ($isDetachedHead) {
        # Se estiver em detached HEAD, usa o hash do commit para forçar o push
        git push origin HEAD:$branch -f
    } else {
        # Push normal para a branch atual
        git push origin $branch
    }
    
    Write-Host ""
    
    # Envia para o repositório de cópia (copia)
    Write-Host "Enviando alterações para o repositório de cópia (copia)..." -ForegroundColor Green
    
    if ($isDetachedHead) {
        # Se estiver em detached HEAD, usa o hash do commit para forçar o push
        git push copia HEAD:$branch -f
    } else {
        # Push normal para a branch atual
        git push copia $branch
    }
    
    Write-Host ""
    
    Write-Host "Sincronização concluída com sucesso!" -ForegroundColor Cyan
} catch {
    Write-Host "Erro ao sincronizar os repositórios: $_" -ForegroundColor Red
    exit 1
}

