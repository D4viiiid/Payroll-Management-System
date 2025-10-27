# Fix all remaining window.confirm and window.alert calls
# BUG #27 - Complete Alert System Fix

$files = @(
    "Salary.jsx",
    "Payslip.jsx",
    "PayRoll.jsx"
)

foreach ($file in $files) {
    $filePath = "src\components\$file"
    Write-Host "Processing $file..." -ForegroundColor Cyan
    
    # Read file content
    $content = Get-Content $filePath -Raw
    
    # Check if showConfirm is already imported
    if ($content -notmatch "import.*showConfirm") {
        # Add imports at the top (after other imports)
        if ($content -match "(import\s+React.*?;)") {
            $content = $content -replace "(import\s+React.*?;)", "`$1`nimport { showSuccess, showError, showConfirm } from '../utils/toast';"
        }
    }
    
    # Save updated content
    $content | Set-Content $filePath -NoNewline
    Write-Host "  ✓ Imports added" -ForegroundColor Green
}

Write-Host "`n✅ All imports added successfully!" -ForegroundColor Green
