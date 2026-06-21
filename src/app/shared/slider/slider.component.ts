import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from "@angular/core";

@Component({
    selector: 'my-slider',
    templateUrl: './slider.component.html',
    styleUrls: ['./slider.component.scss'],
    standalone: true
})
export class SliderComponent implements AfterViewInit {

    @ViewChild('slider') slider?: ElementRef;

    @Input() color: string = 'red'

    @Input() min = 1;
    @Input() max = 100;

    @Output() changedValue: EventEmitter<number> = new EventEmitter();

    adjustedValue = this.max;

    tracking = false;

    constructor() {}

    @HostListener('window:mouseup', [])
    detectMouseUp() {
        if (this.tracking) {
            this.stopTracking();
        }
    }

    ngAfterViewInit(): void {
        this._moveSlider();
    }

    toggleTracking() {
        this.tracking = !this.tracking;
    }

    startTracking() {
        this.tracking = true;
    }

    stopTracking() {
        this.tracking = false;
    }

    change(event: MouseEvent, force = false) {
        if (!this.tracking && !force) {
            return;
        }

        const width = +(getComputedStyle(this.slider?.nativeElement).getPropertyValue('width')?.split('p')[0]);

        const adjustedMax = this.max - (this.min - 1);
        const x = event.pageX - (this.slider?.nativeElement as HTMLDivElement)?.offsetLeft;
        const value = adjustedMax * x / width;

        this.adjustedValue = value + (this.min - 1);

        if (this.adjustedValue < this.min) {
            this.adjustedValue = this.min;
        }

        if (this.adjustedValue > this.max) {
            this.adjustedValue = this.max;
        }

        if (!this.adjustedValue) {
            return;
        }

        this._moveSlider();

        this.changedValue.emit(this.adjustedValue);
    }

    private _moveSlider() {
        const ball = (this.slider?.nativeElement as HTMLDivElement)?.querySelector('div');

        if (!ball) {
            return;
        }

        ball.style.left = `${this.adjustedValue}%`;
    }

}