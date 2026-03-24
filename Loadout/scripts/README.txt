Loadout Generator Toolchain
===========================

Files in this folder:
- Export-ArmaItems.sqf
- Export-WeaponCompatibility.sqf
- Convert-ArmaItemsToJson.ps1
- Convert-CompatibilityToJson.ps1
- Build-WebData.ps1
- allowed4ib_all.json

Suggested workflow
------------------
1. Run Export-ArmaItems.sqf in the Arma debug console.
2. Paste the clipboard output into items-full.txt.
3. Run:
   .\Convert-ArmaItemsToJson.ps1 -InputPath .\items-full.txt -OutputJsonPath .\items-full.json

4. Run Export-WeaponCompatibility.sqf in the Arma debug console.
5. Paste the clipboard output into compatibility-full.txt.
6. Run:
   .\Convert-CompatibilityToJson.ps1 -CompatibilityInputPath .\compatibility-full.txt -AllowedPath .\allowed4ib_all.json -ItemsPath .\items-full.json -OutputJsonPath .\compatibility.json

7. Or build both filtered web files in one go:
   .\Build-WebData.ps1 -ItemsFullPath .\items-full.json -AllowedPath .\allowed4ib_all.json -CompatibilityFullPath .\compatibility-full.txt -ItemsOutPath .\items.json -CompatibilityOutPath .\compatibility.json

Use in the website
------------------
Your page should use:
- items.json
- compatibility.json
- default-loadouts.json

Keep these as source data:
- items-full.json
- compatibility-full.txt (or a converted full compatibility source if you want to keep it)
- allowed4ib_all.json
