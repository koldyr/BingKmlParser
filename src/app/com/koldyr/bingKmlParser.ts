namespace com.koldyr {

    export interface IBingKmlResult {
        geometries: Array<Microsoft.Maps.IPrimitive>;
        overlays: Array<Microsoft.Maps.CustomOverlay>;
    }

    interface IStyleMap {
        normal: any;
        highlight: any;
    }

    interface IStyleDTO {
        styleMap?: IStyleMap;
        options?: Microsoft.Maps.IPushpinOptions | Microsoft.Maps.IPolylineOptions | Microsoft.Maps.IPolygonOptions;
    }

    export interface IGroundOverlayOptions extends Microsoft.Maps.ICustomOverlayOptions {
        name: string;
        bounds: Microsoft.Maps.LocationRect;
        image: string;
        rotate?: string;
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

    export class BingKmlParser {

        static ICON_URL: string = 'https://www.bingmapsportal.com/Content/images/poi_custom.png';

        private styles: any = {};

        private styleMap: any = {};

        /**
         * @param placemarkXml
         * @returns {Array}
         */
        private parsePlacemark(placemarkXml: Element): Array<Microsoft.Maps.IPrimitive> {
            const placemarkDom: JQuery = $(placemarkXml);

            const geometries: Array<Microsoft.Maps.IPrimitive> = [];

            const pushpins: Microsoft.Maps.Pushpin = this.parsePushpin(placemarkDom);
            if (pushpins) {
                geometries.push(pushpins);
            }

            const lines: Microsoft.Maps.Polyline = this.parseLine(placemarkDom);
            if (lines) {
                geometries.push(lines);
            }

            const polygons: Microsoft.Maps.Polygon = this.parsePolygon(placemarkDom);
            if (polygons) {
                geometries.push(polygons);
            }

            const multiGeometries: Array<Microsoft.Maps.IPrimitive> = this.parseMultiGeometry(placemarkDom);
            if (multiGeometries) {
                $.each(multiGeometries, (index: number, item: Microsoft.Maps.IPrimitive) => {
                    geometries.push(item);
                });
            }

            return geometries;
        }

        private parsePushpin(placemarkDom: JQuery, pointDom?: JQuery): Microsoft.Maps.Pushpin {
            let point: JQuery;

            try {
                if (pointDom) {
                    point = pointDom;
                } else {
                    point = placemarkDom.find('Point');
                    if (point.length === 0) {
                        return null;
                    }
                }

                const coordinates: JQuery = point.find('coordinates');
                const vertices: Array<Microsoft.Maps.Location> = this.parseVertices(coordinates.text());

                let styleDTO: IStyleDTO = {
                    options: {icon: BingKmlParser.ICON_URL, anchor: new Microsoft.Maps.Point(12, 39)}
                };
                if (placemarkDom) {
                    styleDTO = this.getOptions(placemarkDom, styleDTO.options);
                }

                let pushpin: Microsoft.Maps.Pushpin;
                if (styleDTO.styleMap) {
                    pushpin = new Microsoft.Maps.Pushpin(vertices[0], styleDTO.styleMap.normal);
                    this.addMappedStyle(pushpin, styleDTO.styleMap);
                } else {
                    pushpin = new Microsoft.Maps.Pushpin(vertices[0], styleDTO.options);
                }
                return pushpin;
            } catch (e) {
                console.log(e);
            }
        }

        private parseLine(placemarkDom: JQuery, lineDom?: JQuery): Microsoft.Maps.Polyline {
            try {
                let line: JQuery;
                if (lineDom) {
                    line = lineDom;
                } else {
                    line = placemarkDom.find('LineString');
                    if (line.length === 0) {
                        return null;
                    }
                }

                const coordinates: JQuery = line.find('coordinates');
                const vertices: Array<Microsoft.Maps.Location> = this.parseVertices(coordinates.html());

                let styleDTO: IStyleDTO = {
                    options: {
                        strokeColor: 'black', strokeThickness: 1
                    }
                };
                if (placemarkDom) {
                    styleDTO = this.getOptions(placemarkDom, styleDTO.options);
                }

                let polyline: Microsoft.Maps.Polyline;
                if (styleDTO.styleMap) {
                    polyline = new Microsoft.Maps.Polyline(vertices, styleDTO.styleMap.normal);
                    this.addMappedStyle(polyline, styleDTO.styleMap);
                } else {
                    polyline = new Microsoft.Maps.Polyline(vertices, styleDTO.options);
                }
                return polyline;
            } catch (e) {
                console.log(e);
            }
        }

        private parsePolygon(placemarkDom: JQuery, polygonDom?: JQuery): Microsoft.Maps.Polygon {
            try {
                let polygon: JQuery;
                if (polygonDom) {
                    polygon = polygonDom;
                } else {
                    polygon = placemarkDom.find('Polygon');
                    if (polygon.length === 0) {
                        return null;
                    }
                }

                let vertices: Array<any> = [];

                const outerCoordinates: JQuery = polygon.find('outerBoundaryIs coordinates');
                const outerVertices: Array<Microsoft.Maps.Location> = this.parseVertices(outerCoordinates.html());

                const innerCoordinates: JQuery = polygon.find('innerBoundaryIs coordinates');
                if (innerCoordinates.length > 0) {
                    const innerVertices: Array<Microsoft.Maps.Location> = this.parseVertices(innerCoordinates.html());
                    vertices.push(outerVertices);
                    vertices.push(innerVertices);
                } else {
                    vertices = outerVertices;
                }

                let styleDTO: IStyleDTO = {
                    options: {
                        strokeColor: 'black',
                        strokeThickness: 1
                    }
                };

                if (placemarkDom) {
                    styleDTO = this.getOptions(placemarkDom, styleDTO.options);
                }

                let msPolygon: Microsoft.Maps.Polygon;
                if (styleDTO.styleMap) {
                    msPolygon = new Microsoft.Maps.Polygon(vertices, styleDTO.styleMap.normal);
                    this.addMappedStyle(msPolygon, styleDTO.styleMap);
                } else {
                    msPolygon = new Microsoft.Maps.Polygon(vertices, styleDTO.options);
                }
                return msPolygon;
            } catch (e) {
                console.log(e);
            }
        }

        private parseMultiGeometry(placemarkDom: JQuery): Array<Microsoft.Maps.IPrimitive> {
            const multiGeometryDom: JQuery = placemarkDom.find('MultiGeometry');
            if (multiGeometryDom.length === 0) {
                return null;
            }

            const geometries: Array<Microsoft.Maps.IPrimitive> = [];
            multiGeometryDom.find('Point').each((index: number, item: Element) => {
                geometries.push(this.parsePushpin(null, $(item)));
            });

            multiGeometryDom.find('LineString').each((index: number, item: Element) => {
                geometries.push(this.parseLine(null, $(item)));
            });

            multiGeometryDom.find('Polygon').each((index: number, item: Element) => {
                geometries.push(this.parsePolygon(null, $(item)));
            });

            return geometries;
        }

        private parseGroundOverlay(groundOverlayXml: Element): Microsoft.Maps.CustomOverlay {
            const groundOverlayDom: JQuery = $(groundOverlayXml);

            const name: string = groundOverlayDom.find('name').text();
            const iconUrl: string = groundOverlayDom.find('Icon href').text();

            const latLonBox: JQuery = groundOverlayDom.find('LatLonBox');
            const north: string = latLonBox.find('north').text();
            const south: string = latLonBox.find('south').text();
            const east: string = latLonBox.find('east').text();
            const west: string = latLonBox.find('west').text();

            const rotationElem = latLonBox.find('rotation');
            let rotation: string;
            if (rotationElem.length > 0) {
                rotation = rotationElem.text();
            }

            const bounds = Microsoft.Maps.LocationRect.fromEdges(parseFloat(north), parseFloat(west), parseFloat(south), parseFloat(east));
            return new GroundOverlay({
                name: name,
                image: iconUrl,
                bounds: bounds,
                rotate: rotation,
                beneathLabels: true
            });
        }

        private parseVertices(coordinateString: string): Array<Microsoft.Maps.Location> {
            const coordinates: Array<string> = $.trim(coordinateString).split(' ');
            const msLocations: Array<Microsoft.Maps.Location> = [];

            for (let i = 0; i < coordinates.length; i++) {
                const coordinate = $.trim(coordinates[i]);

                if (coordinate.length === 0) {
                    continue;
                }

                const xyz: Array<string> = coordinate.split(',');
                const location = new Microsoft.Maps.Location(xyz[1], xyz[0]);
                msLocations.push(location);
            }

            return msLocations;
        }

        /**
         * Parse a KML color string that comes as a abgr hex string.
         * @param kmlColorString An abgr hex string
         * @return {Microsoft.Maps.Color}
         * @private
         */
        private parseColor(kmlColorString: string): Microsoft.Maps.Color {
            // Our KML files have color strings as hex in abgr order. Here we swap them to argb order.
            const hexArray = [kmlColorString.charAt(0) + kmlColorString.charAt(1),
                kmlColorString.charAt(6) + kmlColorString.charAt(7),
                kmlColorString.charAt(4) + kmlColorString.charAt(5),
                kmlColorString.charAt(2) + kmlColorString.charAt(3)];

            const argbArray: number[] = [];
            for (let i = 0; i < hexArray.length; i++) {
                argbArray.push(parseInt(hexArray[i], 16));
            }

            return new Microsoft.Maps.Color(argbArray[0], argbArray[1], argbArray[2], argbArray[3]);
        }

        private parseStyle(styleDom: JQuery): Microsoft.Maps.IPrimitiveOptions {
            const styleOptions: any = {};

            const polyStyle = styleDom.find('PolyStyle');
            if (polyStyle.length > 0) {
                const color = polyStyle.find('color');
                if (color.length > 0) {
                    styleOptions.fillColor = this.parseColor(color.html());
                }
            }

            const lineStyle = styleDom.find('LineStyle');
            if (lineStyle.length > 0) {
                const color = lineStyle.find('color');
                if (color.length > 0) {
                    styleOptions.strokeColor = this.parseColor(color.html());
                }
                const width = lineStyle.find('width');
                if (width.length > 0) {
                    styleOptions.strokeThickness = parseInt(width.html(), 10);
                }
            }

            const iconStyle = styleDom.find('IconStyle');
            if (iconStyle.length > 0) {
                const color = iconStyle.find('color');
                if (color.length > 0) {
                    styleOptions.color = color.html();
                }

                const icon = iconStyle.find('Icon');
                if (icon.length > 0) {
                    styleOptions.icon = icon.find('href').html();
                }

            }
            return styleOptions;
        }

        /**
         * Create a map of style names to styles (PolygonOptions - http://msdn.microsoft.com/en-us/library/gg427596.aspx).
         * @param kmlDom
         * @private
         */
        private parseStyles(kmlDom: JQuery): void {
            kmlDom.find('Style').each((index: number, styleXml: Element) => {
                const styleDom = $(styleXml);
                const styleId: string = styleDom.attr('id');
                this.styles[styleId] = this.parseStyle(styleDom);
            });

            kmlDom.find('StyleMap').each((index: number, styleMapXml: Element) => {
                const styleMapDom = $(styleMapXml);
                const styleMapId = styleMapDom.attr('id');
                this.styleMap[styleMapId] = this.parseStyleMap(styleMapDom);
            });

            console.log('Styles loaded');
        }

        private parseStyleMap(styleMapDom: JQuery): IStyleMap {
            const styleMap: any = {};

            const self = this;
            styleMapDom.find('Pair').each((index: number, pair: Element) => {
                const pairDom = $(pair);
                const key = pairDom.find('key').html();
                const style = pairDom.find('styleUrl').html().substr(1);
                styleMap[key] = self.styles[style];
            });

            return styleMap;
        }

        private addMappedStyle(geometry: Microsoft.Maps.IPrimitive, mapped: IStyleMap): void {
            if (!geometry.metadata) {
                geometry.metadata = {};
            }
            geometry.metadata.styles = mapped;

            Microsoft.Maps.Events.addHandler(geometry, 'mouseover', (event: Microsoft.Maps.IMouseEventArgs) => {
                const target: Microsoft.Maps.IPrimitive = <Microsoft.Maps.IPrimitive>event.target;
                target.setOptions(<Microsoft.Maps.IPrimitiveOptions>target.metadata.styles.highlight);
            });
            Microsoft.Maps.Events.addHandler(geometry, 'mouseout', (event: Microsoft.Maps.IMouseEventArgs) => {
                const target: Microsoft.Maps.IPrimitive = <Microsoft.Maps.IPrimitive>event.target;
                target.setOptions(<Microsoft.Maps.IPrimitiveOptions>target.metadata.styles.normal);
            });
        }

        private getOptions(placemarkDom: JQuery, defaultOptions: any): IStyleDTO {
            let styleMap: IStyleMap;

            const styleUrlDom: JQuery = placemarkDom.find('styleUrl');
            if (styleUrlDom.length > 0) {
                const styleUrl = styleUrlDom.html();
                let styleName = this.getStyleName(styleUrl);

                if (this.isExternalStyle(styleUrl)) {
                    this.loadExternalStyle(styleUrl);
                }

                defaultOptions = this.styleMap[styleName];

                if (defaultOptions) {
                    styleMap = <IStyleMap>defaultOptions;
                } else {
                    defaultOptions = this.styles[styleName];
                }
            } else {
                const style = placemarkDom.find('Style');
                if (style.length > 0) {
                    defaultOptions = this.parseStyle(style);
                }
            }

            const name = placemarkDom.find('name');
            if (name.length > 0) {
                defaultOptions.title = name.html();
            }
            return {options: defaultOptions, styleMap: styleMap};
        }

        private getStyleName(styleUrl: string): string {
            const index = styleUrl.lastIndexOf('#');
            return styleUrl.substr(index + 1);
        }

        private isExternalStyle(styleUrl: string): boolean {
            const index = styleUrl.lastIndexOf('#');
            return index > 0;
        }

        private loadExternalStyle(styleUrl: string): void {
            const styleName = this.getStyleName(styleUrl);
            const style = this.styles[styleName];
            if (style) {
                return;
            }

            const index = styleUrl.lastIndexOf('#');
            const externalKmlUrl = styleUrl.substring(0, index);

            $.ajax({
                url: externalKmlUrl,
                async: false
            }).then(
                (data: any) => {
                    const kmlContent = $(data);
                    const externalStyles: JQuery = kmlContent.find('Style');
                    for (let i = 0; i < externalStyles.length; i++) {
                        const styleDom = $(externalStyles[i]);
                        if (styleDom.attr('id') === styleName) {
                            this.styles[styleName] = this.parseStyle(styleDom);
                            break;
                        }
                    }
                }
            );
        }

        /**
         * public functions that are available using this object.
         */
        public parse(kmlXml: Element): IBingKmlResult {
            const kmlDom = $(kmlXml);

            this.parseStyles(kmlDom);

            const kmlContent: Array<Microsoft.Maps.IPrimitive> = [];
            kmlDom.find('Placemark').each((index: number, placemarkXml: Element) => {
                const placemarkGeometries: Array<Microsoft.Maps.IPrimitive> = this.parsePlacemark(placemarkXml);
                if (placemarkGeometries) {
                    $.each(placemarkGeometries, (j: number, item: Microsoft.Maps.IPrimitive) => {
                        kmlContent.push(item);
                    });
                }
            });

            console.log('Geometry loaded');

            const kmlOverlays: Microsoft.Maps.CustomOverlay[] = [];
            kmlDom.find('GroundOverlay').each((index: number, groundOverlayXml: Element) => {
                const overlay: Microsoft.Maps.CustomOverlay = this.parseGroundOverlay(groundOverlayXml);
                if (overlay) {
                    kmlOverlays.push(overlay);
                }
            });

            console.log('Overlays loaded');

            return {
                geometries: kmlContent,
                overlays: kmlOverlays
            };
        }
    }

    Microsoft.Maps.moduleLoaded('BingKmlParser');
}
