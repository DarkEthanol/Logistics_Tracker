param(
    [string]$CompatibilityInputPath = ".\compatibility-full.txt",
    [string]$AllowedPath = ".\allowed4ib_all.json",
    [string]$ItemsPath = "",
    [string]$OutputJsonPath = ".\compatibility.json"
)

function Read-JsonFile {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path $Path)) {
        return $null
    }

    $raw = Get-Content $Path -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    return $raw | ConvertFrom-Json
}

function Split-CompatList {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }

    return $Value.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries) |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ } |
        Select-Object -Unique
}

function To-AllowedList {
    param([object]$AllowedJson)

    if ($null -eq $AllowedJson) {
        throw "allowed4ib_all.json could not be read."
    }

    if ($AllowedJson -is [System.Array]) {
        return @($AllowedJson | ForEach-Object { "$_".Trim() } | Where-Object { $_ } | Select-Object -Unique)
    }

    throw "allowed4ib_all.json is not an array."
}

function To-ItemMap {
    param([object]$ItemsJson)

    $map = @{}

    if ($null -eq $ItemsJson) {
        return $map
    }

    foreach ($item in $ItemsJson) {
        if ($null -eq $item) { continue }
        $className = "$($item.className)".Trim()
        if ([string]::IsNullOrWhiteSpace($className)) { continue }
        $map[$className] = $item
    }

    return $map
}

$allowedJson = Read-JsonFile -Path $AllowedPath
$allowedList = To-AllowedList -AllowedJson $allowedJson
$allowedSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($value in $allowedList) { [void]$allowedSet.Add($value) }

$itemMap = To-ItemMap -ItemsJson (Read-JsonFile -Path $ItemsPath)

$rows = Import-Csv -Path $CompatibilityInputPath -Delimiter "`t"

$result = [ordered]@{}

foreach ($row in $rows) {
    $weapon = "$($row.weapon)".Trim()
    if ([string]::IsNullOrWhiteSpace($weapon)) { continue }

    if (-not $allowedSet.Contains($weapon)) { continue }

    $displayName = "$($row.displayName)".Trim()
    $typeRaw = "$($row.type)".Trim()
    $typeValue = 0
    [void][int]::TryParse($typeRaw, [ref]$typeValue)

    $muzzles                = @(Split-CompatList $row.muzzles)
    $muzzleAttachments      = @(Split-CompatList $row.muzzleAttachments | Where-Object { $allowedSet.Contains($_) })
    $pointerAttachments     = @(Split-CompatList $row.pointerAttachments | Where-Object { $allowedSet.Contains($_) })
    $opticAttachments       = @(Split-CompatList $row.opticAttachments | Where-Object { $allowedSet.Contains($_) })
    $underbarrelAttachments = @(Split-CompatList $row.underbarrelAttachments | Where-Object { $allowedSet.Contains($_) })
    $primaryMagazines       = @(Split-CompatList $row.primaryMagazines | Where-Object { $allowedSet.Contains($_) })
    $secondaryMagazines     = @(Split-CompatList $row.secondaryMagazines | Where-Object { $allowedSet.Contains($_) })

    if ($itemMap.Count -gt 0) {
        $muzzleAttachments      = @($muzzleAttachments      | Where-Object { $itemMap.ContainsKey($_) })
        $pointerAttachments     = @($pointerAttachments     | Where-Object { $itemMap.ContainsKey($_) })
        $opticAttachments       = @($opticAttachments       | Where-Object { $itemMap.ContainsKey($_) })
        $underbarrelAttachments = @($underbarrelAttachments | Where-Object { $itemMap.ContainsKey($_) })
        $primaryMagazines       = @($primaryMagazines       | Where-Object { $itemMap.ContainsKey($_) })
        $secondaryMagazines     = @($secondaryMagazines     | Where-Object { $itemMap.ContainsKey($_) })
    }

    $entry = [ordered]@{
        displayName            = $displayName
        type                   = $typeValue
        muzzles                = $muzzles
        muzzleAttachments      = $muzzleAttachments
        pointerAttachments     = $pointerAttachments
        opticAttachments       = $opticAttachments
        underbarrelAttachments = $underbarrelAttachments
        primaryMagazines       = $primaryMagazines
        secondaryMagazines     = $secondaryMagazines
    }

    $result[$weapon] = [pscustomobject]$entry
}

$json = $result | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($OutputJsonPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote $($result.Keys.Count) filtered weapon compatibility entries to $OutputJsonPath"
