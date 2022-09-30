/* You may create layers to collect additional samples
  example:
  name: c03 - FeatureCollection with properties: 'reference' and value: '3'
  name: c21 - FeatureCollection with properties: 'reference' and value: '21'
*/
var version = {
    'stable_map': '1',
    'input_samples': '1',
    'output_samples': '1'
};

var assetMosaics = 'projects/mapbiomas-indonesia/MOSAICS/workspace-c1';

var assetRegions = 'projects/mapbiomas-indonesia/ANCILLARY_DATA/regions_col1_v3';

var assetClassC1 = 'projects/mapbiomas-indonesia/public/collection1/mapbiomas_indonesia_collection1_integration_v1';

// Classes that will be exported
var assetSamples = 'projects/mapbiomas-indonesia/COLLECTION2/SAMPLES/STABLE';
//
var assetClass = 'projects/mapbiomas-indonesia/COLLECTION2/classification-beta';

var assetStable = 'projects/mapbiomas-indonesia/COLLECTION2/classification-stable/INDONESIA-STABLE-' + version.stable_map;

// define the region name
var regionName = "Region_4";

var nTrainingPoints = 2000;   // Number of points to training
var nValidationPoints = 500;   // Number of points to validate

var nSamplesPerClass = [
    { 'class_id': 3, 'n_samples': 3000 },
    { 'class_id': 13, 'n_samples': 2000 },
    { 'class_id': 21, 'n_samples': 3000 },
    { 'class_id': 25, 'n_samples': 1000 },
    { 'class_id': 33, 'n_samples': 1000 },
];
// number of complementary points
var complementary = [
    { 'class_id': 3, 'n_samples': 500 },
    { 'class_id': 13, 'n_samples': 100 },
    { 'class_id': 21, 'n_samples': 0 },
    { 'class_id': 25, 'n_samples': 0 },
    { 'class_id': 33, 'n_samples': 0 },
];

// Landsat images that will be added to Layers
var years = [
    2000,
    2001, 2002, 2003, 2004, 2005,
    2006, 2007, 2008, 2009, 2010,
    2011, 2012, 2013, 2014, 2015,
    2016, 2017, 2018, 2019
];

// random forest parameters
var rfParams = {
    'numberOfTrees': 40, //100
    'variablesPerSplit': 4,
    'minLeafPopulation': 25,
    'seed': 1
};

//
var featureSpace = [
    'slope',
    'textg',
    "median_blue",
    "median_evi2",
    "median_green",
    "median_red",
    "median_nir",
    "median_swir1",
    "median_swir2",
    "median_gv",
    "median_gvs",
    "median_npv",
    "median_soil",
    "median_shade",
    "median_ndfi",
    "median_ndfi_wet",
    "median_ndvi",
    "median_ndvi_dry",
    "median_ndvi_wet",
    "median_ndwi",
    "median_ndwi_wet",
    "median_savi",
    "median_sefi",
    "stddev_ndfi",
    "stddev_sefi",
    "stddev_soil",
    "stddev_npv",
    "longitude",
    "latitude",
];

//
var palettes = require('users/mapbiomas/modules:Palettes.js');

var mosaics = ee.ImageCollection(assetMosaics)
    .map(
        function (image) {
            return image.rename(
                image.bandNames().map(
                    function (bandName) {
                        return ee.String(bandName).toLowerCase();
                    }
                )
            );
        }
    );

var regions = ee.FeatureCollection(assetRegions);

var classificationC1 = ee.Image(assetClassC1);

var selectedRegion = regions.filter(ee.Filter.eq('Region_ID', regionName));

var region = typeof (userRegion) !== 'undefined' ? userRegion : selectedRegion;

var mapbiomasPalette = palettes.get('classification7');

//
var visClass = {
    'min': 0,
    'max': 62,
    'palette': mapbiomasPalette,
    'format': 'png'
};

var visMos = {
    'bands': [
        'median_swir1',
        'median_nir',
        'median_red'
    ],
    'gain': [0.08, 0.06, 0.2],
    'gamma': 0.85
};

//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------
/**
 * Create a function to collect random point inside the polygons
 * @param {*} polygons 
 * @param {*} nPoints 
 * @returns 
 */
