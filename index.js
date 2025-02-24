// I have compared the classifications with and without the fall images. 
// Potential confusions: Adding the second image with 22 bands gives a little more distinction between the landcover types, because there is less ambiguity 
// with the spectral signatures. However, I can see confusions when I change the eq to show the individual bands. I believe this is because the 
// spectral bands in these sentinenl images have a lot of ambiguity when displayed on the images, even after more than one date range is applied. 
// For example: There is confusion between cluster 2 (white), and 1 (orange) even with the fall images. It looks as if these are two different landcover types, 
// but both clusters display over bodies of water. This could indicate that these clusters are capturing differences in water reflectance, 
// which vary with depth. The depth affects how light penetrates and reflects back from the water. Additionally, other clusters showing 
// dense vegetation and urban areas with vegetation cover may contain some overlapping spectral signatures, especially during the growing season
// in spring. Also, even though each landcover type has a specific spectral signature, some of the bands' signatures get classed together,
// which I believe is because this is unsupervised classification. Also, since deciduous trees lose leaves and decrease in chlorophyll content in fall,
// this change can create different spectral signatures between vegetation types in summer and fall. Adding a fall image with a date range between
// mid-october and mid-november distinguishes vegetation types a little more.
// Moreover, after doing the final 22-band classification, there is still confusion still between the landcover types, 
// because they are still overlapping, (which I can also see inside the spectraplots).

// Also, this is very nuanced because some areas appear to have confusion. However, after I turned on the satelitte imagery and turned off 
// the fall and summer images, I can see that areas with slope and aspect displayed are accurately showing the classes, but when the slope and aspect
// are turned off, it looks as if there is confusion between agricultural land and high elevation forest land.

// Potential Solutions for confusions:
//  1. By adding a second, (separate) training dataset. Then after that, I could generate a second clusterer, 
// using the second combined summer and fall image with 22 bands. After that, we would apply that to the image and add it as a 
// layer to the map. Also, I would add separate colors for each band cluster, instead of using the random visualizer.
// Last, I would change the scale in the SpectraChart to 200. Theoretically, this could fix some of the spectral overlap... but it would
// not load onto my map properly.
//  2. By ncreasing the class numbers (maybe to 30) would also decrease the confusion in this classification, give more
// specificity, and ways to distinguish landcover types from each other.
//  3. By Adding NDVIs to the images to distinguish water bodies from Adding indices, like 
// the Normalized Difference Vegetation Index (NDVI) and the Normalized Difference Water Index (NDWI), and increasing their scales
// can help distinguish vegetation types and highlight water bodies across seasons.


var S2 = ee.ImageCollection("COPERNICUS/S2"),
    VP = {"opacity":1,"bands":["B12","B08A","B04"],"min":267.34000000000003,"max":4651.66,"gamma":1},
    NED = ee.Image("USGS/NED");

var BND = ee.Geometry.Polygon([[[-112.15470193582651, 41.993858258151505],[-112.15470193582651, 41.55963113814126],[-111.03958963113901, 41.55963113814126],[-111.03958963113901, 41.993858258151505]]], null, false)
//This geometry point refused to convert into an import

//***************** MASK CLOUDS **************************
function maskS2clouds(image) {
    var qa = image.select('QA60');

    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;

    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

    return image.updateMask(mask);
}
//*******************************************************
//****************** SET PARAMETERS *********************

//  Make a list of the bands to use in the classification
var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12']
// Have to rename the bands since some of the functions below alphabetize the bands and therefore are not
//    plotted in the proper order.
var bndnames = ['B02','B03','B04','B05','B06','B07','B08','B08A','B11','B12']
var bndnames2 = ['C02','C03','C04','C05','C06','C07','C08','C08A','C11','C12']  // GEE alphabetizes things.  This keeps the bands/time in order

var maxClusters = ee.Number(15)

//*******************************************************
//****************** INPUT DATA *************************

var input = S2.filterDate('2020-06-15','2020-07-31').filterBounds(BND).map(maskS2clouds) //This is the summer image
                    .select(bands).median().clip(BND).rename(bndnames);
