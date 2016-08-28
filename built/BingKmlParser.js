var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var com;
(function (com) {
    var koldyr;
    (function (koldyr) {
        var GroundOverlay = (function (_super) {
            __extends(GroundOverlay, _super);
            function GroundOverlay(options) {
                _super.call(this, options);
                this.options = options;
            }
            GroundOverlay.prototype.onAdd = function () {
                this.img = document.createElement('img');
                this.img.src = this.options.image;
                this.img.style.width = '100%';
                this.img.style.height = '100%';
                this.img.style.position = 'absolute';
                if (this.options.rotate) {
                    var transform = "rotate(" + this.options.rotate + "deg)";
                    var style = this.img.style;
                    style['-webkit-transform'] = transform;
                    style['-moz-transform'] = transform;
                    style['-ms-transform'] = transform;
                    style['-o-transform'] = transform;
                    style['transform'] = transform;
                }
                this.setHtmlElement(this.img);
            };
            GroundOverlay.prototype.onRemove = function () {
                this.setHtmlElement(null);
            };
            GroundOverlay.prototype.onLoad = function () {
                var _this = this;
                this.repositionOverlay();
                Microsoft.Maps.Events.addHandler(this._map, 'viewchange', function () { return _this.repositionOverlay(); });
            };
            GroundOverlay.prototype.repositionOverlay = function () {
                var topLeft = this._map.tryLocationToPixel(this.options.bounds.getNorthwest(), Microsoft.Maps.PixelReference.control);
                var bottomRight = this._map.tryLocationToPixel(this.options.bounds.getSoutheast(), Microsoft.Maps.PixelReference.control);
                this.img.style.left = topLeft.x + 'px';
                this.img.style.top = topLeft.y + 'px';
                this.img.style.width = (bottomRight.x - topLeft.x) + 'px';
                this.img.style.height = (bottomRight.y - topLeft.y) + 'px';
            };
            return GroundOverlay;
        }(Microsoft.Maps.CustomOverlay));
        koldyr.GroundOverlay = GroundOverlay;
    })(koldyr = com.koldyr || (com.koldyr = {}));
})(com || (com = {}));
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
                    var vertices = [];
                    var outerCoordinates = polygon.find('outerBoundaryIs coordinates');
                    var outerVertices = this.parseVertices(outerCoordinates.html());
                    var innerCoordinates = polygon.find('innerBoundaryIs coordinates');
                    if (innerCoordinates.length > 0) {
                        var innerVertices = this.parseVertices(innerCoordinates.html());
                        vertices.push(outerVertices);
                        vertices.push(innerVertices);
                    }
                    else {
                        vertices = outerVertices;
                    }
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
            BingKmlParser.prototype.parseGroundOverlay = function (groundOverlayXml) {
                var groundOverlayDom = $(groundOverlayXml);
                var name = groundOverlayDom.find('name').text();
                var iconUrl = groundOverlayDom.find('Icon href').text();
                var latLonBox = groundOverlayDom.find('LatLonBox');
                var north = latLonBox.find('north').text();
                var south = latLonBox.find('south').text();
                var east = latLonBox.find('east').text();
                var west = latLonBox.find('west').text();
                var rotationElem = latLonBox.find('rotation');
                var rotation;
                if (rotationElem.length > 0) {
                    rotation = rotationElem.text();
                }
                var bounds = Microsoft.Maps.LocationRect.fromEdges(parseFloat(north), parseFloat(west), parseFloat(south), parseFloat(east));
                return new koldyr.GroundOverlay({
                    name: name,
                    image: iconUrl,
                    bounds: bounds,
                    rotate: rotation,
                    beneathLabels: true
                });
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
                    _this.styleMap[styleMapId] = _this.parseStyleMap(styleMapDom);
                });
                console.log('Styles loaded');
            };
            BingKmlParser.prototype.parseStyleMap = function (styleMapDom) {
                var styleMap = {};
                var self = this;
                styleMapDom.find('Pair').each(function (index, pair) {
                    var pairDom = $(pair);
                    var key = pairDom.find('key').html();
                    var style = pairDom.find('styleUrl').html().substr(1);
                    styleMap[key] = self.styles[style];
                });
                return styleMap;
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
                            break;
                        }
                    }
                });
            };
            BingKmlParser.prototype.parse = function (kmlXml) {
                var _this = this;
                var kmlDom = $(kmlXml);
                this.parseStyles(kmlDom);
                var kmlContent = [];
                kmlDom.find('Placemark').each(function (index, placemarkXml) {
                    var placemarkGeometries = _this.parsePlacemark(placemarkXml);
                    if (placemarkGeometries) {
                        $.each(placemarkGeometries, function (j, item) {
                            kmlContent.push(item);
                        });
                    }
                });
                console.log('Geometry loaded');
                var kmlOverlays = [];
                kmlDom.find('GroundOverlay').each(function (index, groundOverlayXml) {
                    var overlay = _this.parseGroundOverlay(groundOverlayXml);
                    if (overlay) {
                        kmlOverlays.push(overlay);
                    }
                });
                console.log('Overlays loaded');
                return {
                    geometries: kmlContent,
                    overlays: kmlOverlays
                };
            };
            BingKmlParser.ICON_URL = 'https://www.bingmapsportal.com/Content/images/poi_custom.png';
            return BingKmlParser;
        }());
        koldyr.BingKmlParser = BingKmlParser;
        Microsoft.Maps.moduleLoaded('BingKmlParser');
    })(koldyr = com.koldyr || (com.koldyr = {}));
})(com || (com = {}));

//# sourceMappingURL=BingKmlParser.js.map
