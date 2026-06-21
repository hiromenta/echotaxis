import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from "@angular/core";
import { SliderComponent } from "../slider/slider.component";

@Component({
    selector: 'my-track',
    templateUrl: './track.component.html',
    styleUrls: ['./track.component.scss'],
    standalone: true,
    imports: [SliderComponent]
})
export class TrackComponent implements AfterViewInit {

    @ViewChild('trackCanvas') trackCanvas?: ElementRef;
    @ViewChild('hiddenCanvas') hiddenCanvas?: ElementRef;
    @ViewChild('audioFile') audioFile?: ElementRef;

    @Output() fileSelected: EventEmitter<{ file: File; data: Float32Array<ArrayBuffer> }> = new EventEmitter();
    @Output() audioPlayed: EventEmitter<void> = new EventEmitter();

    @Input() color: 'blue' | 'yellow' | 'green' = 'blue';
    @Input() pausePlayer?: EventEmitter<void>;
    @Input() readonly = false;

    trackWidth?: number;
    trackHeight?: number;

    audio: HTMLAudioElement = new Audio();

    drawingBar: any;

    currentFile?: File;
    channelData?: Float32Array<ArrayBuffer>;

    maxHeight = 0;

    private _canvas?: HTMLCanvasElement;
    private _hiddenCanvas?: HTMLCanvasElement;

    private _canvasContext?: CanvasRenderingContext2D;
    private _hiddenContext?: CanvasRenderingContext2D;

    constructor() {}

    ngAfterViewInit(): void {
        this._setupCanvas();

        (this.audioFile?.nativeElement as HTMLInputElement)?.addEventListener('change', async (event) => {
            const file = (event.target as HTMLInputElement)?.files?.[0];

            if (!file) {
                return;
            }

            this.currentFile = file;

            const url = URL.createObjectURL(file);
            this.audio.src = url;

            this.pausePlayer?.subscribe(() => {
                this.audio.pause();
            });

            const audioContext = new AudioContext();

            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            this.channelData = audioBuffer.getChannelData(0);

            this.fileSelected.emit({ file, data: this.channelData });

            this._drawCanvas();
        });
    }

    deleteFile() {
        this.currentFile = undefined;
        this.stopAudio();
        this._stopDrawingBar();
        this._clearCanvas();
    }

    toggleMute() {
        this.audio.muted = !this.audio.muted;
    }

    isMuted() {
        return this.audio.muted;
    }

    currentVolume() {
        return this.audio.volume * 100;
    }

    setVolume(event: Event | number) {
        if (typeof event === 'number') {
            this.audio.volume = event / 100;
        } else {
            this.audio.volume = (+((event.target as HTMLInputElement)?.value || 1) / 100);
        }
    }

    private _setupCanvas() {
        this.trackWidth = this._pixelToNumber(getComputedStyle(this.trackCanvas?.nativeElement).getPropertyValue('width'));
        this.trackHeight = this._pixelToNumber(getComputedStyle(this.trackCanvas?.nativeElement).getPropertyValue('height'));

        const width = this.trackWidth;
        const height = this.trackHeight;

        this._canvas = this.trackCanvas?.nativeElement as HTMLCanvasElement;
        this._hiddenCanvas = this.hiddenCanvas?.nativeElement as HTMLCanvasElement;

        this._canvasContext = this._canvas.getContext('2d')!;
        this._hiddenContext = this._hiddenCanvas.getContext('2d')!;

        this._canvas.width = width;
        this._canvas.height = height;

        this._hiddenCanvas.width = width;
        this._hiddenCanvas.height = height;

        this._clearCanvas();
    }

    private _drawCanvas() {
        const reduced = this._downSample(this.channelData!).filter(r => !!r);

        const max = Math.max(...reduced.map(d => Math.abs(d)));
        const maxRatio = this._getTrackHeight() / max;

        this.maxHeight = max * maxRatio;

        for (let i = 0; i < reduced.length; i++) {
            const canvasValue = Math.abs(reduced[i]) * maxRatio;
            this._drawSegment(i, (this._getTrackHeight() - canvasValue) / 2, 1, canvasValue);
        }

        this._hiddenContext?.drawImage(this._canvas!, 0, 0);

        this._startDrawingBar();
    }

    @HostListener('window:resize', [])
    onResize() {
        this._setupCanvas();
        this._drawCanvas();
    }

    private _startDrawingBar() {
        this._stopDrawingBar();

        this.drawingBar = setInterval(() => {
            this._resetCanvas();
            this._drawSegment(this._timeToTrack(this.audio.currentTime), 0, 1, this.maxHeight, '#ff0000');
        }, 1 / 15);
    }

    private _stopDrawingBar() {
        clearInterval(this.drawingBar);
    }

    isTrackPlaying() {
        return !this.audio.paused;
    }

    jumpTime(event: MouseEvent) {
        const trackPosition = event.offsetX;
        this.audio.currentTime = this._trackToTime(trackPosition);
    }

    private _timeToTrack(time: number) {
        return time * this._getTrackWidth() / this.audio.duration;
    }

    private _trackToTime(track: number) {
        return track * this.audio.duration / this._getTrackWidth();
    }

    private _getTrackWidth() {
        return this.trackWidth || 1;
    }

    private _getTrackHeight() {
        return this.trackHeight || 1;
    }

    toggleAudio() {
        if (!this.audio.src) {
            return;
        }

        if (this.audio.paused) {
            this.audio.play();
            this.audioPlayed.next();
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
        if (this.readonly) {
            return;
        }

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
        if (!channelData) {
            return [];
        }

        const result = [];
        const blockSize = (channelData?.length || 1) / (targetSize || 1);

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