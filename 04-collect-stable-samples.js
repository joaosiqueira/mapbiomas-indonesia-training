/**
 * 
 */
var assetIndonesia = 'projects/mapbiomas-indonesia/ANCILLARY_DATA/RASTER/kabupaten-1';

var assetRegions = 'projects/mapbiomas-indonesia/ANCILLARY_DATA/regions_col1_v3';

var outputFolder = 'projects/earthengine-legacy/assets/projects/mapbiomas-indonesia/COLLECTION2/SAMPLES/STABLE';

var version = {
    'stable_map': '1',
    'output_samples': '1'
};

var assetStable = 'projects/mapbiomas-indonesia/COLLECTION2/classification-stable/INDONESIA-STABLE-' + version.stable_map;

var assetGedi = 'users/potapovpeter/GEDI_V27/GEDI_SASIA_v27';

var regions = ee.FeatureCollection(assetRegions);

var nSamplesPerClass = [
    { 'class_id': 3, 'n_samples': 4000 },
    { 'class_id': 4, 'n_samples': 7000 },
    { 'class_id': 12, 'n_samples': 3000 },
    { 'class_id': 21, 'n_samples': 3000 },
    { 'class_id': 33, 'n_samples': 3000 },
];

var gediThreshPerClass = [
    { 'class_id': 3, 'min_value': 7, 'max_value': 100 },
    { 'class_id': 4, 'min_value': 3, 'max_value': 6 },
    { 'class_id': 12, 'min_value': 0, 'max_value': 2 },
    { 'class_id': 21, 'min_value': 0, 'max_value': 2 },
    { 'class_id': 33, 'min_value': 0, 'max_value': 2 },
];

var regionsObj = [
    ["Region_1", "8"],
    ["Region_2", "7"],
    ["Region_3", "5"],
    ["Region_4", "4"],
    ["Region_5", "4"],
    ["Region_6", "4"],
    ["Region_7", "4"],
    ["Region_8", "4"],
    ["Region_9", "4"],
    ["Region_10", "4"],
    ["Region_11", "4"],
    ["Region_12", "3"],
    ["Region_13", "5"],
    ["Region_14", "5"],
    ["Region_15", "4"],
    ["Region_16", "4"],
    ["Region_17", "4"],
    ["Region_18", "4"],
    ["Region_19", "4"],
    ["Region_20", "6"],
    ["Region_21", "6"],
    ["Region_22", "5"],
    ["Region_23", "6"],
    ["Region_24", "5"],
    ["Region_25", "5"],
    ["Region_26", "6"],
    ["Region_27", "4"],
    ["Region_28", "7"],
    ["Region_29", "2"],
    ["Region_30", "5"],
    ["Region_31", "5"],
    ["Region_32", "5"],
    ["Region_33", "7"],
    ["Region_34", "7"],
    ["Region_35", "7"],
];

var indonesia = ee.Image(assetIndonesia);

var classValues = nSamplesPerClass.map(
    function (item) {
        return item.class_id;
    }
);

var classPoints = nSamplesPerClass.map(
    function (item) {
        return item.n_samples;
    }
);

Map.addLayer(indonesia.randomVisualizer(), { format: 'png' }, 'indonesia');

var palettes = require('users/mapbiomas/modules:Palettes.js');

var vis = {
    'min': 0,
    'max': 62,
    'palette': palettes.get('classification7')
};

var stable = ee.Image(assetStable).rename('reference');

Map.addLayer(stable, vis, 'Stable', true);

var gedi = ee.Image(assetGedi);

var gediVis = {
    "min": 0,
    "max": 40,
    "palette": [
        "#86f1f3",
        "#ffbeee",
        "#daffe0",
        "#c0debf",
        "#08ff04",
        "#037e07",
        "#0b240a"
    ]
};

Map.addLayer(gedi, gediVis, 'GEDI', false);

var stableGedi = ee.List(gediThreshPerClass)
    .iterate(
        function (obj, stable) {
            obj = ee.Dictionary(obj);
            stable = ee.Image(stable);

            var classId = ee.Image(ee.Number(obj.get('class_id')));
            var minValue = ee.Image(ee.Number(obj.get('min_value')));
            var maxValue = ee.Image(ee.Number(obj.get('max_value')));

            stable = stable.where(stable.eq(classId).and((gedi.gte(minValue).and(gedi.lte(maxValue))).not()), 0);

            return stable;
        },
        stable
    );

stableGedi = ee.Image(stableGedi);

Map.addLayer(stableGedi, vis, 'Stable + GEDI', true);

regionsObj.forEach(
    function (obj) {

        var stableSamples = stableGedi.stratifiedSample({
            'numPoints': 0,
            'classBand': 'reference',
            'region': regions.filter(ee.Filter.eq('Region_ID', obj[0])).geometry(),
            'classValues': classValues,
            'classPoints': classPoints,
            'scale': 30,
            'seed': 1,
            'geometries': true
        });

        print(obj[0], stableSamples.aggregate_histogram('reference'));

        var outputName = 'samples_stable_' + obj[0].toLowerCase() + '_v' + version.output_samples;

        Export.table.toAsset(
            {
                'collection': stableSamples,
                'description': outputName,
                'assetId': outputFolder + '/' + outputName
            }
        );
    }
);