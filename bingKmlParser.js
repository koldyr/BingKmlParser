var bingKmlParser = function () {

    var ICON_URL = 'https://www.bingmapsportal.com/Content/images/poi_custom.png';

    var styles = {};
    var styleMap = {};

    /**
     * @param placemarkXml
     * @returns {Array}
     */
    function parsePlacemark(placemarkXml) {
        const placemarkDom = $(placemarkXml);

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
    }

    function parsePushpin(placemarkDom, pointDom) {
        var point;

        try {
            if (pointDom) {
                point = pointDom
            } else {
                point = placemarkDom.find('Point');
                if (point.length === 0) {
                    return null;
                }
            }

            var coordinates = point.find('coordinates');
            var vertices = parseVertices(coordinates.html());

            var pushpinOptions = {icon: ICON_URL, anchor: new Microsoft.Maps.Point(12, 39)};

            if (placemarkDom) {
                const styleUrl = placemarkDom.find('styleUrl');
                if (styleUrl.length > 0) {
                    var colorName = styleUrl.html().substr(1);
                    pushpinOptions = styles[colorName];
                } else {
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
        } catch (e) {
            console.log(e);
        }
    }

    function parseLine(placemarkDom, lineDom) {
        try {
            var line;
            if (lineDom) {
                line = lineDom
            } else {
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
                const styleUrl = placemarkDom.find('styleUrl');
                if (styleUrl.length > 0) {
                    var colorName = styleUrl.html().substr(1);
                    lineOptions = styleMap[colorName];
                    if (!lineOptions) {
                        lineOptions = styles[colorName];
                    }
                } else {
                    var style = placemarkDom.find('Style');
                    lineOptions = parsePolylineStyle(style);
                }
            }

            return new Microsoft.Maps.Polyline(vertices, lineOptions);
        } catch (e) {
            console.log(e);
        }
    }

    function parsePolygon(placemarkDom, polygonDom) {
        try {
            var polygon;
            if (polygonDom) {
                polygon = polygonDom
            } else {
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
                const styleUrl = placemarkDom.find('styleUrl');
                if (styleUrl.length > 0) {
                    var colorName = styleUrl.html().substr(1);
                    polygonOptions = styleMap[colorName];
                    if (!polygonOptions) {
                        polygonOptions = styles[colorName];
                    }
                } else {
                    var style = placemarkDom.find('Style');
                    polygonOptions = parsePolygonStyle(style);
                }
            }

            return new Microsoft.Maps.Polygon(vertices, polygonOptions);
        } catch (e) {
            console.log(e);
        }
    }

    function parseMultiGeometry(placemarkDom) {
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
    }

    function parseVertices(coordinateString) {
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
    }

    /**
     * Parse a KML color string that comes as a abgr hex string.
     * @param kmlColorString An abgr hex string
     * @return {Microsoft.Maps.Color}
     * @private
     */
    function parseColor(kmlColorString) {
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

    function parseStyle(styleDom) {
        var styleOptions = {};

        const polyStyle = styleDom.find('PolyStyle');
        if (polyStyle.length > 0) {
            const color = polyStyle.find('color');
            if (color.length > 0) {
                styleOptions.fillColor = parseColor(color.html());
            }
        }

        const lineStyle = styleDom.find('LineStyle');
        if (lineStyle.length > 0) {
            const color = lineStyle.find('color');
            if (color.length > 0) {
                styleOptions.strokeColor = parseColor(color.html());
            }
            const width = lineStyle.find('width');
            if (width.length > 0) {
                styleOptions.strokeThickness = parseInt(width.html());
            }
        }

        const iconStyle = styleDom.find('IconStyle');
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
    }

    function parsePushPinStyle(styleDom) {
        var styleOptions = {
            icon: ICON_URL
        };

        const iconStyle = styleDom.find('IconStyle');
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
    }

    function parsePolygonStyle(styleDom) {
        var styleOptions = {
            fillColor: null,
            strokeColor: 'black',
            strokeThickness: 1
        };

        const polyStyle = styleDom.find('PolyStyle');
        if (polyStyle.length > 0) {
            const color = polyStyle.find('color');
            if (color.length > 0) {
                styleOptions.fillColor = parseColor(color.html());
            }
        }

        const lineStyle = styleDom.find('LineStyle');
        if (lineStyle.length > 0) {
            const color = lineStyle.find('color');
            if (color.length > 0) {
                styleOptions.strokeColor = parseColor(color.html());
            }
            const width = lineStyle.find('width');
            if (width.length > 0) {
                styleOptions.strokeThickness = parseInt(width.html());
            }
        }

        return styleOptions;
    }

    function parsePolylineStyle(styleDom) {
        var styleOptions = {
            strokeColor: 'black', strokeThickness: 1
        };

        const lineStyle = styleDom.find('LineStyle');
        if (lineStyle.length > 0) {
            const color = lineStyle.find('color');
            if (color.length > 0) {
                styleOptions.strokeColor = parseColor(color.html());
            }
            const width = lineStyle.find('width');
            if (width.length > 0) {
                styleOptions.strokeThickness = parseInt(width.html());
            }
        }

        return styleOptions;
    }

    /**
     * Create a map of style names to styles (PolygonOptions - http://msdn.microsoft.com/en-us/library/gg427596.aspx).
     * @param kmlXml
     * @private
     */
    function parseStyles(kmlXml) {
        const kmlDom = $(kmlXml);

        kmlDom.find('Style').each(function (index, styleXml) {
            const styleDom = $(styleXml);
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
    }

    /**
     * public functions that are available using this object.
     */
    var _public = {
        parse: function (kmlXml) {
            var kmlContent = [];

            parseStyles(kmlXml);

            $(kmlXml).find('Placemark').each(function (index, placemarkXml) {
                const placemarkGeometries = parsePlacemark(placemarkXml);
                if (placemarkGeometries) {
                    $.each(placemarkGeometries, function (index, item) {
                        kmlContent.push(item);
                    });
                }
            });

            console.log('Geometry loaded');

            return kmlContent;
        }
    };

    return _public;
}();



