# Toast & Confirm Implementation - Batch Script
# Run from: Vlite-Furnitures directory

$files = @(
    'frontend-org\src\pages\Users.jsx',
    'frontend-org\src\pages\Orders.jsx',
    'frontend-org\src\pages\OrderDetails.jsx',
    'frontend-org\src\pages\POCAssignment.jsx',
    'frontend-org\src\pages\MachineDashboard.jsx',
    'frontend-org\src\pages\EmployeeManagementPage.jsx',
    'frontend-org\src\pages\StaffManagementPage.jsx'
)

foreach ($file in $files) {
    $fullPath = "e:\githubbb\Vlite-Furnitures\Vlite-Furnitures\$file"
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        # Read content
        $content = Get-Content $fullPath -Raw
        
        # Check if already has imports
        if ($content -notmatch "import.*toast.*from.*useToast") {
            Write-Host "  Adding imports..." -ForegroundColor Yellow
            # Will be done manually for now
        } else {
            Write-Host "  Already has imports ✓" -ForegroundColor Green
        }
    } else {
        Write-Host "NOT FOUND: $file" -ForegroundColor Red
    }
}

Write-Host "`n✅ Analysis Complete" -ForegroundColor Green
Write-Host "Manual implementation required for each file"
