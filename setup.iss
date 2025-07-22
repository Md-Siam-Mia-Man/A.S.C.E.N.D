[Setup]
AppId={{com.ascend.dev}}
AppName=A.S.C.E.N.D.
AppVersion=1.1.0
AppPublisher=Md. Siam Mia
DefaultDirName={autopf}\A.S.C.E.N.D.
DefaultGroupName=A.S.C.E.N.D.
OutputDir=release
OutputBaseFilename=ASCEND-setup-v1.1.0
Compression=lzma
SolidCompression=yes
WizardStyle=modern
SetupIconFile=assets\img\icon.ico
UninstallDisplayIcon={app}\A.S.C.E.N.D.exe
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\A.S.C.E.N.D."; Filename: "{app}\A.S.C.E.N.D.exe"
Name: "{autodesktop}\A.S.C.E.N.D."; Filename: "{app}\A.S.C.E.N.D.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\A.S.C.E.N.D.exe"; Description: "{cm:LaunchProgram,A.S.C.E.N.D.}"; Flags: nowait postinstall skipifsilent