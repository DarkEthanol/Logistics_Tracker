param(
    [string]$InputPath = "",
    [string]$OutputJsonPath = ".\items-full.json"
)

function Read-InputText {
    param([string]$Path)

    if (-not [string]::IsNullOrWhiteSpace($Path)) {
        return [System.IO.File]::ReadAllText((Resolve-Path $Path), [System.Text.Encoding]::UTF8)
    }

    return Get-Clipboard -Raw
}

function To-NullableNumber {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }

    $raw = $Value.Trim()
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    $parsed = 0.0

    if ([double]::TryParse($raw, [System.Globalization.NumberStyles]::Float, $culture, [ref]$parsed)) {
        if ($parsed -lt 0) { return $null }

        if ([math]::Abs($parsed - [math]::Round($parsed)) -lt 0.0000001) {
            return [int][math]::Round($parsed)
        }

        return $parsed
    }

    return $null
}

$text = Read-InputText -Path $InputPath

if ([string]::IsNullOrWhiteSpace($text)) {
    throw "No input found. Either pass -InputPath or leave the Arma export on the clipboard."
}

$rows = $text | ConvertFrom-Csv -Delimiter "`t"

$items = foreach ($row in $rows) {
    $className = "$($row.className)".Trim()
    $displayName = "$($row.displayName)".Trim()

    if ([string]::IsNullOrWhiteSpace($className) -or [string]::IsNullOrWhiteSpace($displayName)) {
        continue
    }

    $item = [ordered]@{
        className    = $className
        displayName  = $displayName
        armaCategory = if ($row.armaCategory) { "$($row.armaCategory)".Trim() } else { "Unknown" }
        armaType     = if ($row.armaType) { "$($row.armaType)".Trim() } else { "Unknown" }
    }

    $mass = To-NullableNumber $row.mass
    if ($null -ne $mass) { $item.mass = $mass }

    $count = To-NullableNumber $row.count
    if ($null -ne $count) { $item.count = $count }

    $maxLoad = To-NullableNumber $row.maxLoad
    if ($null -ne $maxLoad) { $item.maxLoad = $maxLoad }

    if (-not [string]::IsNullOrWhiteSpace($row.mod)) {
        $item.mod = "$($row.mod)".Trim()
    }

    if (-not [string]::IsNullOrWhiteSpace($row.addons)) {
        $addons = "$($row.addons)".Split(';', [System.StringSplitOptions]::RemoveEmptyEntries) |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ }

        if ($addons.Count -gt 0) {
            $item.addons = $addons
        }
    }

    [pscustomobject]$item
}

$items =
    $items |
    Group-Object className |
    ForEach-Object {
        $_.Group |
        Sort-Object `
            @{ Expression = { [string]::IsNullOrWhiteSpace($_.displayName) }; Ascending = $true },
            @{ Expression = { $null -eq $_.mass }; Ascending = $true },
            @{ Expression = { $null -eq $_.maxLoad }; Ascending = $true } |
        Select-Object -First 1
    } |
    Sort-Object displayName, className

$json = $items | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($OutputJsonPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote $($items.Count) items to $OutputJsonPath"