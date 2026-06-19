import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";

@Component({
    selector: 'my-track',
    templateUrl: './track.component.html',
    styleUrls: ['./track.component.scss'],
    standalone: true
})
export class TrackComponent implements AfterViewInit {

    @ViewChild('trackCanvas') trackCanvas?: ElementRef;
    @ViewChild('audioFile') audioFile?: ElementRef;

    @Output() fileSelected: EventEmitter<{ file: File; data: Float32Array<ArrayBuffer> }> = new EventEmitter();

    @Input() color: 'blue' | 'yellow' | 'green' = 'blue';

    trackWidth = window.innerWidth - 25;
    trackHeight = 200;

    private _canvasContext?: CanvasRenderingContext2D;

    constructor() {}

    ngAfterViewInit(): void {
        const width = this.trackWidth;
        const height = this.trackHeight;

        const canvas = this.trackCanvas?.nativeElement as HTMLCanvasElement;
        this._canvasContext = canvas.getContext('2d')!;

        canvas.width = width;
        canvas.height = height;

        this._clearCanvas();

        (this.audioFile?.nativeElement as HTMLInputElement)?.addEventListener('change', async (event) => {
            const file = (event.target as HTMLInputElement)?.files?.[0];

            if (!file) {
                return;
            }

            const audioContext = new AudioContext();

            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0);

            this.fileSelected.emit({ file, data: channelData });

            const reduced = this._downSample(channelData);

            const max = Math.max(...reduced.map(d => Math.abs(d)));
            const maxRatio = height / max;

            for (let i = 0; i < reduced.length; i++) {
                const canvasValue = (Math.abs(reduced[i]) * maxRatio) - 0;
                this._drawSegment(i, (height - canvasValue) / 2, 1, canvasValue);
            }
        });
    }

    selectAudio() {
        (this.audioFile?.nativeElement as HTMLInputElement)?.click();
    }

    private _getProperty(p: string) {
        return getComputedStyle(document.documentElement).getPropertyValue('--' + p);
    }

    private _clearCanvas(color = this._getProperty('dark-' + this.color)) {
        this._canvasContext!.fillStyle = color!;
        this._canvasContext!.fillRect(0, 0, this.trackWidth, this.trackHeight);
    }

    private _drawSegment(x: number, y: number, w: number, h: number, color = this._getProperty(this.color)) {
        this._canvasContext!.fillStyle = color!;
        this._canvasContext!.fillRect(x, y, w, h);
    }

    private _downSample(channelData: Float32Array<ArrayBuffer>, targetSize = this.trackWidth) {
        const result = [];
        const blockSize = channelData.length / targetSize;

        for (let i = 0; i < targetSize; i++) {
            const start = Math.floor(i * blockSize);
            const end = Math.floor((i + 1) * blockSize);

            let sum = 0;
            let count = 0;

            for (let j = start; j < end; j++) {
                sum += channelData[j];
                count++;
            }

            result.push(sum / count);
        }

        return result;
    }
}