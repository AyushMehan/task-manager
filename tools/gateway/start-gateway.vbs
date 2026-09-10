' Launches the gateway with no console window.
' Registered as a logon scheduled task; see docs/running.md.
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\Compro\orca\workspaces\task-manager\Task-Manager"
shell.Run "node tools\gateway\server.mjs", 0, False
