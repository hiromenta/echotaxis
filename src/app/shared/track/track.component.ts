import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";

@Component({
    selector: 'my-track',
    templateUrl: './track.component.html',
    styleUrls: ['./track.component.scss'],
    standalone: true
})
export class TrackComponent implements AfterViewInit {

    @ViewChild('trackCanvas') trackCanvas?: ElementRef;
    @ViewChild('hiddenCanvas') hiddenCanvas?: ElementRef;
    @ViewChild('audioFile') audioFile?: ElementRef;

    @Output() fileSelected: EventEmitter<{ file: File; data: Float32Array<ArrayBuffer> }> = new EventEmitter();

    @Input() color: 'blue' | 'yellow' | 'green' = 'blue';

    trackWidth?: number;
    trackHeight?: number;

    audio: HTMLAudioElement = new Audio();

    drawingBar: any;

    currentFile?: File;

    private _canvasContext?: CanvasRenderingContext2D;

    constructor() {}

    ngAfterViewInit(): void {
        this.trackWidth = this._pixelToNumber(getComputedStyle(this.trackCanvas?.nativeElement).getPropertyValue('width'));
        this.trackHeight = this._pixelToNumber(getComputedStyle(this.trackCanvas?.nativeElement).getPropertyValue('height'));

        const width = this.trackWidth;
        const height = this.trackHeight;

        const canvas = this.trackCanvas?.nativeElement as HTMLCanvasElement;
        const hiddenCanvas = this.hiddenCanvas?.nativeElement as HTMLCanvasElement;

        this._canvasContext = canvas.getContext('2d')!;
        const hiddenCtx = hiddenCanvas.getContext('2d')!;

        canvas.width = width;
        canvas.height = height;

        hiddenCanvas.width = width;
        hiddenCanvas.height = height;

        this._clearCanvas();

        (this.audioFile?.nativeElement as HTMLInputElement)?.addEventListener('change', async (event) => {
            const file = (event.target as HTMLInputElement)?.files?.[0];

            if (!file) {
                return;
            }

            this.currentFile = file;

            const url = URL.createObjectURL(file);
            this.audio.src = url;

            const audioContext = new AudioContext();

            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0);

            this.fileSelected.emit({ file, data: channelData });

            const reduced = this._downSample(channelData).filter(r => !!r);

            const max = Math.max(...reduced.map(d => Math.abs(d)));
            const maxRatio = height / max;

            for (let i = 0; i < reduced.length; i++) {
                const canvasValue = Math.abs(reduced[i]) * maxRatio;
                this._drawSegment(i, (height - canvasValue) / 2, 1, canvasValue);
            }

            hiddenCtx.drawImage(canvas, 0, 0);

            // Draw bar
            this.drawingBar = setInterval(() => {
                this._resetCanvas();
                this._drawSegment(this._timeToTrack(this.audio.currentTime), 0, 1, max * maxRatio, '#ff0000');
            }, 1 / 15);
        });
    }

    private _timeToTrack(time: number) {
        return time * (this.trackWidth || 1) / this.audio.duration;
    }

    private _trackToTime(track: number) {}

    toggleAudio() {
        if (!this.audio.src) {
            return;
        }

        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    }

    stopAudio() {
        if (!this.audio.src) {
            return;
        }

        this.audio.pause();
        this.audio.currentTime = 0;
    }

    private _pixelToNumber(p: string) {
        return +(p.split('p')[0]);
    }

    selectAudio() {
        (this.audioFile?.nativeElement as HTMLInputElement)?.click();
    }

    private _getProperty(p: string) {
        return getComputedStyle(document.documentElement).getPropertyValue('--' + p);
    }

    private _clearCanvas(color = this._getProperty('dark-' + this.color)) {
        this._canvasContext!.fillStyle = color!;
        this._canvasContext!.fillRect(0, 0, this.trackWidth || 0, this.trackHeight || 0);
    }

    private _resetCanvas() {
        this._canvasContext?.drawImage(this.hiddenCanvas?.nativeElement as HTMLCanvasElement, 0, 0);
    }

    private _drawSegment(x: number, y: number, w: number, h: number, color = this._getProperty(this.color)) {
        this._canvasContext!.fillStyle = color!;
        this._canvasContext!.fillRect(x, y, w, h);
    }

    private _downSample(channelData: Float32Array<ArrayBuffer>, targetSize = this.trackWidth) {
        const result = [];
        const blockSize = channelData.length / (targetSize || 1);

        for (let i = 0; i < (targetSize || 0); i++) {
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