var input2 = S2.filterDate('2020-10-01','2020-12-31').filterBounds(BND).map(maskS2clouds) //This is the fall image
                    .select(bands).median().clip(BND).rename(bndnames2);

// Display the Image
Map.centerObject(BND, 10);
Map.addLayer(input,VP,'Sentinel2 - Summer');
Map.addLayer(input2,{bands: ['C12','C08A','C04'],min:267, max:4651},'Sentinel2 - Fall');
print(input)

//  From the NED Elevation dataset, subset to same bnd, generate slope and aspect and stack DEM, slope, and aspect with imagery

var DEM = NED.clip(BND).rename('DEM');
var Terrain = ee.Terrain.products(DEM)
print(Terrain)

//  Add the terrain data to the input image, comment out .addBands
var combined = input //.addBands(Terrain,['DEM','slope']).addBands(input2)
print(combined)

//*************************************************************************
//********** IMAGE TRAINING,CLUSTER GENERATION, & CLASSIFICATION **********

// Develop the training dataset.
var training = combined.sample({
    region: BND,
    scale: 10,
    numPixels: 5000,
    tileScale: 8
});
print('Training Samples',training)

// Generate the clusters.
var clusterer = ee.Clusterer.wekaXMeans(5,maxClusters).train(training);
print('Clusters',clusterer)
    
// Apply the clusters to the image.
var result = combined.cluster(clusterer);

// Display the clusters with random colors.  Set the visibility to false so it can be queried, set eq value to number from 0-14 
//(I chose to display these clusters, but looked at others as well)
Map.addLayer(result.randomVisualizer(), {}, 'clusters', false);
Map.addLayer(result.updateMask(result.eq(2)), {palette: ['white'], opacity: 0.75}, 'white cluster');  // used to evaluate one (or two) clusters at a time.
print('Result',result)

Map.addLayer(result.randomVisualizer(), {}, 'clusters', false);
Map.addLayer(result.updateMask(result.eq(1)), {palette: ['orange'], opacity: 0.75}, 'orange cluster');  // used to evaluate one (or two) clusters at a time.
print('Result',result)

// New fall data range
var startDate = '2023-10-15';
var endDate = '2023-11-15';

// Filtering my new fall image
var myfallImage = S2.filterDate(startDate, endDate)
                    .filterBounds(BND)
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 1)) // Filter images with <10% cloud cover
                    .map(maskS2clouds)  // Apply the cloud mask
                    .select(bands)
                    .median()  // Compute the median of the collection
                    .clip(BND) // Clip to your region of interest
                    .rename(bndnames);

Map.centerObject(BND, 10);
Map.addLayer(myfallImage,VP,'myfallImage');
print(myfallImage)

//Add the terrain data to the input image, and adding the bands to my new fall image
var combined = input.addBands(Terrain,['DEM','slope']).addBands(myfallImage);
print(combined)
var DEM = NED.clip(BND).rename('DEM'); //This is already done above, but here it is again anyways.
var Terrain = ee.Terrain.products(DEM)
print(Terrain)

//*************************************************************************
//************** CODE BELOW THIS LINE GENERATES GRAPHS  *******************
//*****I'M SURE THERE'S A MORE STRAIGHTFORWARD WAY OF MAKING GRAPHS *******

// Generate a list of cluster numbers to iterate with in the function below
var Clusters = ee.List.sequence(0,maxClusters.subtract(1));
//  These are the bands to plot in the scatter plots
var bnds2plt = ['B04','B08'];  
//Extract the two bands from the image and add the classification as a third layer
var SubBnds2plt = combined.select(bnds2plt).addBands(result);  

//  Function to iterate across all clusters to mask pixels in the input file and generate cluster means
//  The output is sent to a list consisting of n lists.  n = number of clusters as defined by the variable 'Clusters'
var bndMeans = Clusters.map((C) => {
    var X = ee.Number(C);
    var msk = SubBnds2plt.updateMask(result.eq(X));  // Mask the image with a single cluster
    // Calculate the means of each pixel that corresponds with a particular cluster
    var Means = msk.reduceRegion({
    reducer: ee.Reducer.mean(),
    scale: 100,  //Pixel size is 10m, changing it to 100 resamples by a factor of 10, reducing Google resources need
    tileScale: 5,
    maxPixels: 1e10
    }).toArray().toList();  // The initial output is a dictionary.  I need a list so I have to convert to an array first.  I'm sure there's a better way
    return Means;
});

