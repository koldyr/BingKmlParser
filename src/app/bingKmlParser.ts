namespace com.koldyr {

    interface IStyleMap {
        normal: any;
        highlight: any;
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
                const vertices: Array<Microsoft.Maps.Location> = this.parseVertices(coordinates.html());

                let pushpinOptions: Microsoft.Maps.IPushpinOptions = {icon: BingKmlParser.ICON_URL, anchor: new Microsoft.Maps.Point(12, 39)};

                let mapped: IStyleMap;
                if (placemarkDom) {
                    const styleUrl = placemarkDom.find('styleUrl');
                    if (styleUrl.length > 0) {
                        const styleName: string = styleUrl.html().substr(1);

                        pushpinOptions = this.styleMap[styleName];

                        if (pushpinOptions) {
                            mapped = <IStyleMap>pushpinOptions;
                        } else {
                            pushpinOptions = this.styles[styleName];
                        }
                    } else {
                        const style = placemarkDom.find('Style');
                        pushpinOptions = this.parseStyle(style);
                    }

                    const name = placemarkDom.find('name');
                    if (name.length > 0) {
                        console.log(name.html());
                        pushpinOptions.title = name.html();
                    }
                }

                let pushpin: Microsoft.Maps.Pushpin;
                if (mapped) {
                    pushpin = new Microsoft.Maps.Pushpin(vertices[0], mapped.normal);
                    this.addMappedStyle(pushpin, mapped);
                } else {
                    pushpin = new Microsoft.Maps.Pushpin(vertices[0], pushpinOptions);
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

                let lineOptions: Microsoft.Maps.IPolylineOptions = {
                    strokeColor: 'black', strokeThickness: 1
                };

                let mapped: IStyleMap;

                if (placemarkDom) {
                    const styleUrl = placemarkDom.find('styleUrl');
                    if (styleUrl.length > 0) {
                        const styleName: string = styleUrl.html().substr(1);
                        lineOptions = this.styleMap[styleName];
                        if (lineOptions) {
                            mapped = <IStyleMap>lineOptions;
                        } else {
                            lineOptions = this.styles[styleName];
                        }
                    } else {
                        const style = placemarkDom.find('Style');
                        lineOptions = this.parseStyle(style);
                    }
                }

                let polyline: Microsoft.Maps.Polyline;
                if (mapped) {
                    polyline = new Microsoft.Maps.Polyline(vertices, mapped.normal);
                    this.addMappedStyle(polyline, mapped);
                } else {
                    polyline = new Microsoft.Maps.Polyline(vertices, lineOptions);
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
                const coordinates: JQuery = polygon.find('coordinates');
                const vertices: Array<Microsoft.Maps.Location> = this.parseVertices(coordinates.html());
                let polygonOptions: Microsoft.Maps.IPolygonOptions = {
                    fillColor: null,
                    strokeColor: 'black',
                    strokeThickness: 1
                };

                let mapped: IStyleMap;
                if (placemarkDom) {
                    const styleUrl = placemarkDom.find('styleUrl');
                    if (styleUrl.length > 0) {
                        const styleName: string = styleUrl.html().substr(1);
                        polygonOptions = this.styleMap[styleName];
                        if (polygonOptions) {
                            mapped = <IStyleMap>polygonOptions;
                        } else {
                            polygonOptions = this.styles[styleName];
                        }
                    } else {
                        const style = placemarkDom.find('Style');
                        polygonOptions = this.parseStyle(style);
                    }
                }

                var msPolygon: Microsoft.Maps.Polygon;
                if (mapped) {
                    msPolygon = new Microsoft.Maps.Polygon(vertices, mapped.normal);
                    this.addMappedStyle(msPolygon, mapped);
                } else {
                    msPolygon = new Microsoft.Maps.Polygon(vertices, polygonOptions);
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
                const mappedStyle: IStyleMap = this.parseStyleMap(styleMapDom);
                this.styleMap[styleMapId] = mappedStyle;
            });

            console.log('Styles loaded');
        }

        private parseStyleMap(styleMapDom: JQuery): IStyleMap {
            const styles: any = {};

            const self = this;
            styleMapDom.find('Pair').each((index: number, pair: Element) => {
                const pairDom = $(pair);
                const key = pairDom.find('key').html();
                const style = pairDom.find('styleUrl').html().substr(1);
                styles[key] = self.styles[style];
            });

            return styles;
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
        };



        /**
         * public functions that are available using this object.
         */
        public parse(kmlXml: Element): Array<Microsoft.Maps.IPrimitive> {
            const kmlContent: Array<Microsoft.Maps.IPrimitive> = [];

            const kmlDom = $(kmlXml);
            this.parseStyles(kmlDom);

            kmlDom.find('Placemark').each((index: number, placemarkXml: Element) => {
                const placemarkGeometries: Array<Microsoft.Maps.IPrimitive> = this.parsePlacemark(placemarkXml);
                if (placemarkGeometries) {
                    $.each(placemarkGeometries, (j: number, item: Microsoft.Maps.IPrimitive) => {
                        kmlContent.push(item);
                    });
                }
            });

            console.log('Geometry loaded');

            return kmlContent;
        }
    }
}
