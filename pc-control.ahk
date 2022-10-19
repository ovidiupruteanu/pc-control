#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
#NoTrayIcon
; #Warn  ; Enable warnings to assist with detecting common errors.
;@Ahk2Exe-ConsoleApp


command = %1%

stdout := FileOpen("*", 0x1)



Switch command
{
case "status":
	SoundGet, muteState, Master, Mute
	StringLower, muteState, muteState

	SoundGet, master_volue

	status = %master_volue% %muteState%

	stdout.WriteLine(status)

Case "volume":

	level = %2%
    if(level){
		SoundSet, level
	}
	SoundGet, master_volue
	stdout.WriteLine(master_volue)

Case "mute":

	mute = %2%

	SoundGet, muteState, Master, Mute
    if((muteState=="Off" && mute == "on")) || (muteState=="On" && mute == "off"){
		SoundSet, +1,, Mute
	}


	SoundGet, muteState, Master, Mute
	StringLower, muteState, muteState
	stdout.WriteLine(muteState)

Case "monitor":

	turnMonitor = %2%
	if(turnMonitor == "off"){
		SendMessage,0x112,0xF170,2,,Program Manager
		stdout.WriteLine("off")
	}else if(turnMonitor=="on"){
		MouseMove, 1,-1,,R
		stdout.WriteLine("on")
	}

Case "lock":

	DllCall("LockWorkStation")
	stdout.WriteLine("on")

Case "sleep":

	stdout.WriteLine("on")
	DllCall("PowrProf\SetSuspendState", "Int", 0, "Int", 1, "Int", 0)

Case "media":
	command = %2%

	Switch command
	{
		Case "play_pause":
			Send {Media_Play_Pause}
		Case "stop":
			Send {Media_Stop}
		Case "next":
			Send {Media_Next}
		Case "previous":
			Send {Media_Prev}
	}

	stdout.WriteLine("on")

Default:
    stdout.WriteLine("Unknown command")
}

stdout.Close()
