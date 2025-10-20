Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Write-Host '[GridironAI] First-time setup'
$dirs=@('backend','frontend')
foreach($d in $dirs){Write-Host '>> ' $d;Push-Location $d;if(Test-Path '.env.example' -PathType Leaf -and -Not (Test-Path '.env' -PathType Leaf)){Copy-Item '.env.example' '.env'};if(-Not (Test-Path 'package-lock.json' -PathType Leaf)){npm install}else{npm ci};Pop-Location}
Write-Host 'Done. Start backend with: (cd backend && npm run migrate && npm run dev)'
Write-Host 'Start frontend with: (cd frontend && npm run dev)'
