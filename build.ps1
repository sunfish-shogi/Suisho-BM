[CmdletBinding()]
param(
    [string]$Msys2Root = 'C:\Tools\msys2',
    [ValidateSet('SSE2', 'SSE41', 'SSE42', 'AVX2', 'AVX512', 'ZEN2', 'ZEN3')]
    [string]$TargetCpu = 'AVX2',
    [ValidateRange(1, 256)]
    [int]$Jobs = [Environment]::ProcessorCount,
    # Recompile every object (after changing the compiler or TargetCpu).
    [switch]$Rebuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$bash = Join-Path $Msys2Root 'usr\bin\bash.exe'
if (-not (Test-Path -LiteralPath $bash -PathType Leaf)) {
    throw "MSYS2 bash.exe was not found: $bash"
}

$root = [IO.Path]::GetFullPath($PSScriptRoot)
$unixRoot = '/' + $root.Substring(0, 1).ToLowerInvariant() + $root.Substring(2).Replace('\', '/')
$clean = if ($Rebuild) { 'make clean && ' } else { '' }
$command = "cd '$unixRoot/source' && $clean" + "make -j$Jobs TARGET_CPU=$TargetCpu"

$oldMsystem = $env:MSYSTEM
$oldPreference = $ErrorActionPreference
try {
    $env:MSYSTEM = 'MINGW64'
    # The compiler writes warnings to stderr; do not treat them as errors.
    $ErrorActionPreference = 'Continue'
    & $bash -lc $command 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -match 'error' }
    $exitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $oldPreference
    $env:MSYSTEM = $oldMsystem
}
if ($exitCode -ne 0) { throw "Build failed (exit code $exitCode)." }
Write-Output "Built: $(Join-Path $root 'Suisho-BM.exe')"
