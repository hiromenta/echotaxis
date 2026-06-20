import { Component, EventEmitter } from "@angular/core";
import { TrackComponent } from "../../shared/track/track.component";

@Component({
    selector: 'my-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: true,
    imports: [TrackComponent]
})
export class HomeComponent {

    pauseBase = new EventEmitter<void>();
    pauseSample = new EventEmitter<void>();
    pauseResult = new EventEmitter<void>();

    played(track: 'base' | 'sample' | 'result') {
        switch (track) {
            case 'base':
                this.pauseSample.emit();
                this.pauseResult.emit();
                break;
            case 'sample':
                this.pauseBase.emit();
                this.pauseResult.emit();
                break;
            case 'result':
                this.pauseSample.emit();
                this.pauseSample.emit();
                break;
        }
    }

}