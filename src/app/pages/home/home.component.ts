import { Component, OnInit } from "@angular/core";
import { TrackComponent } from "../../shared/track/track.component";

@Component({
    selector: 'my-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: true,
    imports: [TrackComponent]
})
export class HomeComponent {}