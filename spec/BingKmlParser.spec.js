describe("BingKmlParser suite", function() {

    let parser = new com.koldyr.BingKmlParser();

    let stylesKml = null;

    $.get({
        url: 'styles.kml',
        async: false,
    }).then((data) => {
        stylesKml = data;
    });

    it("initialization test", function() {
        expect(parser).toBeDefined();
    });

    it("load styles test", function() {
        parser.parse(stylesKml);

        expect(parser.styles['balloonStyle']).toBeDefined();
        expect(parser.styles['labelStyle']).toBeDefined();
        expect(parser.styles['lineStyle']).toBeDefined();
        expect(parser.styles['listStyle']).toBeDefined();
        expect(parser.styles['polyStyle']).toBeDefined();

        expect(parser.styles).toBeDefined();
    });
});


