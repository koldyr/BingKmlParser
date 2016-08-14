namespace com.koldyr {

    import IPolygonOptions = Microsoft.Maps.IPolygonOptions;
    import IPrimitive = Microsoft.Maps.IPrimitive;
    import Pushpin = Microsoft.Maps.Pushpin;
    import Polygon = Microsoft.Maps.Polygon;
    import Color = Microsoft.Maps.Color;
    import Polyline = Microsoft.Maps.Polyline;
    import IPolylineOptions = Microsoft.Maps.IPolylineOptions;
    import IPushpinOptions = Microsoft.Maps.IPushpinOptions;

    export class BingKmlParser {

        static ICON_URL: string = 'https://www.bingmapsportal.com/Content/images/poi_custom.png';

        private styles: Object = {};

        private styleMap: Object = {};

        /**
         * @param placemarkXml
         * @returns {Array}
         */
        private parsePlacemark(placemarkXml: Element): Array<IPrimitive> {
            const placemarkDom: JQuery = $(placemarkXml);

            const geometries: Array<IPrimitive> = [];

            const pushpins: Pushpin = this.parsePushpin(placemarkDom);
            if (pushpins) {
                geometries.push(pushpins);
            }

            var lines: Polyline = this.parseLine(placemarkDom);
            if (lines) {
                geometries.push(lines);
            }

            var polygons: Polygon = this.parsePolygon(placemarkDom);
            if (polygons) {
                geometries.push(polygons);
            }

            var multiGeometries: Array<IPrimitive> = this.parseMultiGeometry(placemarkDom);
            if (multiGeometries) {
                $.each(multiGeometries, (index: number, item: IPrimitive) => {
                    geometries.push(item);
                });
            }

            return geometries;
        }

        private parsePushpin(placemarkDom: JQuery, pointDom: JQuery): Pushpin {
            var point: JQuery;

            try {
                if (pointDom) {
                    point = pointDom
                } else {
                    point = placemarkDom.find('Point');
                    if (point.length === 0) {
                        return null;
                    }
                }

                var coordinates: JQuery = point.find('coordinates');
                var vertices: Array<Location> = this.parseVertices(coordinates.html());

                var pushpinOptions: IPushpinOptions = {icon: BingKmlParser.ICON_URL, anchor: new Microsoft.Maps.Point(12, 39)};

                if (placemarkDom) {
                    const styleUrl = placemarkDom.find('styleUrl');
                    if (styleUrl.length > 0) {
                        var colorName: string = styleUrl.html().substr(1);
                        pushpinOptions = this.styles[colorName];
                    } else {
                        var style = placemarkDom.find('Style');
                        pushpinOptions = this.parseStyle(style);
                    }

                    var name = placemarkDom.find('name');
                    if (name.length > 0) {
                        console.log(name.html());
                        pushpinOptions.name = name.html();
                    }
                }

                return new Microsoft.Maps.Pushpin(vertices[0], pushpinOptions);
            } catch (e) {
                console.log(e);
            }
        }

        private parseLine(placemarkDom: JQuery, lineDom: JQuery): Polyline {
            try {
                var line: JQuery;
                if (lineDom) {
                    line = lineDom
                } else {
                    line = placemarkDom.find('LineString');
                    if (line.length === 0) {
                        return null;
                    }
                }

                var coordinates: JQuery = line.find('coordinates');
                var vertices: Array<Location> = this.parseVertices(coordinates.html());

                var lineOptions: IPolylineOptions = {
                    strokeColor: 'black', strokeThickness: 1
                };

                if (placemarkDom) {
                    const styleUrl = placemarkDom.find('styleUrl');
                    if (styleUrl.length > 0) {
                        var colorName = styleUrl.html().substr(1);
                        lineOptions = this.styleMap[colorName];
                        if (!lineOptions) {
                            lineOptions = this.styles[colorName];
                        }
                    } else {
                        var style = placemarkDom.find('Style');
                        lineOptions = this.parseStyle(style);
                    }
                }

                return new Microsoft.Maps.Polyline(vertices, lineOptions);
            } catch (e) {
                console.log(e);
            }
        }

        private parsePolygon(placemarkDom, polygonDom): Polygon {
            try {
                var polygon: JQuery;
                if (polygonDom) {
                    polygon = polygonDom
                } else {
                    polygon = placemarkDom.find('Polygon');
                    if (polygon.length === 0) {
                        return null;
                    }
                }
                var coordinates: JQuery = polygon.find('coordinates');
                var vertices: Array<string> = this.parseVertices(coordinates.html());
                var polygonOptions: IPolygonOptions = {
                    fillColor: null,
                    strokeColor: 'black',
                    strokeThickness: 1
                };

                if (placemarkDom) {
                    const styleUrl = placemarkDom.find('styleUrl');
                    if (styleUrl.length > 0) {
                        var colorName = styleUrl.html().substr(1);
                        polygonOptions = this.styleMap[colorName];
                        if (!polygonOptions) {
                            polygonOptions = this.styles[colorName];
                        }
                    } else {
                        var style = placemarkDom.find('Style');
                        polygonOptions = this.parseStyle(style);
                    }
                }

                return new Microsoft.Maps.Polygon(vertices, polygonOptions);
            } catch (e) {
                console.log(e);
            }
        }

        private parseMultiGeometry(placemarkDom: JQuery): Array<IPrimitive> {
            var multiGeometryDom: JQuery = placemarkDom.find('MultiGeometry');
            if (multiGeometryDom.length === 0) {
                return null;
            }

            var geometries: Array<IPrimitive> = [];
            multiGeometryDom.find('Point').each((index: number, item: Element) => {
                geometries.push(this.parsePushpin(null, item));
            });

            multiGeometryDom.find('LineString').each((index: number, item: Element) => {
                geometries.push(this.parseLine(null, item));
            });

            multiGeometryDom.find('Polygon').each((index: number, item: Element) => {
                geometries.push(this.parsePolygon(null, item));
            });

            return geometries;
        }

        private parseVertices(coordinateString: string): Array<Location> {
            coordinateString = $.trim(coordinateString);
            var coordinates: Array<string> = coordinateString.split(' ');
            var msLocations: Array<Location> = [];

            for (var i = 0; i < coordinates.length; i++) {
                var coordinate = $.trim(coordinates[i]);

                if (coordinate.length === 0) {
                    continue;
                }

                var xyz: Array<string> = coordinate.split(',');
                var location = new Microsoft.Maps.Location(xyz[1], xyz[0], xyz[2]);
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
        private parseColor(kmlColorString: string): Color {
            // Our KML files have color strings as hex in abgr order. Here we swap them to argb order.
            var hexArray = [kmlColorString.charAt(0) + kmlColorString.charAt(1),
                kmlColorString.charAt(6) + kmlColorString.charAt(7),
                kmlColorString.charAt(4) + kmlColorString.charAt(5),
                kmlColorString.charAt(2) + kmlColorString.charAt(3)];

            var argbArray = [];
            for (var i = 0; i < hexArray.length; i++) {
                argbArray.push(parseInt(hexArray[i], 16));
            }

            return new Microsoft.Maps.Color(argbArray[0], argbArray[1], argbArray[2], argbArray[3]);
        }

        private parseStyle(styleDom: JQuery): IPrimitiveOptions {
            var styleOptions: any = {};

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
                    styleOptions.strokeThickness = parseInt(width.html());
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
                var styleId: string = styleDom.attr('id');
                this.styles[styleId] = this.parseStyle(styleDom);
            });

            //kmlDom.find('StyleMap').each(function (index, styleMapXml) {
            //    const styleMapDom = $(styleMapXml);
            //    var styleMapId = styleMapDom.attr('id');
            //    var mappedStyle = styleMapDom.find('styleUrl').contents()[0].data.substr(1);
            //
            //    styleMap[styleMapId] = styles[mappedStyle];
            //});

            console.log('Styles loaded');
        }

        /**
         * public functions that are available using this object.
         */
        public parse(kmlXml: Element): Array<IPrimitive> {
            const kmlContent: Array<IPrimitive> = [];

            const kmlDom = $(kmlXml);
            this.parseStyles(kmlDom);

            kmlDom.find('Placemark').each((index: number, placemarkXml: Element) => {
                const placemarkGeometries: Array<IPrimitive> = this.parsePlacemark(placemarkXml);
                if (placemarkGeometries) {
                    $.each(placemarkGeometries, (index: number, item: IPrimitive) => {
                        kmlContent.push(item);
                    });
                }
            });

            console.log('Geometry loaded');

            return kmlContent;
        }
    }
}
