private _tab = toString [9];
private _nl = toString [13,10];
private _rows = [];

_rows pushBack ("className" + _tab + "displayName" + _tab + "category" + _tab + "subtype" + _tab + "mass" + _tab + "count" + _tab + "maxLoad" + _tab + "mod" + _tab + "addons");

{
    private _cfg = _x;
    private _className = configName _cfg;
    private _displayName = getText (_cfg >> "displayName");

    if (_displayName != "") then {
        private _itemInfo = _cfg >> "ItemInfo";
        private _subtype = "item";
        private _mass = -1;
        private _maxLoad = -1;
        private _mod = configSourceMod _cfg;
        private _addons = (configSourceAddonList _cfg) joinString ";";

        if (isNumber (_itemInfo >> "mass")) then {
            _mass = getNumber (_itemInfo >> "mass");
        } else {
            if (isNumber (_cfg >> "WeaponSlotsInfo" >> "mass")) then {
                _mass = getNumber (_cfg >> "WeaponSlotsInfo" >> "mass");
            } else {
                if (isNumber (_cfg >> "mass")) then {
                    _mass = getNumber (_cfg >> "mass");
                };
            };
        };

        if (isClass _itemInfo) then {
            private _uniformClass = "";
            if (isText (_itemInfo >> "uniformClass")) then {
                _uniformClass = getText (_itemInfo >> "uniformClass");
            };

            if (_uniformClass != "") then {
                _subtype = "uniform";
            } else {
                private _itemType = -1;
                if (isNumber (_itemInfo >> "type")) then {
                    _itemType = getNumber (_itemInfo >> "type");
                };

                if (_itemType == 701) then { _subtype = "vest"; };
                if (_itemType == 605) then { _subtype = "headgear"; };
                if (_itemType == 619) then { _subtype = "nvg"; };
                if (_itemType == 101) then { _subtype = "muzzle"; };
                if (_itemType == 201) then { _subtype = "optic"; };
                if (_itemType == 301) then { _subtype = "pointer"; };
                if (_itemType == 302) then { _subtype = "bipod"; };
            };
        };

        private _simulation = toLower (getText (_cfg >> "simulation"));
        if ((_simulation find "binocular") >= 0) then {
            _subtype = "binocular";
        };

        private _type = -1;
        if (isNumber (_cfg >> "type")) then {
            _type = getNumber (_cfg >> "type");
        };

        if ((_type == 1) || (_type == 2) || (_type == 4) || (_type == 5) || (_type == 4096)) then {
            if (_subtype == "item") then {
                _subtype = "weapon";
            };
        };

        if ((_subtype == "uniform") || (_subtype == "vest")) then {
            private _containerClass = "";
            if (isText (_itemInfo >> "containerClass")) then {
                _containerClass = getText (_itemInfo >> "containerClass");
            };

            if (_containerClass != "") then {
                private _containerCfg = configFile >> "CfgVehicles" >> _containerClass;
                if (isClass _containerCfg) then {
                    if (isNumber (_containerCfg >> "maximumLoad")) then {
                        _maxLoad = getNumber (_containerCfg >> "maximumLoad");
                    };
                };
            };
        };

        _rows pushBack (
            _className + _tab +
            _displayName + _tab +
            "weaponItem" + _tab +
            _subtype + _tab +
            str _mass + _tab +
            "-1" + _tab +
            str _maxLoad + _tab +
            _mod + _tab +
            _addons
        );
    };
} forEach ("getNumber (_x >> 'scope') == 2" configClasses (configFile >> "CfgWeapons"));

{
    private _cfg = _x;
    private _className = configName _cfg;
    private _displayName = getText (_cfg >> "displayName");

    if (_displayName != "") then {
        private _mass = -1;
        private _count = -1;
        private _subtype = "magazine";
        private _mod = configSourceMod _cfg;
        private _addons = (configSourceAddonList _cfg) joinString ";";

        if (isNumber (_cfg >> "mass")) then {
            _mass = getNumber (_cfg >> "mass");
        };

        if (isNumber (_cfg >> "count")) then {
            _count = getNumber (_cfg >> "count");
        };

        private _ammoClass = toLower (getText (_cfg >> "ammo"));
        private _lowerName = toLower _displayName;

        if (((_ammoClass find "smoke") >= 0) || ((_lowerName find "smoke") >= 0)) then { _subtype = "smoke"; };
        if (((_ammoClass find "grenade") >= 0) || ((_lowerName find "grenade") >= 0)) then { _subtype = "grenade"; };
        if (((_ammoClass find "flare") >= 0) || ((_lowerName find "flare") >= 0)) then { _subtype = "flare"; };
        if (((_ammoClass find "chemlight") >= 0) || ((_lowerName find "chemlight") >= 0)) then { _subtype = "chemlight"; };

        _rows pushBack (
            _className + _tab +
            _displayName + _tab +
            "magazine" + _tab +
            _subtype + _tab +
            str _mass + _tab +
            str _count + _tab +
            "-1" + _tab +
            _mod + _tab +
            _addons
        );
    };
} forEach ("getNumber (_x >> 'scope') == 2" configClasses (configFile >> "CfgMagazines"));

{
    private _cfg = _x;
    private _className = configName _cfg;
    private _displayName = getText (_cfg >> "displayName");

    if (_displayName != "") then {
        private _isBackpack = 0;
        if (isNumber (_cfg >> "isBackpack")) then {
            _isBackpack = getNumber (_cfg >> "isBackpack");
        };

        if (_isBackpack == 1) then {
            private _mass = -1;
            private _maxLoad = -1;
            private _mod = configSourceMod _cfg;
            private _addons = (configSourceAddonList _cfg) joinString ";";

            if (isNumber (_cfg >> "mass")) then {
                _mass = getNumber (_cfg >> "mass");
            };

            if (isNumber (_cfg >> "maximumLoad")) then {
                _maxLoad = getNumber (_cfg >> "maximumLoad");
            };

            _rows pushBack (
                _className + _tab +
                _displayName + _tab +
                "backpack" + _tab +
                "backpack" + _tab +
                str _mass + _tab +
                "-1" + _tab +
                str _maxLoad + _tab +
                _mod + _tab +
                _addons
            );
        };
    };
} forEach ("getNumber (_x >> 'scope') == 2" configClasses (configFile >> "CfgVehicles"));

{
    private _cfg = _x;
    private _className = configName _cfg;
    private _displayName = getText (_cfg >> "displayName");

    if (_displayName != "") then {
        private _mass = 0;
        private _mod = configSourceMod _cfg;
        private _addons = (configSourceAddonList _cfg) joinString ";";

        if (isNumber (_cfg >> "mass")) then {
            _mass = getNumber (_cfg >> "mass");
        };

        _rows pushBack (
            _className + _tab +
            _displayName + _tab +
            "weaponItem" + _tab +
            "goggles" + _tab +
            str _mass + _tab +
            "-1" + _tab +
            "-1" + _tab +
            _mod + _tab +
            _addons
        );
    };
} forEach ("getNumber (_x >> 'scope') == 2" configClasses (configFile >> "CfgGlasses"));

copyToClipboard (_rows joinString _nl);
hint format ["Copied %1 rows to clipboard", (count _rows) - 1];
systemChat format ["Copied %1 rows to clipboard", (count _rows) - 1];
