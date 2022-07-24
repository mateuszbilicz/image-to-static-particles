import {Component, OnInit, ViewChild} from '@angular/core';
import {ImageToStaticParticles} from './image-to-static-particles.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  itsp: ImageToStaticParticles = null;
  settings: any;
  processing: any = {
    file: null,
    isProcessing: false,
    stage: 0,
    progress: 0,
    reamingObjects: 0
  }
  stages: string[] = ['Getting pixels', 'Creating dots', 'Creating lines', 'Rendering image'];
  hasError: boolean = false;
  @ViewChild('canvas', {static: true}) canvas: HTMLCanvasElement;
  constructor() {

  }
  ngOnInit() {
    if (!this.canvas.hasOwnProperty('nativeElement')) return;
    this.itsp = new ImageToStaticParticles(this.canvas['nativeElement']);
    this.itsp.onstatechange = (progress: number, stage: number, reaming: number) => {
      this.processing.progress = Math.floor(progress);
      this.processing.stage = stage;
      this.processing.reaming = reaming;
    }
    this.itsp.oncomplete = () => {
      this.processing.isProcessing = false;
      let scale = (this.itsp.canvas.width / 500);
      this.itsp.canvas.style.width = this.itsp.canvas.width / scale + 'px';
      this.itsp.canvas.style.height = this.itsp.canvas.height / scale + 'px';
      this.itsp.canvas.style.display = 'block';
    }
    this.settings = [
      {
        type: 'slider',
        label: 'Density',
        valueName: 'density',
        min: 1,
        max: 50,
        step: 1,
        default: 10
      },{
        type: 'slider',
        label: 'Randomize pixel positions',
        valueName: 'randomizePositions',
        min: 0,
        max: 50,
        step: 0.1,
        default: 0
      }, {
        type: 'checkbox',
        label: 'Generate dots',
        valueName: 'particleDots',
        default: true
      }, {
        type: 'slider',
        label: 'Dot size',
        valueName: 'particleDotsSize',
        min: 0.1,
        max: 50,
        step: 0.1,
        default: 1,
        parent: 'particleDots'
      }, {
        type: 'checkbox',
        label: 'Connect dots',
        valueName: 'particleConnections',
        default: true
      }, {
        type: 'slider',
        label: 'Connect distance',
        valueName: 'particleConnectionDistance',
        min: 0.2,
        max: 50,
        step: 0.1,
        default: 1,
        parent: 'particleConnections'
      }, {
        type: 'slider',
        label: 'Connections limit',
        valueName: 'particleConnectionLimit',
        min: 1,
        max: 32,
        step: 1,
        default: 3,
        parent: 'particleConnections'
      }, {
        type: 'slider',
        label: 'Line width',
        valueName: 'particleConnectionLineWidth',
        min: 0.1,
        max: 32,
        step: 0.1,
        default: 1,
        parent: 'particleConnections'
      }, {
        type: 'checkbox',
        label: 'Mix connected point colors',
        valueName: 'particleConnectionMixColors',
        default: true,
        parent: 'particleConnections'
      }, {
        type: 'one-of',
        label: 'Connecting by',
        valueName: 'particleConnectionsByDistance',
        default: true,
        optionA: 'distance',
        optionB: 'random',
        parent: 'particleConnections'
      }
    ];
  }

  onFileSelect(ev: Event) {
    if (ev.target['files'].length === 0) return;
    this.processing.file = ev.target['files'][0];
  }

  startProcessing() {
    this.processing.isProcessing = true;
    this.itsp.canvas.style.display = 'none';
    let reader = new FileReader();
    reader.readAsDataURL(this.processing.file);
    reader.onload = () => {
      this.itsp.render(reader.result);
    }
    reader.onerror = err => {
      console.error(err);
      this.hasError = true;
    }
    this.itsp.render(this.processing.file);
  }
}
