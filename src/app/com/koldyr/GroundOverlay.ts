namespace com.koldyr {

    export interface IGroundOverlayOptions extends Microsoft.Maps.ICustomOverlayOptions {
        name: string;
        bounds: Microsoft.Maps.LocationRect;
        image: string;
    }

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
            this.setHtmlElement(this.img);
        }

        public onRemove(): void {
            this.setHtmlElement(null);
        }

        public onLoad(): void {
            this.repositionOverlay();

            const self = this;
            Microsoft.Maps.Events.addHandler(this._map, 'viewchange', () => self.repositionOverlay());
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
