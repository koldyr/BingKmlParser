var com;
(function (com) {
    var koldyr;
    (function (koldyr) {
        var BingKmlParser = (function () {
            function BingKmlParser() {
                this.styles = {};
                this.styleMap = {};
            }
            /**
             * @param placemarkXml
             * @returns {Array}
             */
            BingKmlParser.prototype.parsePlacemark = function (placemarkXml) {
                var placemarkDom = $(placemarkXml);
                var geometries = [];
                var pushpins = parsePushpin(placemarkDom);
                if (pushpins) {
                    geometries.push(pushpins);
                }
                var lines = parseLine(placemarkDom);
                if (lines) {
                    geometries.push(lines);
                }
                var polygons = parsePolygon(placemarkDom);
                if (polygons) {
                    geometries.push(polygons);
                }
                var multiGeometries = parseMultiGeometry(placemarkDom);
                if (multiGeometries) {
                    $.each(multiGeometries, function (index, item) {
                        geometries.push(item);
                    });
                }
                return geometries;
            };
            BingKmlParser.prototype.parsePushpin = function (placemarkDom, pointDom) {
                var point;
                try {
                    if (pointDom) {
                        point = pointDom;
                    }
                    else {
                        point = placemarkDom.find('Point');
                        if (point.length === 0) {
                            return null;
                        }
                    }
                    var coordinates = point.find('coordinates');
                    var vertices = parseVertices(coordinates.html());
                    var pushpinOptions = { icon: ICON_URL, anchor: new Microsoft.Maps.Point(12, 39) };
                    if (placemarkDom) {
                        var styleUrl = placemarkDom.find('styleUrl');
                        if (styleUrl.length > 0) {
                            var colorName = styleUrl.html().substr(1);
                            pushpinOptions = styles[colorName];
                        }
                        else {
                            var style = placemarkDom.find('Style');
                            pushpinOptions = parsePushPinStyle(style);
                        }
                        var name = placemarkDom.find('name');
                        if (name.length > 0) {
                            console.log(name.html());
                            pushpinOptions.name = name.html();
                        }
                    }
                    return new Microsoft.Maps.Pushpin(vertices[0], pushpinOptions);
                }
                catch (e) {
                    console.log(e);
                }
            };
            BingKmlParser.prototype.parseLine = function (placemarkDom, lineDom) {
                try {
                    var line;
                    if (lineDom) {
                        line = lineDom;
                    }
                    else {
                        line = placemarkDom.find('LineString');
                        if (line.length === 0) {
                            return null;
                        }
                    }
                    var coordinates = line.find('coordinates');
                    var vertices = parseVertices(coordinates.html());
                    var lineOptions = {
                        strokeColor: 'black', strokeThickness: 1
                    };
                    if (placemarkDom) {
                        var styleUrl = placemarkDom.find('styleUrl');
                        if (styleUrl.length > 0) {
                            var colorName = styleUrl.html().substr(1);
                            lineOptions = styleMap[colorName];
                            if (!lineOptions) {
                                lineOptions = styles[colorName];
                            }
                        }
                        else {
                            var style = placemarkDom.find('Style');
                            lineOptions = parsePolylineStyle(style);
                        }
                    }
                    return new Microsoft.Maps.Polyline(vertices, lineOptions);
                }
                catch (e) {
                    console.log(e);
                }
            };
            BingKmlParser.prototype.parsePolygon = function (placemarkDom, polygonDom) {
                try {
                    var polygon;
                    if (polygonDom) {
                        polygon = polygonDom;
                    }
                    else {
                        polygon = placemarkDom.find('Polygon');
                        if (polygon.length === 0) {
                            return null;
                        }
                    }
                    var coordinates = polygon.find('coordinates');
                    var vertices = parseVertices(coordinates.html());
                    var polygonOptions = {
                        fillColor: null,
                        strokeColor: 'black',
                        strokeThickness: 1
                    };
                    if (placemarkDom) {
                        var styleUrl = placemarkDom.find('styleUrl');
                        if (styleUrl.length > 0) {
                            var colorName = styleUrl.html().substr(1);
                            polygonOptions = styleMap[colorName];
                            if (!polygonOptions) {
                                polygonOptions = styles[colorName];
                            }
                        }
                        else {
                            var style = placemarkDom.find('Style');
                            polygonOptions = parsePolygonStyle(style);
                        }
                    }
                    return new Microsoft.Maps.Polygon(vertices, polygonOptions);
                }
                catch (e) {
                    console.log(e);
                }
            };
            BingKmlParser.prototype.parseMultiGeometry = function (placemarkDom) {
                var multiGeometryDom = placemarkDom.find('MultiGeometry');
                if (multiGeometryDom.length === 0) {
                    return null;
                }
                var geometries = [];
                multiGeometryDom.find('Point').each(function (index, item) {
                    geometries.push(parsePushpin(null, item));
                });
                multiGeometryDom.find('LineString').each(function (index, item) {
                    geometries.push(parseLine(null, item));
                });
                multiGeometryDom.find('Polygon').each(function (index, item) {
                    geometries.push(parsePolygon(null, item));
                });
                return geometries;
            };
            BingKmlParser.prototype.parseVertices = function (coordinateString) {
                coordinateString = $.trim(coordinateString);
                var coordinates = coordinateString.split(' ');
                var msLocations = [];
                for (var i = 0; i < coordinates.length; i++) {
                    var coordinate = $.trim(coordinates[i]);
                    if (coordinate.length === 0) {
                        continue;
                    }
                    var xyz = coordinate.split(',');
                    var location = new Microsoft.Maps.Location(xyz[1], xyz[0], xyz[2]);
                    msLocations.push(location);
                }
                return msLocations;
            };
            /**
             * Parse a KML color string that comes as a abgr hex string.
             * @param kmlColorString An abgr hex string
             * @return {Microsoft.Maps.Color}
             * @private
             */
            BingKmlParser.prototype.parseColor = function (kmlColorString) {
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
            };
            BingKmlParser.prototype.parseStyle = function (styleDom) {
                var styleOptions = {};
                var polyStyle = styleDom.find('PolyStyle');
                if (polyStyle.length > 0) {
                    var color_1 = polyStyle.find('color');
                    if (color_1.length > 0) {
                        styleOptions.fillColor = parseColor(color_1.html());
                    }
                }
                var lineStyle = styleDom.find('LineStyle');
                if (lineStyle.length > 0) {
                    var color_2 = lineStyle.find('color');
                    if (color_2.length > 0) {
                        styleOptions.strokeColor = parseColor(color_2.html());
                    }
                    var width = lineStyle.find('width');
                    if (width.length > 0) {
                        styleOptions.strokeThickness = parseInt(width.html());
                    }
                }
                var iconStyle = styleDom.find('IconStyle');
                if (iconStyle.length > 0) {
                    var color = iconStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.color = color.html();
                    }
                    var icon = iconStyle.find('Icon');
                    if (icon.length > 0) {
                        styleOptions.icon = icon.find('href').html();
                    }
                }
                return styleOptions;
            };
            BingKmlParser.prototype.parsePushPinStyle = function (styleDom) {
                var styleOptions = {
                    icon: ICON_URL
                };
                var iconStyle = styleDom.find('IconStyle');
                if (iconStyle.length > 0) {
                    var color = iconStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.color = color.html();
                    }
                    var icon = iconStyle.find('Icon');
                    if (icon.length > 0) {
                        styleOptions.icon = icon.find('href').html();
                    }
                }
                return styleOptions;
            };
            BingKmlParser.prototype.parsePolygonStyle = function (styleDom) {
                var styleOptions = {
                    fillColor: null,
                    strokeColor: 'black',
                    strokeThickness: 1
                };
                var polyStyle = styleDom.find('PolyStyle');
                if (polyStyle.length > 0) {
                    var color = polyStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.fillColor = parseColor(color.html());
                    }
                }
                var lineStyle = styleDom.find('LineStyle');
                if (lineStyle.length > 0) {
                    var color = lineStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.strokeColor = parseColor(color.html());
                    }
                    var width = lineStyle.find('width');
                    if (width.length > 0) {
                        styleOptions.strokeThickness = parseInt(width.html());
                    }
                }
                return styleOptions;
            };
            BingKmlParser.prototype.parsePolylineStyle = function (styleDom) {
                var styleOptions = {
                    strokeColor: 'black', strokeThickness: 1
                };
                var lineStyle = styleDom.find('LineStyle');
                if (lineStyle.length > 0) {
                    var color = lineStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.strokeColor = parseColor(color.html());
                    }
                    var width = lineStyle.find('width');
                    if (width.length > 0) {
                        styleOptions.strokeThickness = parseInt(width.html());
                    }
                }
                return styleOptions;
            };
            /**
             * Create a map of style names to styles (PolygonOptions - http://msdn.microsoft.com/en-us/library/gg427596.aspx).
             * @param kmlXml
             * @private
             */
            BingKmlParser.prototype.parseStyles = function (kmlXml) {
                var kmlDom = $(kmlXml);
                kmlDom.find('Style').each(function (index, styleXml) {
                    var styleDom = $(styleXml);
                    var styleId = styleDom.attr('id');
                    styles[styleId] = parseStyle(styleDom);
                });
                //kmlDom.find('StyleMap').each(function (index, styleMapXml) {
                //    const styleMapDom = $(styleMapXml);
                //    var styleMapId = styleMapDom.attr('id');
                //    var mappedStyle = styleMapDom.find('styleUrl').contents()[0].data.substr(1);
                //
                //    styleMap[styleMapId] = styles[mappedStyle];
                //});
                console.log('Styles loaded');
            };
            /**
             * public functions that are available using this object.
             */
            BingKmlParser.prototype.parse = function (kmlXml) {
                var kmlContent = [];
                parseStyles(kmlXml);
                $(kmlXml).find('Placemark').each(function (index, placemarkXml) {
                    var placemarkGeometries = parsePlacemark(placemarkXml);
                    if (placemarkGeometries) {
                        $.each(placemarkGeometries, function (index, item) {
                            kmlContent.push(item);
                        });
                    }
                });
                console.log('Geometry loaded');
                return kmlContent;
            };
            BingKmlParser.ICON_URL = 'https://www.bingmapsportal.com/Content/images/poi_custom.png';
            return BingKmlParser;
        })();
        koldyr.BingKmlParser = BingKmlParser;
    })(koldyr = com.koldyr || (com.koldyr = {}));
})(com || (com = {}));
