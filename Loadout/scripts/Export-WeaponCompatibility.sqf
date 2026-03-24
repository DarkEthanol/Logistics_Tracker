private _tab = toString [9];
private _nl = toString [13,10];
private _rows = [];

private _allowedWeapons = [
    "UK3CB_BAF_L85A3",
    "UK3CB_BAF_L85A3_UGL",
    "UK3CB_BAF_L85A2",
    "UK3CB_BAF_L85A2_UGL",
    "UK3CB_BAF_L85A2_RIS",
    "UK3CB_BAF_L129A1",
    "UK3CB_BAF_L7A2",
    "UK3CB_BAF_L22A2",
    "FM_L115A3_NoSpray",
    "FM_L115A3_Snow",
    "FM_L115A3_Woodland",
    "FM_L115A3_Desert",
    "ACE_VMH3",
    "UK3CB_BAF_L131A1",
    "rhsusf_weap_glock17g4",
    "RW_L2A1_ASM_Loaded",
    "RW_L2A1_HESH_Loaded",
    "UK3CB_BAF_NLAW_Launcher",
    "UK3CB_BAF_Javelin_CLU",
    "UK3CB_BAF_Javelin_Slung_Tube",
    "Starstreak",
    "Starstreak2_LML_LaunchUnit",
    "Starstreak_LML_LaunchUnit",
    "UK3CB_BAF_AT4_CS_AP_Launcher",
    "UK3CB_BAF_L111A1",
    "UK3CB_BAF_L134A1",
    "UK3CB_BAF_L16",
    "UK3CB_BAF_Tripod",
    "UK3CB_BAF_L16_Tripod",
    "Binocular",
    "ACE_Vector",
    "RW_JTL_Sand",
    "RW_JTL_Green",
    "AMOP_PLRF15C",
    "AMOP_PLRF25C",
    "UK3CB_BAF_Soflam_Laserdesignator",
    "bunwell_axe",
    "UK3CB_BAF_HMNVS",
    "4IB_ACE_NVG_Gen4_Black"
];

_rows pushBack (
    "weapon" + _tab +
    "displayName" + _tab +
    "type" + _tab +
    "muzzles" + _tab +
    "muzzleAttachments" + _tab +
    "pointerAttachments" + _tab +
    "opticAttachments" + _tab +
    "underbarrelAttachments" + _tab +
    "primaryMagazines" + _tab +
    "secondaryMagazines"
);

{
    private _weapon = _x;
    private _cfg = configFile >> "CfgWeapons" >> _weapon;

    if !(isClass _cfg) then { continue };

    private _displayName = getText (_cfg >> "displayName");
    if (_displayName == "") then { continue };

    private _type = if (isNumber (_cfg >> "type")) then { getNumber (_cfg >> "type") } else { -1 };
    if !(_type in [1, 2, 4, 5, 4096]) then { continue };

    private _muzzles = getArray (_cfg >> "muzzles");
    if ((count _muzzles) == 0) then {
        _muzzles = ["this"];
    };

    private _muzzleAttachments = compatibleItems [_weapon, "MuzzleSlot"];
    private _pointerAttachments = compatibleItems [_weapon, "PointerSlot"];
    private _opticAttachments = compatibleItems [_weapon, "CowsSlot"];
    private _underbarrelAttachments = compatibleItems [_weapon, "UnderBarrelSlot"];

    private _primaryMagazines = compatibleMagazines [_weapon, "this"];
    private _secondaryMagazines = [];

    {
        if (_x != "this") then {
            _secondaryMagazines append (compatibleMagazines [_weapon, _x]);
        };
    } forEach _muzzles;

    _muzzleAttachments = _muzzleAttachments arrayIntersect _muzzleAttachments;
    _pointerAttachments = _pointerAttachments arrayIntersect _pointerAttachments;
    _opticAttachments = _opticAttachments arrayIntersect _opticAttachments;
    _underbarrelAttachments = _underbarrelAttachments arrayIntersect _underbarrelAttachments;
    _primaryMagazines = _primaryMagazines arrayIntersect _primaryMagazines;
    _secondaryMagazines = _secondaryMagazines arrayIntersect _secondaryMagazines;

    _rows pushBack (
        _weapon + _tab +
        _displayName + _tab +
        str _type + _tab +
        (_muzzles joinString ";") + _tab +
        (_muzzleAttachments joinString ";") + _tab +
        (_pointerAttachments joinString ";") + _tab +
        (_opticAttachments joinString ";") + _tab +
        (_underbarrelAttachments joinString ";") + _tab +
        (_primaryMagazines joinString ";") + _tab +
        (_secondaryMagazines joinString ";")
    );
} forEach _allowedWeapons;

copyToClipboard (_rows joinString _nl);
hint format ["Copied %1 compatibility rows", (count _rows) - 1];
systemChat format ["Copied %1 compatibility rows", (count _rows) - 1];
