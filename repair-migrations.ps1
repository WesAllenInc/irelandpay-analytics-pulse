# Repair migration history for Supabase
$migrations = @(
    "20250604080135",
    "20250604080144", 
    "20250604080211",
    "20250604080313",
    "20250604080323",
    "20250604080334",
    "20250604080342",
    "20250604080413",
    "20250604080422",
    "20250604080528",
    "20250617040703",
    "20250701024254"
)

foreach ($migration in $migrations) {
    Write-Host "Repairing migration: $migration"
    npx supabase migration repair --status reverted $migration
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to repair migration: $migration"
    }
}

Write-Host "Migration repair complete!" 