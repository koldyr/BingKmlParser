var com;
(function (com) {
    var koldyr;
    (function (koldyr) {
        var BingKmlParser = (function () {
            function BingKmlParser() {
                this.styles = {};
                this.styleMap = {};
            }
            BingKmlParser.prototype.parsePlacemark = function (placemarkXml) {
                var placemarkDom = $(placemarkXml);
                var geometries = [];
                var pushpins = this.parsePushpin(placemarkDom);
                if (pushpins) {
                    geometries.push(pushpins);
                }
                var lines = this.parseLine(placemarkDom);
                if (lines) {
                    geometries.push(lines);
                }
                var polygons = this.parsePolygon(placemarkDom);
                if (polygons) {
                    geometries.push(polygons);
                }
                var multiGeometries = this.parseMultiGeometry(placemarkDom);
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
                    var vertices = this.parseVertices(coordinates.text());
                    var styleDTO = {
                        options: { icon: BingKmlParser.ICON_URL, anchor: new Microsoft.Maps.Point(12, 39) }
                    };
                    if (placemarkDom) {
                        styleDTO = this.getOptions(placemarkDom, styleDTO.options);
                    }
                    var pushpin = void 0;
                    if (styleDTO.styleMap) {
                        pushpin = new Microsoft.Maps.Pushpin(vertices[0], styleDTO.styleMap.normal);
                        this.addMappedStyle(pushpin, styleDTO.styleMap);
                    }
                    else {
                        pushpin = new Microsoft.Maps.Pushpin(vertices[0], styleDTO.options);
                    }
                    return pushpin;
                }
                catch (e) {
                    console.log(e);
                }
            };
            BingKmlParser.prototype.parseLine = function (placemarkDom, lineDom) {
                try {
                    var line = void 0;
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
                    var vertices = this.parseVertices(coordinates.html());
                    var styleDTO = {
                        options: {
                            strokeColor: 'black', strokeThickness: 1
                        }
                    };
                    if (placemarkDom) {
                        styleDTO = this.getOptions(placemarkDom, styleDTO.options);
                    }
                    var polyline = void 0;
                    if (styleDTO.styleMap) {
                        polyline = new Microsoft.Maps.Polyline(vertices, styleDTO.styleMap.normal);
                        this.addMappedStyle(polyline, styleDTO.styleMap);
                    }
                    else {
                        polyline = new Microsoft.Maps.Polyline(vertices, styleDTO.options);
                    }
                    return polyline;
                }
                catch (e) {
                    console.log(e);
                }
            };
            BingKmlParser.prototype.parsePolygon = function (placemarkDom, polygonDom) {
                try {
                    var polygon = void 0;
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
                    var vertices = this.parseVertices(coordinates.html());
                    var styleDTO = {
                        options: {
                            strokeColor: 'black',
                            strokeThickness: 1
                        }
                    };
                    if (placemarkDom) {
                        styleDTO = this.getOptions(placemarkDom, styleDTO.options);
                    }
                    var msPolygon = void 0;
                    if (styleDTO.styleMap) {
                        msPolygon = new Microsoft.Maps.Polygon(vertices, styleDTO.styleMap.normal);
                        this.addMappedStyle(msPolygon, styleDTO.styleMap);
                    }
                    else {
                        msPolygon = new Microsoft.Maps.Polygon(vertices, styleDTO.options);
                    }
                    return msPolygon;
                }
                catch (e) {
                    console.log(e);
                }
            };
            BingKmlParser.prototype.parseMultiGeometry = function (placemarkDom) {
                var _this = this;
                var multiGeometryDom = placemarkDom.find('MultiGeometry');
                if (multiGeometryDom.length === 0) {
                    return null;
                }
                var geometries = [];
                multiGeometryDom.find('Point').each(function (index, item) {
                    geometries.push(_this.parsePushpin(null, $(item)));
                });
                multiGeometryDom.find('LineString').each(function (index, item) {
                    geometries.push(_this.parseLine(null, $(item)));
                });
                multiGeometryDom.find('Polygon').each(function (index, item) {
                    geometries.push(_this.parsePolygon(null, $(item)));
                });
                return geometries;
            };
            BingKmlParser.prototype.parseVertices = function (coordinateString) {
                var coordinates = $.trim(coordinateString).split(' ');
                var msLocations = [];
                for (var i = 0; i < coordinates.length; i++) {
                    var coordinate = $.trim(coordinates[i]);
                    if (coordinate.length === 0) {
                        continue;
                    }
                    var xyz = coordinate.split(',');
                    var location_1 = new Microsoft.Maps.Location(xyz[1], xyz[0]);
                    msLocations.push(location_1);
                }
                return msLocations;
            };
            BingKmlParser.prototype.parseColor = function (kmlColorString) {
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
                    var color = polyStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.fillColor = this.parseColor(color.html());
                    }
                }
                var lineStyle = styleDom.find('LineStyle');
                if (lineStyle.length > 0) {
                    var color = lineStyle.find('color');
                    if (color.length > 0) {
                        styleOptions.strokeColor = this.parseColor(color.html());
                    }
                    var width = lineStyle.find('width');
                    if (width.length > 0) {
                        styleOptions.strokeThickness = parseInt(width.html(), 10);
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
            BingKmlParser.prototype.parseStyles = function (kmlDom) {
                var _this = this;
                kmlDom.find('Style').each(function (index, styleXml) {
                    var styleDom = $(styleXml);
                    var styleId = styleDom.attr('id');
                    _this.styles[styleId] = _this.parseStyle(styleDom);
                });
                kmlDom.find('StyleMap').each(function (index, styleMapXml) {
                    var styleMapDom = $(styleMapXml);
                    var styleMapId = styleMapDom.attr('id');
                    var mappedStyle = _this.parseStyleMap(styleMapDom);
                    _this.styleMap[styleMapId] = mappedStyle;
                });
                console.log('Styles loaded');
            };
            BingKmlParser.prototype.parseStyleMap = function (styleMapDom) {
                var styles = {};
                var self = this;
                styleMapDom.find('Pair').each(function (index, pair) {
                    var pairDom = $(pair);
                    var key = pairDom.find('key').html();
                    var style = pairDom.find('styleUrl').html().substr(1);
                    styles[key] = self.styles[style];
                });
                return styles;
            };
            BingKmlParser.prototype.addMappedStyle = function (geometry, mapped) {
                if (!geometry.metadata) {
                    geometry.metadata = {};
                }
                geometry.metadata.styles = mapped;
                Microsoft.Maps.Events.addHandler(geometry, 'mouseover', function (event) {
                    var target = event.target;
                    target.setOptions(target.metadata.styles.highlight);
                });
                Microsoft.Maps.Events.addHandler(geometry, 'mouseout', function (event) {
                    var target = event.target;
                    target.setOptions(target.metadata.styles.normal);
                });
            };
            BingKmlParser.prototype.getOptions = function (placemarkDom, defaultOptions) {
                var styleMap;
                var styleUrlDom = placemarkDom.find('styleUrl');
                if (styleUrlDom.length > 0) {
                    var styleUrl = styleUrlDom.html();
                    var styleName = this.getStyleName(styleUrl);
                    if (this.isExternalStyle(styleUrl)) {
                        this.loadExternalStyle(styleUrl);
                    }
                    defaultOptions = this.styleMap[styleName];
                    if (defaultOptions) {
                        styleMap = defaultOptions;
                    }
                    else {
                        defaultOptions = this.styles[styleName];
                    }
                }
                else {
                    var style = placemarkDom.find('Style');
                    if (style.length > 0) {
                        defaultOptions = this.parseStyle(style);
                    }
                }
                var name = placemarkDom.find('name');
                if (name.length > 0) {
                    console.log(name.html());
                    defaultOptions.title = name.html();
                }
                return { options: defaultOptions, styleMap: styleMap };
            };
            BingKmlParser.prototype.getStyleName = function (styleUrl) {
                var index = styleUrl.lastIndexOf('#');
                return styleUrl.substr(index + 1);
            };
            BingKmlParser.prototype.isExternalStyle = function (styleUrl) {
                var index = styleUrl.lastIndexOf('#');
                return index > 0;
            };
            BingKmlParser.prototype.loadExternalStyle = function (styleUrl) {
                var _this = this;
                var styleName = this.getStyleName(styleUrl);
                var style = this.styles[styleName];
                if (style) {
                    return;
                }
                var index = styleUrl.lastIndexOf('#');
                var externalKmlUrl = styleUrl.substring(0, index);
                $.ajax({
                    url: externalKmlUrl,
                    async: false
                }).then(function (data) {
                    var kmlContent = $(data);
                    var externalStyles = kmlContent.find('Style');
                    for (var i = 0; i < externalStyles.length; i++) {
                        var styleDom = $(externalStyles[i]);
                        if (styleDom.attr('id') === styleName) {
                            _this.styles[styleName] = _this.parseStyle(styleDom);
                        }
                    }
                });
            };
            BingKmlParser.prototype.parse = function (kmlXml) {
                var _this = this;
                var kmlContent = [];
                var kmlDom = $(kmlXml);
                this.parseStyles(kmlDom);
                kmlDom.find('Placemark').each(function (index, placemarkXml) {
                    var placemarkGeometries = _this.parsePlacemark(placemarkXml);
                    if (placemarkGeometries) {
                        $.each(placemarkGeometries, function (j, item) {
                            kmlContent.push(item);
                        });
                    }
                });
                console.log('Geometry loaded');
                return kmlContent;
            };
            BingKmlParser.ICON_URL = 'https://www.bingmapsportal.com/Content/images/poi_custom.png';
            return BingKmlParser;
        }());
        koldyr.BingKmlParser = BingKmlParser;
    })(koldyr = com.koldyr || (com.koldyr = {}));
})(com || (com = {}));

//# sourceMappingURL=BingKmlParser.js.map
