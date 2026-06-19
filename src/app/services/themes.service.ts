import { Injectable } from "@angular/core";
import { Theme, Themes } from "../models/themes.model";
import { ConfigService } from "./config.service";
import { map, Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class ThemesService {

    private _currentThemeName = this._getThemeFromLocalStorage();
    private _currentTheme?: Theme;

    constructor(private _configService: ConfigService) {}

    getCurrentTheme(): { name?: string, theme?: Theme } {
        return { name: this._currentThemeName, theme: this._currentTheme };
    }

    getThemes(theme?: Themes): Observable<{ [key: string]: Theme } | Theme> {
        return this._configService.getThemesConfig().pipe(map((themes) => {
            if (theme) {
                return themes[theme];
            }

            return themes;
        }));
    }

    changeTheme(theme: Themes): Observable<Theme> {
        return this._changeTheme(theme);
    }

    private _changeTheme(theme: Themes): Observable<Theme> {
        return this._configService.getThemesConfig().pipe(map((themes) => {
            if (!themes[theme]) {
                theme = Themes.DARK;
            }

            for (const property of Object.entries(themes[theme])) {
                document.documentElement.style.setProperty('--' + property[0], property[1]);
            }

            localStorage.setItem('theme', theme);

            this._currentThemeName = theme;
            this._currentTheme = themes[theme];

            return this._currentTheme;
        }));
    }

    private _getThemeFromLocalStorage(): Themes {
        if (localStorage.getItem('theme')) {
            return (localStorage.getItem('theme')!) as Themes;
        }

        return Themes.DARK;
    }

}