var generateAditionalPoints = function (polygons, classValues, classPoints) {

    // convert polygons to raster
    var polygonsRaster = ee.Image().paint({
        featureCollection: polygons,
        color: 'reference'
    }).rename('reference');

    // Generate N random points inside the polygons
    var points = polygonsRaster.stratifiedSample({
        'numPoints': 1,
        'classBand': 'reference',
        'classValues': classValues,
        'classPoints': classPoints,
        'region': polygons,
        'scale': 30,
        'seed': 1,
        'dropNulls': true,
        'geometries': true,
    });

    return points;
};

/**
 * 
 * @param {*} collection 
 * @param {*} seed 
 */
var shuffle = function (collection, seed) {

    // Adds a column of deterministic pseudorandom numbers to a collection.
    // The range 0 (inclusive) to 1000000000 (exclusive).
    collection = collection.randomColumn('random', seed || 1)
        .sort('random', true)
        .map(
            function (feature) {
                var rescaled = ee.Number(feature.get('random'))
                    .multiply(1000000000)
                    .round();
                return feature.set('new_id', rescaled);
            }
        );

    // list of random ids
    var randomIdList = ee.List(
        collection.reduceColumns(ee.Reducer.toList(), ['new_id'])
            .get('list'));

    // list of sequential ids
    var sequentialIdList = ee.List.sequence(1, collection.size());

    // set new ids
    var shuffled = collection.remap(randomIdList, sequentialIdList, 'new_id');

    return shuffled;
};

// stable
var stable = ee.Image(assetStable);

// Add mosaic for each year
years.forEach(
    function (year) {
        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic();

        var classificationYear = classificationC1.select('classification_' + year.toString());

        Map.addLayer(mosaicYear, visMos, year + ' ' + regionName + ' [mosaic]', false);
        Map.addLayer(classificationYear, visClass, year + ' ' + regionName + ' [classifcation c1]', false);
    }
);

var classValues = complementary.map(
    function (array) {
        return array.class_id;
    }
);

var classPoints = complementary.map(
    function (array) {
        return array.n_samples;
    }
);

// var stableSamplesPoints = stratifiedPoints(stable, nTrainingPoints, region);
var samplesRegionNames = assetSamples + '/samples_stable_' + regionName.toLowerCase() + '_v' + version.input_samples;
var stableSamplesPoints = ee.FeatureCollection(samplesRegionNames);

var shuffledSamples = shuffle(stableSamplesPoints, 2);

var selectedSamples = nSamplesPerClass.map(
    function (obj) {
        return shuffledSamples.filter(ee.Filter.eq('reference', obj.class_id)).limit(obj.n_samples);
    }
);

selectedSamples = ee.FeatureCollection(selectedSamples).flatten();

// print('stablePoints', selectedSamples.aggregate_histogram('reference'));

// visualize points using mapbiomas color palette
var stableSamplesPointsVis = selectedSamples.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(mapbiomasPalette).get(feature.get('reference')),
            'width': 1,
        });
    }
);

var samplesList = [
    typeof (c03) !== 'undefined' ? c03 : ee.FeatureCollection([]), // forest formation
    typeof (c12) !== 'undefined' ? c12 : ee.FeatureCollection([]), // grassland
    typeof (c13) !== 'undefined' ? c13 : ee.FeatureCollection([]), // other natural non forest formation
    typeof (c21) !== 'undefined' ? c21 : ee.FeatureCollection([]), // mosaic of use
    typeof (c25) !== 'undefined' ? c25 : ee.FeatureCollection([]), // non vegetated area
    typeof (c33) !== 'undefined' ? c33 : ee.FeatureCollection([]), // water
];

print(samplesList);

//------------------------------------------------------------------
// User defined functions
//------------------------------------------------------------------
// merges all polygons
var samplesPolygons = ee.List(samplesList).iterate(
    function (sample, samplesPolygon) {
        return ee.FeatureCollection(samplesPolygon).merge(sample);
    },
    ee.FeatureCollection([])
);

// filter by user defined region "userRegion" if exists
samplesPolygons = ee.FeatureCollection(samplesPolygons)
    .filter(ee.Filter.bounds(region));