// The only way I know how to plot these values in a scatter plot is to convert the bndMeans lists into a
//  FeatureCollection.  This means I have to 'map' a function across each list and cast each as a Feature
//  to be included in the FeatureCollection.

var ClusterMeans = ee.FeatureCollection(bndMeans.map(function(el){
    el = ee.List(el) // cast every element of the list
    var geom = ee.Geometry.Point([ee.Number(0), ee.Number(0)])
    return ee.Feature(geom, {'Red':ee.Number(el.get(0)), 'NIR':ee.Number(el.get(1)), 'Cluster':ee.Number(el.get(2))})
}))

print('ClusterMeans',ClusterMeans);  // This is the conversion of the bndMeans list to a FeatureCollection

//***************************************************************
//******* GENERATE A FREQUENCY HISTOGRAM OF THE CLUSTERS ********

var Hist =
    ui.Chart.image.histogram({
    image: result,
    region: BND,
    scale: 100,
    maxBuckets: maxClusters,
    minBucketWidth: 1,
    maxPixels: 1e10,
    })
    .setChartType('ColumnChart')
    .setOptions({
        title: 'Cluster Frequency',
        legend: {position: 'none'},
        hAxis: {title: 'Cluster'},
        vAxis: {title: 'Frequency'}
    });
print('Cluster Frequency',Hist);


//*******************************************************
//******** SCATTER PLOT OF ALL TRAINING POINTS **********

//Define the chart
var scatterChart = ui.Chart.feature.groups({
    features: training.cluster(clusterer),  // Use the trainin data, but add the cluster number to it
    xProperty: 'B04',
    yProperty: 'B08',
    seriesProperty: 'cluster',
}).setChartType('ScatterChart');

scatterChart.setOptions({title: 'Scatter plot for each training point',
    hAxis: {title: 'Red (B04)'},
    vAxis: {title: 'NIR (B08)'},
    min: 0,
    max: maxClusters.subtract(1),
    //  Just random colors
    colors: ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#000000',
            '#990000','#009900','#000099','#999900','#990099','#009999','#999999','ff9900'],

    pointSize: 4
});
print('Scatter Plot',scatterChart)
//*******************************************************
//************ SCATTER PLOT of CLUSTER MEANS ************
//  This scatter plot will just lay out the cluster means.

//Define the chart
var scatterChart2 = ui.Chart.feature.groups({
    features: ClusterMeans,
    xProperty: 'Red',
    yProperty: 'NIR',
    seriesProperty: 'Cluster',
}).setChartType('ScatterChart');

scatterChart2.setOptions({title: 'Scatter plot of spectral cluster means',
    hAxis: {title: 'Red (B04)'},
    vAxis: {title: 'NIR (B08)'},
    min: 0,
    max: maxClusters.subtract(1),
    colors: ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#000000',
            '#990000','#009900','#000099','#999900','#990099','#009999','#999999','ff9900'],

    pointSize: 8
});
print('Scatter Plot',scatterChart2)


//*******************************************************
//******************* SIGNATURE PLOT **********************


var addClusters = combined.addBands(result);
// Create the chart and set options.
var spectraChart = ui.Chart.image.byClass({
    image: addClusters, 
    classBand: 'cluster', 
    region: BND, 
    reducer: ee.Reducer.mean(), 
    scale: 200,
    }).setChartType('ScatterChart');

spectraChart.setOptions({title: 'Signature plots for each spectral cluster',
    hAxis: {title: 'Spectral Band'},
    vAxis: {title: 'Scaled Reflectance (X0.0001)'},
    lineWidth: 1,
    pointSize: 4
});

print('Signature Plot',spectraChart);

