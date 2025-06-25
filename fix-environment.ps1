# Fix environment script for Ireland Pay Analytics project
# This script adds necessary development tools to the PATH

# Check common Node.js installation paths
$nodePaths = @(
    "${env:ProgramFiles}\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$HOME\AppData\Roaming\nvm\current",
    "$HOME\scoop\apps\nodejs\current"
)

$nodePathFound = $false
foreach ($path in $nodePaths) {
    if (Test-Path "$path\node.exe") {
        Write-Output "Found Node.js at: $path"
        $env:Path = "$path;$env:Path"
        $nodePathFound = $true
        break
    }
}

if (-not $nodePathFound) {
    Write-Error "Node.js not found in common locations. Please install Node.js or specify its path."
}

# Add user-level npm global packages
if (Test-Path "$HOME\AppData\Roaming\npm") {
    $env:Path = "$HOME\AppData\Roaming\npm;$env:Path"
    Write-Output "Added npm global packages to PATH"
}

# Create a permanent PowerShell profile if it doesn't exist
$profilePath = "$HOME\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
if (-not (Test-Path $profilePath)) {
    New-Item -Path $profilePath -ItemType File -Force
    Write-Output "Created new PowerShell profile at: $profilePath"
}

# Add Node.js and npm to PowerShell profile permanently
$profileContent = @"
# Ireland Pay Analytics Development Environment

# Add Node.js to path (adjust path if needed)
if (Test-Path "$path\node.exe") {
    `$env:Path = "$path;`$env:Path"
}

# Add npm global packages to path
if (Test-Path "$HOME\AppData\Roaming\npm") {
    `$env:Path = "$HOME\AppData\Roaming\npm;`$env:Path"
}
"@

Add-Content -Path $profilePath -Value $profileContent

# Output current Node.js and npm status
Write-Output "`nTesting Node.js and npm availability:"
try {
    & node -v
    Write-Output "Node.js is now accessible"
} catch {
    Write-Error "Node.js still not accessible. You may need to install it."
}

try {
    & npm -v
    Write-Output "npm is now accessible"
} catch {
    Write-Error "npm still not accessible. You may need to install it."
}

Write-Output "`nTo permanently apply these changes, restart your PowerShell session or run: . `$PROFILE"