// avoid geodesic operation error
samplesPolygons = samplesPolygons.map(
    function (polygon) {
        return polygon.buffer(1, 10);
    }
);

// generate training points
var aditionalTrainingPoints = generateAditionalPoints(samplesPolygons, classValues, classPoints);

// generate validation points
var aditionalValidationPoints = generateAditionalPoints(samplesPolygons, classValues, classPoints);

// print('trainingPoints', aditionalTrainingPoints.aggregate_histogram('reference'));
// print('validationPoints', aditionalValidationPoints.aggregate_histogram('reference'));

// set sample type
aditionalTrainingPoints = aditionalTrainingPoints.map(
    function (sample) {
        return sample.set('sample_type', 'training');
    }
);

aditionalValidationPoints = aditionalValidationPoints.map(
    function (sample) {
        return sample.set('sample_type', 'validation');
    }
);

// merge training and validation points
var aditionalSamplesPoints = aditionalTrainingPoints.merge(aditionalValidationPoints);

// visualize points using mapbiomas color palette
var samplesPointsVis = aditionalSamplesPoints.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(mapbiomasPalette).get(feature.get('reference')),
            'width': 1,
        });
    }
);

var samplesFinal = selectedSamples.merge(aditionalTrainingPoints);

var terrain = ee.Image("JAXA/ALOS/AW3D30_V1_1").select("AVE");
var slope = ee.Terrain.slope(terrain);

var classifiedList = [];

years.forEach(
    function (year) {

        var mosaicYear = mosaics
            .filter(ee.Filter.eq('year', year))
            .filter(ee.Filter.bounds(region))
            .mosaic()
            .addBands(slope);

        var entropyG = mosaicYear.select('median_green')
            .entropy(ee.Kernel.square({ radius: 5 }))
            .rename('textG');

        mosaicYear = mosaicYear.addBands(entropyG).multiply(100).int16();
        mosaicYear = mosaicYear.addBands(ee.Image.pixelLonLat());

        mosaicYear = mosaicYear.select(featureSpace);

        // Collect the spectral information to get the trained samples
        var trainedSamples = mosaicYear.reduceRegions({
            'collection': samplesFinal,
            'reducer': ee.Reducer.first(),
            'scale': 30,
        });

        trainedSamples = trainedSamples.filter(ee.Filter.notNull(['median_ndfi_wet']));

        var classifier = ee.Classifier.smileRandomForest(rfParams)
            .train(trainedSamples, 'reference', featureSpace);

        var classified = ee.Algorithms.If(
            trainedSamples.size().gt(0),
            mosaicYear.classify(classifier),
            ee.Image(0)
        );

        classified = ee.Image(classified).rename('classification_' + year.toString())
            .clip(region);

        classifiedList.push(classified);

        Map.addLayer(classified, visClass, year + ' ' + regionName + ' ' + 'class', false);
    }
);

//
Map.addLayer(stable, visClass, 'stable', true);
Map.addLayer(regions, {}, 'regions', false);
Map.addLayer(selectedRegion, {}, regionName, true);

Map.addLayer(stableSamplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'stable samples - points');
Map.addLayer(samplesPointsVis.style({ 'styleProperty': 'style' }), {}, 'aditional samples - points');

//
var countPixels = function (image, geometry, scale) {

    var reducer = ee.Reducer.count().group(1, 'class');

    var territotiesData = image.addBands(image)
        .reduceRegion({
            reducer: reducer,
            geometry: geometry,
            scale: scale,
            maxPixels: 1e12
        });

    territotiesData = ee.List(territotiesData.get('groups'));

    return territotiesData;
};

var nPixelsPerClass = countPixels(stable, region.geometry(), 300);
var nPixelsTotal = countPixels(stable.gte(0), region.geometry(), 300);

nPixelsTotal = ee.Dictionary(nPixelsTotal.get(0));

print(nPixelsPerClass.map(
    function (obj) {

        obj = ee.Dictionary(obj);

        obj = obj.set('percent', ee.Number(obj.get('count')).divide(nPixelsTotal.get('count')).multiply(100));

        return obj;

    }
));