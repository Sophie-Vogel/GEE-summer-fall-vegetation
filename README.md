## Google Earth Engine Fall vs Summer Vegetation
This project compares vegetation classifications with and without the addition of a fall satellite image. I explain where there may be confusions and how they can be corrected.

## Potential Confusions

Adding the second image with 22 bands gives a little more distinction between the landcover types because there is less ambiguity with the spectral signatures. However, I can see confusions when I change the equation to show the individual bands. I believe this is because the spectral bands in these Sentinel images have a lot of ambiguity when displayed on the images, even after more than one date range is applied.

For example: There is confusion between cluster 2 (white) and cluster 1 (orange) even with the fall images. It looks as if these are two different landcover types, but both clusters display over bodies of water. This could indicate that these clusters are capturing differences in water reflectance, which vary with depth. The depth affects how light penetrates and reflects back from the water. 

Additionally, other clusters showing dense vegetation and urban areas with vegetation cover may contain some overlapping spectral signatures, especially during the growing season in spring. Also, even though each landcover type has a specific spectral signature, some of the bands' signatures get classed together, which I believe is because this is unsupervised classification. 

Since deciduous trees lose leaves and decrease in chlorophyll content in fall, this change can create different spectral signatures between vegetation types in summer and fall. Adding a fall image with a date range between mid-October and mid-November distinguishes vegetation types a little more.

Moreover, after doing the final 22-band classification, there is still confusion between the landcover types because they are still overlapping (which I can also see inside the SpectraPlots).

This is very nuanced because some areas appear to have confusion. However, after I turned on the satellite imagery and turned off the fall and summer images, I can see that areas with slope and aspect displayed are accurately showing the classes. But when the slope and aspect are turned off, it looks as if there is confusion between agricultural land and high elevation forest land.

## Potential Solutions for Confusions

1. **Adding a second (separate) training dataset:**
   - Generate a second clusterer using the second combined summer and fall image with 22 bands.
   - Apply that to the image and add it as a layer to the map.
   - Assign separate colors for each band cluster instead of using the random visualizer.
   - Change the scale in the SpectraChart to 200.
   - Theoretically, this could fix some of the spectral overlap... but it would not load onto my map properly.

2. **Increasing the class numbers:**
   - Raising the class numbers (maybe to 30) would decrease confusion in this classification.
   - This would provide more specificity and better distinguish landcover types from each other.

3. **Adding NDVIs to the images:**
   - Distinguish water bodies by adding indices like the Normalized Difference Vegetation Index (NDVI) and the Normalized Difference Water Index (NDWI).
   - Increasing their scales can help distinguish vegetation types and highlight water bodies across seasons.

