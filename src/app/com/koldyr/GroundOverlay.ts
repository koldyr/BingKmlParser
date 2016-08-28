namespace com.koldyr {

    export interface IGroundOverlayOptions extends Microsoft.Maps.ICustomOverlayOptions {
        name: string;
        bounds: Microsoft.Maps.LocationRect;
        image: string;
        rotate?: string;
    }

    /**
     *  Bing representation for KML GroundOverlay.
     *  @see <a href="https://developers.google.com/kml/documentation/kmlreference#groundoverlay">KML GroundOverlay</a>
     *  @see <a href="https://msdn.microsoft.com/en-us/library/mt762871.aspx">Bing CustomOverlay</a>
     *
     */
    export class GroundOverlay extends Microsoft.Maps.CustomOverlay {

        private options: IGroundOverlayOptions;
        private img: HTMLImageElement;

        constructor(options: IGroundOverlayOptions) {
            super(options);
            this.options = options;
        }

        public onAdd(): void {
            this.img = document.createElement('img');
            this.img.src = this.options.image;
            this.img.style.width = '100%';
            this.img.style.height = '100%';
            this.img.style.position = 'absolute';
            if (this.options.rotate) {
                const transform: string = `rotate(${this.options.rotate}deg)`;
                const style: any = this.img.style;
                style['-webkit-transform'] = transform;
                style['-moz-transform'] = transform;
                style['-ms-transform'] = transform;
                style['-o-transform'] = transform;
                style['transform'] = transform;
            }
            this.setHtmlElement(this.img);
        }

        public onRemove(): void {
            this.setHtmlElement(null);
        }

        public onLoad(): void {
            this.repositionOverlay();

            Microsoft.Maps.Events.addHandler(this._map, 'viewchange', () => this.repositionOverlay());
        }

        private repositionOverlay(): void {
            const topLeft: Microsoft.Maps.Point = <Microsoft.Maps.Point>this._map.tryLocationToPixel(this.options.bounds.getNorthwest(), Microsoft.Maps.PixelReference.control);
            const bottomRight: Microsoft.Maps.Point = <Microsoft.Maps.Point>this._map.tryLocationToPixel(this.options.bounds.getSoutheast(), Microsoft.Maps.PixelReference.control);

            this.img.style.left = topLeft.x + 'px';
            this.img.style.top = topLeft.y + 'px';
            this.img.style.width = (bottomRight.x - topLeft.x) + 'px';
            this.img.style.height = (bottomRight.y - topLeft.y) + 'px';
        }
    }
}
