//
// mapbiomas indonesia collection 1 asset name
var assetClass = 'projects/mapbiomas-indonesia/public/collection1/mapbiomas_indonesia_collection1_integration_v1';

// outuput asset collection
var assetStable = 'projects/mapbiomas-indonesia/COLLECTION2/classification-stable';

// output version
var version = '1';

//
var palettes = require('users/mapbiomas/modules:Palettes.js');

//
var mapbiomasPalette = palettes.get('classification7');

//
var visClass = {
    'min': 0,
    'max': 62,
    'palette': mapbiomasPalette,
    'format': 'png'
};

var region = ee.Geometry.Polygon(
    [
        [
            [94.34171916019955, 7.151756103893643],
            [94.34171916019955, -11.300535496066749],
            [142.72550822269955, -11.300535496066749],
            [142.72550822269955, 7.151756103893643]
        ]
    ], null, false
);
//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------
/**
 * 
 * @param {*} image 
 * @returns 
 */
var calculateNumberOfClasses = function (image) {

    var nClasses = image.reduce(ee.Reducer.countDistinctNonNull());

    return nClasses.rename('number_of_classes');
};

//
//
var classification = ee.Image(assetClass);

print('classification: ', classification)

// number of classes
var nClasses = calculateNumberOfClasses(classification);

// stable
var stable = classification
    .select(classification.bandNames().size().subtract(1))
    .multiply(nClasses.eq(1));

Map.addLayer(classification, {}, 'temporal series', false);
Map.addLayer(stable, visClass, 'stable', true);

stable = stable
    .rename('stable')
    .set('collection_id', 2.0)
    .set('version', version)
    .set('territory', 'INDONESIA');

Export.image.toAsset({
    "image": stable,
    "description": 'indonesia-stable-' + version,
    "assetId": assetStable + '/INDONESIA-STABLE-' + version,
    "scale": 30,
    "pyramidingPolicy": {
        '.default': 'mode'
    },
    "maxPixels": 1e13,
    "region": region
}); 