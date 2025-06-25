# Ireland Pay Analytics Development Environment Setup
# This script sets up all necessary tools and configurations

Write-Output "====== Ireland Pay Analytics Development Setup ======"

# Function to check if a command exists
function Test-Command {
    param($Command)
    try { 
        Get-Command $Command -ErrorAction Stop 
        return $true 
    } catch { 
        return $false 
    }
}

# Install Chocolatey if not already installed
if (-not (Test-Command -Command choco)) {
    Write-Output "Installing Chocolatey package manager..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Output "Chocolatey installed successfully."
    } catch {
        Write-Error "Failed to install Chocolatey. You may need administrative privileges."
        Write-Output "Please run this script as administrator or install Chocolatey manually: https://chocolatey.org/install"
    }
} else {
    Write-Output "Chocolatey is already installed."
}

# Install Node.js LTS if not already installed
if (-not (Test-Command -Command node)) {
    Write-Output "Installing Node.js LTS..."
    try {
        choco install nodejs-lts -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Output "Node.js installed successfully."
    } catch {
        Write-Error "Failed to install Node.js."
        Write-Output "Please install Node.js manually from: https://nodejs.org/"
    }
} else {
    $nodeVersion = & node -v
    Write-Output "Node.js $nodeVersion is already installed."
}

# Install Supabase CLI if not already installed
if (-not (Test-Command -Command supabase)) {
    Write-Output "Installing Supabase CLI..."
    try {
        choco install supabase -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Output "Supabase CLI installed successfully."
    } catch {
        Write-Error "Failed to install Supabase CLI."
        Write-Output "Please install Supabase CLI manually: https://supabase.com/docs/guides/cli"
    }
} else {
    $supabaseVersion = & supabase --version
    Write-Output "Supabase CLI $supabaseVersion is already installed."
}

# Install Vercel CLI if not already installed
if (-not (Test-Command -Command vercel)) {
    Write-Output "Installing Vercel CLI..."
    try {
        npm install -g vercel
        Write-Output "Vercel CLI installed successfully."
    } catch {
        Write-Error "Failed to install Vercel CLI."
        Write-Output "Please install Vercel CLI manually: npm install -g vercel"
    }
} else {
    Write-Output "Vercel CLI is already installed."
}

# Install project dependencies
Write-Output "Installing project dependencies..."
try {
    npm install
    Write-Output "Project dependencies installed successfully."
} catch {
    Write-Error "Failed to install project dependencies."
}

# Create a permanent PowerShell profile for development
$profilePath = "$HOME\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
$profileContent = @"
# Ireland Pay Analytics Development Environment

# Node.js and npm aliases
function Start-DevServer { npm run dev }
function Run-Build { npm run build }
function Run-Lint { npm run lint }
function Run-Tests { npm run test }

# Supabase shortcuts
function Push-SupabaseMigration { supabase db push }
function Start-Supabase { supabase start }
function Stop-Supabase { supabase stop }

# Create shorter aliases
Set-Alias -Name dev -Value Start-DevServer
Set-Alias -Name build -Value Run-Build
Set-Alias -Name lint -Value Run-Lint
Set-Alias -Name test -Value Run-Tests
Set-Alias -Name spush -Value Push-SupabaseMigration
Set-Alias -Name sstart -Value Start-Supabase
Set-Alias -Name sstop -Value Stop-Supabase

Write-Output "Ireland Pay Analytics development environment loaded."
"@

if (-not (Test-Path $profilePath)) {
    New-Item -Path $profilePath -ItemType File -Force | Out-Null
}

Add-Content -Path $profilePath -Value $profileContent -Force
Write-Output "PowerShell profile configured with useful aliases and functions."

# Apply the security fixes to Supabase (if Supabase is running)
Write-Output "Attempting to apply Supabase security fixes..."
try {
    $dbConnected = supabase db ping 2>$null
    if ($LASTEXITCODE -eq 0) {
        Get-Content ".\supabase\migrations\20250625_fix_security_issues.sql" | supabase db execute
        Write-Output "Security fixes applied successfully."
    } else {
        Write-Output "Supabase is not running. Please start it with 'supabase start' before applying security fixes."
    }
} catch {
    Write-Output "Could not connect to Supabase. You may need to start it or link your project first."
}

# Verify Supabase connection
Write-Output "`nVerifying Supabase configuration..."
$supabaseConfig = Get-Content ".\supabase\config.toml" -ErrorAction SilentlyContinue
if ($supabaseConfig) {
    Write-Output "Supabase configuration found with project ID."
} else {
    Write-Output "Supabase configuration not found or empty. You may need to run 'supabase link --project-ref ainmbbtycciukbjjdjtl'"
}

# Verify Vercel integration
Write-Output "`nVerifying Vercel integration..."
if (Test-Path ".\.vercel") {
    Write-Output "Vercel configuration found. Project is linked to Vercel."
} else {
    Write-Output "Vercel configuration not found. You may need to run 'vercel link' to connect to your Vercel project."
}

# Display final status
Write-Output "`n====== Setup Complete ======"
Write-Output "To start working on Ireland Pay Analytics:"
Write-Output "1. Start a new PowerShell session or run: . `$PROFILE"
Write-Output "2. Start development server: dev (or npm run dev)"
Write-Output "3. Connect to Supabase: supabase link --project-ref ainmbbtycciukbjjdjtl"
Write-Output "4. Apply security fixes: Get-Content '.\supabase\migrations\20250625_fix_security_issues.sql' | supabase db execute"
Write-Output "`nEnjoy developing Ireland Pay Analytics Pulse!"
