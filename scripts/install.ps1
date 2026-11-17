param(
    [switch] $Uninstall
)

$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or newer is required. Install it from https://aka.ms/powershell."
}

$configRoot = if ($env:XDG_CONFIG_HOME) {
    Join-Path $env:XDG_CONFIG_HOME "opencode"
} else {
    Join-Path $HOME ".config\opencode"
}
$configPath = Join-Path $configRoot "cli.json"
$pluginPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path.Replace("\", "/")
$schema = "https://opencode.ai/v2/cli.json"

if (Test-Path $configPath) {
    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json -AsHashtable
    } catch {
        throw "Could not parse $configPath. No changes were made. Fix the JSON and retry."
    }
} else {
    $config = [ordered]@{ '$schema' = $schema }
}

if (-not $config -or $config -isnot [System.Collections.IDictionary]) {
    throw "$configPath must contain a JSON object. No changes were made."
}

$plugins = @()
if ($config.Contains("plugins")) {
    if ($config["plugins"] -isnot [System.Collections.IList]) {
        throw "The plugins setting in $configPath must be an array. No changes were made."
    }
    $plugins = @($config["plugins"])
}

if ($Uninstall) {
    $updated = @($plugins | Where-Object {
        $_ -isnot [string] -or -not [string]::Equals($_, $pluginPath, [StringComparison]::OrdinalIgnoreCase)
    })
    if ($updated.Count -eq $plugins.Count) {
        Write-Output "Plugin was not listed in $configPath."
        exit 0
    }
    $plugins = $updated
    if ($plugins.Count -gt 0) {
        $config["plugins"] = $plugins
    } else {
        $config.Remove("plugins")
    }
} else {
    $present = @($plugins | Where-Object {
        $_ -is [string] -and [string]::Equals($_, $pluginPath, [StringComparison]::OrdinalIgnoreCase)
    }).Count -gt 0
    if ($present) {
        Write-Output "Plugin is already installed in $configPath."
        exit 0
    }
    $plugins += $pluginPath
    $config["plugins"] = $plugins
    if (-not $config.Contains('$schema')) {
        $config['$schema'] = $schema
    }
}

New-Item -ItemType Directory -Force -Path $configRoot | Out-Null
if (Test-Path $configPath) {
    $backup = "$configPath.bak.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $configPath $backup
    Write-Output "Backup: $backup"
}

$json = ConvertTo-Json -InputObject $config -Depth 100
[System.IO.File]::WriteAllText($configPath, "$json`n", [System.Text.UTF8Encoding]::new($false))

if ($Uninstall) {
    Write-Output "Removed plugin from $configPath."
} else {
    Write-Output "Installed plugin at $pluginPath in $configPath."
}
