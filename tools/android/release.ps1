# Tilmiz: Play'e yüklenecek imzalı .aab üretir.
# Şifre yalnızca bu pencerede sorulur, hiçbir dosyaya yazılmaz.
# Kullanım (PowerShell):  powershell -ExecutionPolicy Bypass -File tools\android\release.ps1
#   İlk kez çalıştırıldığında imza anahtarı yoksa oluşturur (keytool şifreyi kendisi sorar).
param(
  [string]$Keystore = "D:\tilmiz-imza\tilmiz-upload.keystore",
  [string]$Alias = "tilmiz",
  [string]$Project = "D:\Android\tilmiz-twa"
)
$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "D:\Android\jdk-17.0.21.1+2"
$env:GRADLE_USER_HOME = "D:\Android\gradle-home"
$keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
$repo = Split-Path (Split-Path $PSScriptRoot)

if (-not (Test-Path $Keystore)) {
  Write-Host "İmza anahtarı yok; şimdi oluşturulacak: $Keystore" -ForegroundColor Yellow
  Write-Host "Ad-soyad sorusuna 'Mihenk Labs' yazabilirsin. Şifreyi parola yöneticine kaydet; anahtar dosyasını yedekle (kaybolursa güncelleme yüklemek zorlaşır)."
  New-Item -ItemType Directory -Force (Split-Path $Keystore) | Out-Null
  & $keytool -genkeypair -v -keystore $Keystore -alias $Alias -keyalg RSA -keysize 2048 -validity 10000
  if ($LASTEXITCODE -ne 0) { throw "keytool başarısız" }
}

$sec = Read-Host "İmza anahtarı şifresi" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try {
  $env:TILMIZ_KS_PASS = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:TILMIZ_KEYSTORE = $Keystore
  $env:TILMIZ_KEY_ALIAS = $Alias

  Write-Host "`nYükleme anahtarının SHA-256 parmak izi (app.config.json > fingerprints içine 'upload' olarak eklenir):" -ForegroundColor Cyan
  & $keytool -list -v -keystore $Keystore -alias $Alias -storepass:env TILMIZ_KS_PASS | Select-String "SHA256:"

  node (Join-Path $repo "tools\android\integrate.mjs") $Project
  Push-Location $Project
  try { & .\gradlew.bat --no-daemon bundleRelease assembleRelease; if ($LASTEXITCODE -ne 0) { throw "gradle başarısız" } }
  finally { Pop-Location }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Item Env:TILMIZ_KS_PASS, Env:TILMIZ_KEYSTORE, Env:TILMIZ_KEY_ALIAS -ErrorAction SilentlyContinue
}

$out = Join-Path $repo "dist\twa"
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item "$Project\app\build\outputs\bundle\release\app-release.aab" "$out\tilmiz.aab" -Force
Copy-Item "$Project\app\build\outputs\apk\release\app-release.apk" "$out\tilmiz.apk" -Force
Write-Host "`nHazır: $out\tilmiz.aab (Play'e yüklenecek) ve tilmiz.apk (telefonda denemek için)" -ForegroundColor Green
