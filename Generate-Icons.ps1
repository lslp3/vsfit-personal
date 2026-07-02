$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ProjectRoot = "C:\Users\laercio\vsfit-personal-v2"

$SourceLogo = Join-Path `
  $ProjectRoot `
  "src\assets\brand\vsfit-logo.png"

$PublicDirectory = Join-Path `
  $ProjectRoot `
  "public"

$IconsDirectory = Join-Path `
  $PublicDirectory `
  "icons"

$ResourcesDirectory = Join-Path `
  $ProjectRoot `
  "resources"

if (-not (Test-Path $SourceLogo)) {
  throw "Logo não encontrada em: $SourceLogo"
}

New-Item `
  -ItemType Directory `
  -Force `
  -Path $PublicDirectory |
  Out-Null

New-Item `
  -ItemType Directory `
  -Force `
  -Path $IconsDirectory |
  Out-Null

New-Item `
  -ItemType Directory `
  -Force `
  -Path $ResourcesDirectory |
  Out-Null

function New-SquarePng {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Destination,

    [Parameter(Mandatory = $true)]
    [int]$Size,

    [int]$Padding = 0
  )

  $SourceImage = [System.Drawing.Image]::FromFile(
    $Source
  )

  try {
    $Bitmap = [System.Drawing.Bitmap]::new(
      $Size,
      $Size,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    try {
      $Graphics = [System.Drawing.Graphics]::FromImage(
        $Bitmap
      )

      try {
        $Graphics.Clear(
          [System.Drawing.Color]::Transparent
        )

        $Graphics.CompositingQuality =
          [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $Graphics.InterpolationMode =
          [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

        $Graphics.SmoothingMode =
          [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $Graphics.PixelOffsetMode =
          [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $AvailableSize = $Size - ($Padding * 2)

        $ScaleX =
          $AvailableSize / $SourceImage.Width

        $ScaleY =
          $AvailableSize / $SourceImage.Height

        $Scale = [Math]::Min(
          $ScaleX,
          $ScaleY
        )

        $ImageWidth = [int][Math]::Round(
          $SourceImage.Width * $Scale
        )

        $ImageHeight = [int][Math]::Round(
          $SourceImage.Height * $Scale
        )

        $PositionX = [int][Math]::Round(
          ($Size - $ImageWidth) / 2
        )

        $PositionY = [int][Math]::Round(
          ($Size - $ImageHeight) / 2
        )

        $Graphics.DrawImage(
          $SourceImage,
          $PositionX,
          $PositionY,
          $ImageWidth,
          $ImageHeight
        )

        $DestinationDirectory =
          Split-Path `
            $Destination `
            -Parent

        New-Item `
          -ItemType Directory `
          -Force `
          -Path $DestinationDirectory |
          Out-Null

        $Bitmap.Save(
          $Destination,
          [System.Drawing.Imaging.ImageFormat]::Png
        )
      }
      finally {
        $Graphics.Dispose()
      }
    }
    finally {
      $Bitmap.Dispose()
    }
  }
  finally {
    $SourceImage.Dispose()
  }

  Write-Host "Criado: $Destination"
}

New-SquarePng `
  -Source $SourceLogo `
  -Destination (
    Join-Path $PublicDirectory "favicon.png"
  ) `
  -Size 64 `
  -Padding 4

New-SquarePng `
  -Source $SourceLogo `
  -Destination (
    Join-Path $PublicDirectory "apple-touch-icon.png"
  ) `
  -Size 180 `
  -Padding 14

New-SquarePng `
  -Source $SourceLogo `
  -Destination (
    Join-Path $IconsDirectory "icon-192.png"
  ) `
  -Size 192 `
  -Padding 12

New-SquarePng `
  -Source $SourceLogo `
  -Destination (
    Join-Path $IconsDirectory "icon-512.png"
  ) `
  -Size 512 `
  -Padding 28

New-SquarePng `
  -Source $SourceLogo `
  -Destination (
    Join-Path $IconsDirectory "icon-maskable-512.png"
  ) `
  -Size 512 `
  -Padding 72

New-SquarePng `
  -Source $SourceLogo `
  -Destination (
    Join-Path $ResourcesDirectory "icon.png"
  ) `
  -Size 1024 `
  -Padding 60

$AndroidResources = Join-Path `
  $ProjectRoot `
  "android\app\src\main\res"

if (Test-Path $AndroidResources) {
  $AndroidIcons = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
  }

  foreach (
    $AndroidIcon in $AndroidIcons.GetEnumerator()
  ) {
    $MipmapDirectory = Join-Path `
      $AndroidResources `
      $AndroidIcon.Key

    New-Item `
      -ItemType Directory `
      -Force `
      -Path $MipmapDirectory |
      Out-Null

    New-SquarePng `
      -Source $SourceLogo `
      -Destination (
        Join-Path `
          $MipmapDirectory `
          "ic_launcher.png"
      ) `
      -Size $AndroidIcon.Value `
      -Padding 4

    New-SquarePng `
      -Source $SourceLogo `
      -Destination (
        Join-Path `
          $MipmapDirectory `
          "ic_launcher_round.png"
      ) `
      -Size $AndroidIcon.Value `
      -Padding 4
  }

  Write-Host ""
  Write-Host "Ícones Android atualizados."
}
else {
  Write-Host ""
  Write-Host "Pasta Android ainda não encontrada."
  Write-Host "O arquivo resources\icon.png foi preparado para o APK."
}

Write-Host ""
Write-Host "Todos os ícones foram gerados com sucesso."