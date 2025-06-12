# PowerShell script to rename design reference images to descriptive page names

# Define explicit mapping for key images
$mapping = @{
    'Fey web Apr 2025 0.png'   = 'dashboard.png'
    'Fey web Apr 2025 1.png'   = 'data-upload-empty.png'
    'Fey web Apr 2025 2.png'   = 'data-upload-file-selected.png'
    'Fey web Apr 2025 3.png'   = 'data-upload-uploading.png'
    'Fey web Apr 2025 4.png'   = 'data-upload-processing.png'
    'Fey web Apr 2025 5.png'   = 'data-upload-success.png'
    'Fey web Apr 2025 6.png'   = 'data-upload-error.png'
    'Fey web Apr 2025 7.png'   = 'merchants-list.png'
    'Fey web Apr 2025 8.png'   = 'merchant-detail.png'
    'Fey web Apr 2025 9.png'   = 'analytics-dashboard.png'
    'Fey web Apr 2025 10.png'  = 'residuals-list.png'
}

# Iterate over PNG files in this directory
Get-ChildItem -File -Filter 'Fey web Apr 2025 *.png' | ForEach-Object {
    $oldName = $_.Name
    if ($mapping.ContainsKey($oldName)) {
        $newName = $mapping[$oldName]
    } else {
        # Fallback: use numeric index as page-X
        if ($oldName -match '(\d+)\.png$') {
            $index = $Matches[1]
            $newName = "page-$index.png"
        } else {
            $newName = $oldName
        }
    }
    Rename-Item -Path $_.FullName -NewName $newName -ErrorAction SilentlyContinue
    Write-Output "Renamed '$oldName' -> '$newName'"
}
