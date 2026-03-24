param(
    [string]$ItemsFullPath = ".\items-full.json",
    [string]$AllowedPath = ".\allowed4ib_all.json",
    [string]$CompatibilityFullPath = ".\compatibility-full.txt",
    [string]$ItemsOutPath = ".\items.json",
    [string]$CompatibilityOutPath = ".\compatibility.json"
)

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }

    return (Get-Content $Path -Raw -Encoding UTF8) | ConvertFrom-Json
}

function Write-JsonFile {
    param(
        [Parameter(Mandatory)]$Value,
        [Parameter(Mandatory)][string]$Path
    )

    $json = $Value | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function Split-CompatList {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return @() }

    return $Value.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries) |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ } |
        Select-Object -Unique
}

$itemsFull = Read-JsonFile -Path $ItemsFullPath
$allowed = Read-JsonFile -Path $AllowedPath

$allowedSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($item in $allowed) {
    $value = "$item".Trim()
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        [void]$allowedSet.Add($value)
    }
}

$itemsFiltered = @(
    $itemsFull |
    Where-Object {
        $className = "$($_.className)".Trim()
        -not [string]::IsNullOrWhiteSpace($className) -and $allowedSet.Contains($className)
    } |
    Sort-Object displayName, className
)

$itemMap = @{}
foreach ($item in $itemsFiltered) {
    $itemMap["$($item.className)".Trim()] = $item
}

Write-JsonFile -Value $itemsFiltered -Path $ItemsOutPath

if (Test-Path $CompatibilityFullPath) {
    $rows = Import-Csv -Path $CompatibilityFullPath -Delimiter "`t"
    $compat = [ordered]@{}

    foreach ($row in $rows) {
        $weapon = "$($row.weapon)".Trim()
        if ([string]::IsNullOrWhiteSpace($weapon)) { continue }
        if (-not $allowedSet.Contains($weapon)) { continue }

        $compat[$weapon] = [pscustomobject][ordered]@{
            displayName            = "$($row.displayName)".Trim()
            type                   = [int]("$($row.type)" -as [int])
            muzzles                = @(Split-CompatList $row.muzzles)
            muzzleAttachments      = @(Split-CompatList $row.muzzleAttachments | Where-Object { $allowedSet.Contains($_) -and $itemMap.ContainsKey($_) })
            pointerAttachments     = @(Split-CompatList $row.pointerAttachments | Where-Object { $allowedSet.Contains($_) -and $itemMap.ContainsKey($_) })
            opticAttachments       = @(Split-CompatList $row.opticAttachments | Where-Object { $allowedSet.Contains($_) -and $itemMap.ContainsKey($_) })
            underbarrelAttachments = @(Split-CompatList $row.underbarrelAttachments | Where-Object { $allowedSet.Contains($_) -and $itemMap.ContainsKey($_) })
            primaryMagazines       = @(Split-CompatList $row.primaryMagazines | Where-Object { $allowedSet.Contains($_) -and $itemMap.ContainsKey($_) })
            secondaryMagazines     = @(Split-CompatList $row.secondaryMagazines | Where-Object { $allowedSet.Contains($_) -and $itemMap.ContainsKey($_) })
        }
    }

    Write-JsonFile -Value $compat -Path $CompatibilityOutPath
    Write-Host "Wrote filtered items and compatibility files."
} else {
    Write-Host "Wrote filtered items file. Compatibility file not built because '$CompatibilityFullPath' was not found."
}
