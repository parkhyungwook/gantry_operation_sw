param(
  [string]$TaskName = "GantryBackend",
  [string]$WorkDir  = "D:\Job\5. Development\14. Gantry\backend",
  [string]$NodeExe  = "node.exe" # 절대경로 가능: "C:\Program Files\nodejs\node.exe"
)

# 작업 폴더 이동 → logs 폴더 생성 → 백엔드 실행 후 로그 파일로 출력
$CommandBlock = "cd `"$WorkDir`"; if (!(Test-Path logs)) { New-Item logs -ItemType Directory | Out-Null }; & `"$NodeExe`" .\dist\main.js >> .\logs\backend.log 2>&1"
$Argument     = "-NoProfile -ExecutionPolicy Bypass -Command ""& { $CommandBlock }"""

$Action    = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $Argument
$Trigger   = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Force
