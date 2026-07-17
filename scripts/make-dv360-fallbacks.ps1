param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

Add-Type -AssemblyName System.Drawing

$fallbackDir = Join-Path $ProjectRoot 'dv360\fallbacks'
New-Item -ItemType Directory -Force -Path $fallbackDir | Out-Null
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Jpeg {
  param(
    [System.Drawing.Image]$Image,
    [string]$Path,
    [long]$Quality
  )
  $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    $Quality
  )
  $Image.Save($Path, $jpegCodec, $parameters)
  $parameters.Dispose()
}

foreach ($size in @('970x250', '970x500')) {
  $source = Join-Path $ProjectRoot "dv360\preview-$size.png"
  if (-not (Test-Path $source)) {
    throw "Preview missing: $source"
  }
  $image = [System.Drawing.Image]::FromFile($source)
  try {
    $backup = Join-Path $fallbackDir "backup-$size.jpg"
    Save-Jpeg -Image $image -Path $backup -Quality 78

    $polite = Join-Path $fallbackDir "polite-$size.jpg"
    $quality = 55L
    do {
      Save-Jpeg -Image $image -Path $polite -Quality $quality
      $quality -= 5
    } while ((Get-Item $polite).Length -ge 40000 -and $quality -ge 15)
  }
  finally {
    $image.Dispose()
  }
}

Get-ChildItem $fallbackDir | Select-Object Name, Length

