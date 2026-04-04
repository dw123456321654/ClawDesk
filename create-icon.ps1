$bytes = New-Object System.Collections.ArrayList

# ICO header
[void]$bytes.AddRange(@(0,0,1,0,1,0))

# Icon directory entry
[void]$bytes.AddRange(@(32,32,0,0,1,0,32,0,168,16,0,0,22,0,0,0))

# BMP header
[void]$bytes.AddRange(@(40,0,0,0,32,0,0,0,64,0,0,0,1,0,32,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0))

# Pixel data
for ($i = 0; $i -lt 1024; $i++) {
    [void]$bytes.AddRange(@(255, 100, 50, 255))
}

# AND mask
for ($i = 0; $i -lt 128; $i++) {
    [void]$bytes.Add(0)
}

[System.IO.File]::WriteAllBytes('D:/Projects/ClawDesk/src-tauri/icons/icon.ico', $bytes.ToArray())
Write-Host 'Done'
